import { createOpenAI } from "@ai-sdk/openai";
import { generateText, stepCountIs, ToolLoopAgent } from "ai";
import { env } from "../config/env.js";
import { createAiSqlTool, DATABASE_SCHEMA_FOR_AI, resolveAiSqlConfirmation } from "../services/aiSqlTool.js";
import { HttpError } from "../utils/httpError.js";
import { query } from "../db/pool.js";
import { readAuthUser } from "../middleware/auth.js";
import * as chatSessionRepository from "../repositories/chatSessionRepository.js";

const MAX_CONTEXT_MESSAGES = 20;

const BASE_SYSTEM_PROMPT = `
你是“复旦百事通”，一个面向校园信息查询与管理的中文助手。

你可以直接回答一般问题；当用户需要精确的课程、地点、活动、人员、报名、选课、管理数据，或者明确要求新增、修改、删除数据时，你可以调用 runSql 工具查询或写入 PostgreSQL 数据库。

数据库结构：
${DATABASE_SCHEMA_FOR_AI}

SQL 工具使用规则：
1. 只有需要数据库事实或用户明确要求写表时才调用 runSql。
2. 查询优先使用 SELECT，并尽量显式选择需要的字段，不要 SELECT *。
3. 写表只在用户明确表达新增、修改、删除意图时使用 INSERT/UPDATE/DELETE；不要因为普通咨询而写表。
4. 普通用户只能查询，不能写表。如果工具返回 denied，直接向用户说明权限不足。
5. 管理员写表需要用户确认。需要确认时，不要先输出 Markdown 表格、字段/值清单、确认 ID、或“请回复确认”。你必须直接调用 runSql 生成一条具体 INSERT/UPDATE/DELETE SQL，由前端确认卡展示 SQL 和按钮。
6. 如果用户消息说明“后端已执行该 SQL”并提供执行结果，表示确认接口已经完成写入；你不能再为同一个 confirmationId 调用 runSql，只需要解释该执行结果。
7. 如果原计划还有后续写库步骤，你必须立即调用 runSql 生成下一条具体 INSERT/UPDATE/DELETE SQL 的待确认操作；不要用 Markdown 表格、字段/值清单、确认 ID、或“请回复确认”来让用户文字确认。
8. 如果用户拒绝，不能再调用写操作，只说明已取消。
9. 不要生成 DDL、事务控制、多语句或危险操作。
10. 对查询结果进行解释和总结，不要把工具返回 JSON 原样丢给用户。
11. 普通查询回答可以使用 Markdown 表格；但任何待管理员确认的写库步骤都禁止使用 Markdown 表格，只能通过 runSql 待确认卡展示具体 SQL。
12. 如果数据库结果为空，直接说明没有查到，并给出可能的下一步筛选建议。

隐私与数据安全规则：
13. 严格区分“人员公开信息”和“用户私密信息”：People、Student、Teacher 是校园人员名录与人员身份信息，属于公开信息；SysUser、QueryRecord 以及 password_hash、username、verification_status、created_at、查询记录等账号与使用数据属于私密信息。
14. People.phone、People.email 是非公开联系方式，不属于公开人员信息；除回答当前登录用户本人信息外，不能查询或展示其他人的手机号、邮箱。
15. 回答课程授课、开课院系、院系成员、活动负责人等公开校园业务问题时，可以查询并展示 People、Student、Teacher、Department、Course、Teaching、Event 等表中与问题直接相关的公开人员信息，例如姓名、性别、学号/工号、年级、专业、职称、所属院系等。
16. 禁止向普通用户透露其他人的 SysUser 账号信息、认证状态、密码哈希、查询记录等私密用户数据；除管理员明确提出管理需求外，不要查询或展示这些字段。
17. Enrollment.grade 是学生成绩，只能向当前绑定学生本人或管理员在明确管理场景下展示；普通公开查询只能提供去个性化统计汇总。
18. 如果用户询问其他人的账号、密码、认证状态、查询记录、联系方式或成绩等私密信息，直接回复"抱歉，我无法查询其他用户的私密信息。"
`.trim();

function buildUserContextString(userContext) {
  if (!userContext) {
    return "\n\n当前用户：未登录访客。你只能回答公开的校园信息，不能查询或修改数据库。\n";
  }

  let context = "\n\n## 当前登录用户信息\n\n";
  context += `- 系统用户ID：${userContext.userId}\n`;
  context += `- 用户名：${userContext.username}\n`;
  context += `- 用户角色：${userContext.roleType}（`;
  context += userContext.roleType === "admin" ? "管理员，拥有查询和写表权限" : "普通用户，仅拥有查询权限";
  context += `）\n`;
  context += `- 认证状态：${userContext.verificationStatus}\n`;

  if (userContext.depId) {
    context += `- 所属院系ID：${userContext.depId}`;
    if (userContext.userDepName) {
      context += `（${userContext.userDepName}）`;
    }
    context += `\n`;
  }

  if (userContext.peopleId) {
    context += `\n### 绑定的人员信息\n`;
    context += `- 人员ID：${userContext.peopleId}\n`;
    context += `- 姓名：${userContext.name}\n`;
    context += `- 性别：${userContext.gender}\n`;
    if (userContext.phone) {
      context += `- 电话：${userContext.phone}\n`;
    }
    if (userContext.email) {
      context += `- 邮箱：${userContext.email}\n`;
    }

    if (userContext.studentNo) {
      context += `- 身份：学生\n`;
      context += `- 学号：${userContext.studentNo}\n`;
      context += `- 年级：${userContext.grade}\n`;
      context += `- 专业：${userContext.major}\n`;
      if (userContext.studentDepName) {
        context += `- 所属院系：${userContext.studentDepName}\n`;
      }
    } else if (userContext.staffNo) {
      context += `- 身份：教师\n`;
      context += `- 工号：${userContext.staffNo}\n`;
      context += `- 职称：${userContext.title}\n`;
      if (userContext.teacherDepName) {
        context += `- 所属院系：${userContext.teacherDepName}\n`;
      }
    }
  } else {
    context += `\n该用户尚未绑定人员信息。\n`;
  }

  context += `\n注意：当前登录用户的 SysUser 账号与认证信息仅用于权限判断，不要透露其他用户的私密用户数据；People、Student、Teacher 中除手机号、邮箱外的人员公开信息可以按公开校园业务场景回答。\n`;
  return context;
}

async function fetchUserContext(user) {
  if (!user?.userId) {
    return null;
  }

  const result = await query(
    `
      SELECT
        u.user_id AS "userId",
        u.username,
        u.role_type AS "roleType",
        u.verification_status AS "verificationStatus",
        u.dep_id AS "depId",
        d.dep_name AS "userDepName",
        p.people_id AS "peopleId",
        p.name,
        p.gender,
        p.phone,
        p.email,
        s.student_no AS "studentNo",
        s.grade,
        s.major,
        sd.dep_name AS "studentDepName",
        t.staff_no AS "staffNo",
        t.title,
        td.dep_name AS "teacherDepName"
      FROM sysuser u
      LEFT JOIN department d ON d.dep_id = u.dep_id
      LEFT JOIN people p ON p.people_id = u.people_id
      LEFT JOIN student s ON s.people_id = u.people_id
      LEFT JOIN department sd ON sd.dep_id = s.dep_id
      LEFT JOIN teacher t ON t.people_id = u.people_id
      LEFT JOIN department td ON td.dep_id = t.dept_id
      WHERE u.user_id = $1
      LIMIT 1
    `,
    [user.userId]
  );

  return result.rows[0] ?? null;
}

function getConfirmedConfirmationIds(modelMessages) {
  const confirmedIds = new Set();

  for (const message of modelMessages) {
    if (message.role !== "user" || !message.content.includes("我确认执行这个可能修改数据库的操作")) {
      continue;
    }

    const match = message.content.match(/confirmationId:\s*([0-9a-f-]{36})/i);
    if (match) {
      confirmedIds.add(match[1]);
    }
  }

  return confirmedIds;
}

function isConfirmationResponseText(content) {
  return (
    content.startsWith("我已确认这个可能修改数据库的操作，后端已执行该 SQL。") ||
    content.startsWith("我已拒绝这个可能修改数据库的操作，后端未执行该 SQL。") ||
    content.startsWith("我确认执行这个可能修改数据库的操作。") ||
    content.startsWith("我拒绝执行这个可能修改数据库的操作。")
  );
}

function getLastUserMessage(modelMessages) {
  for (let index = modelMessages.length - 1; index >= 0; index -= 1) {
    const message = modelMessages[index];

    if (message.role === "user") {
      return message;
    }
  }

  return null;
}

function extractAssistantTextFromUiMessage(message) {
  if (!message) {
    return "";
  }

  if (typeof message.content === "string") {
    return message.content.trim();
  }

  return extractVisibleTextFromParts(message.parts).trim();
}

function isToolPart(part) {
  return String(part?.type ?? "").includes("tool");
}

function getToolOutput(part) {
  if (part?.state !== "output-available") {
    return null;
  }

  return part.output ?? part.result ?? null;
}

function firstNonEmptyText(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getToolMessageContent(part) {
  const output = getToolOutput(part);

  return firstNonEmptyText([
    output?.reason,
    output?.message,
    output?.sql,
    part?.toolName,
    part?.type,
    "工具调用"
  ]);
}

function getCompletedToolParts(message) {
  if (!Array.isArray(message?.parts)) {
    return [];
  }

  return message.parts.filter((part) => isToolPart(part) && getToolOutput(part));
}

function stringifyToolOutput(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    const text = JSON.stringify(value);
    return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
  } catch (_error) {
    return "";
  }
}

function extractToolTextFromPart(part) {
  if (!isToolPart(part)) {
    return "";
  }

  const output = getToolOutput(part);
  if (!output) {
    return "";
  }

  const lines = [
    `工具调用：${part?.toolName ?? part?.type ?? "runSql"}`,
    output.reason ? `原因：${output.reason}` : "",
    output.sql ? `SQL：${output.sql}` : "",
    output.message ? `状态：${output.message}` : "",
    output.denied ? "结果：工具调用被拒绝" : "",
    output.needsConfirmation ? "结果：等待用户确认后执行" : "",
    output.result ? `执行结果：${stringifyToolOutput(output.result)}` : ""
  ].filter(Boolean);

  return lines.join("\n");
}

async function persistToolMessages({ sessionId, responseMessage }) {
  const toolParts = getCompletedToolParts(responseMessage);

  for (const part of toolParts) {
    await chatSessionRepository.createMessage({
      sessionId,
      role: "tool",
      content: getToolMessageContent(part),
      metadata: {
        source: "ai-tool",
        model: env.ai.model,
        part,
        toolType: part?.type ?? null,
        toolName: part?.toolName ?? null,
        output: getToolOutput(part)
      }
    });
  }
}

async function resolveRequestSession(req, user) {
  const rawSessionId = req.get("x-chat-session-id");

  if (!rawSessionId) {
    return null;
  }

  if (!user?.userId) {
    throw new HttpError(401, "请先登录");
  }

  const session = await chatSessionRepository.findOwned(rawSessionId, user.userId);

  if (!session) {
    throw new HttpError(404, "对话不存在");
  }

  return session;
}

function cleanGeneratedTitle(text) {
  const firstLine = String(text ?? "").split(/\r?\n/)[0] ?? "";

  return firstLine
    .replace(/^["'“”‘’`#\s]+|["'“”‘’`。！？.!?\s]+$/g, "")
    .replace(/[`*_~[\](){}]/g, "")
    .trim()
    .slice(0, 16);
}

async function generateSessionTitle({ provider, sessionId, userText, assistantText }) {
  try {
    const result = await generateText({
      model: provider.chat(env.ai.model),
      system: "你负责为校园助手对话生成简短中文标题。只输出标题本身，不要解释。",
      prompt: [
        "请根据下面第一轮对话生成一个中文短标题。",
        "要求：不超过16个中文字符；不要引号、句号、Markdown；优先概括用户意图。",
        "",
        `用户：${userText}`,
        `助手：${assistantText}`
      ].join("\n")
    });
    const title = cleanGeneratedTitle(result.text);

    if (!title) {
      await chatSessionRepository.updatePendingTitle(sessionId, "新对话", "failed");
      return;
    }

    await chatSessionRepository.updatePendingTitle(sessionId, title, "generated");
  } catch (_error) {
    await chatSessionRepository.updatePendingTitle(sessionId, "新对话", "failed");
  }
}

function extractVisibleTextFromParts(parts) {
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => {
      if (part?.type === "text" && typeof part.text === "string") {
        return part.text;
      }

      if (typeof part?.content === "string") {
        return part.content;
      }

      return "";
    })
    .join("")
    .trim();
}

function extractModelTextFromParts(parts) {
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => {
      if (part?.type === "text" && typeof part.text === "string") {
        return part.text;
      }

      const toolText = extractToolTextFromPart(part);
      if (toolText) {
        return toolText;
      }

      if (typeof part?.content === "string") {
        return part.content;
      }

      return "";
    })
    .join("\n\n")
    .trim();
}

function extractMessageText(message) {
  if (typeof message === "string") {
    return message.trim();
  }

  if (typeof message?.text === "string") {
    return message.text.trim();
  }

  if (typeof message?.content === "string") {
    return message.content.trim();
  }

  if (Array.isArray(message?.content)) {
    const contentText = extractModelTextFromParts(message.content);
    if (contentText) {
      return contentText;
    }
  }

  return extractModelTextFromParts(message?.parts);
}

function getMessageRole(message) {
  if (message?.role === "assistant") {
    return "assistant";
  }

  return "user";
}

function normalizeRequestMessages(body) {
  const messages = Array.isArray(body?.messages)
    ? [...body.messages]
    : body?.messages
      ? [body.messages]
      : [];

  if (body?.message) {
    messages.push(body.message);
  }

  const modelMessages = messages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message) => ({
      role: getMessageRole(message),
      content: extractMessageText(message)
    }))
    .filter((message) => message.content);

  if (modelMessages.length === 0) {
    throw new HttpError(400, "缺少对话消息");
  }

  return modelMessages;
}

export async function streamChat(req, res, next) {
  try {
    if (!env.ai.apiKey) {
      throw new HttpError(500, "AI_API_KEY 未配置");
    }

    const user = readAuthUser(req);
    const userContext = await fetchUserContext(user);
    const userContextString = buildUserContextString(userContext);
    const systemPrompt = BASE_SYSTEM_PROMPT + userContextString;

    const modelMessages = normalizeRequestMessages(req.body);
    const confirmedConfirmationIds = getConfirmedConfirmationIds(modelMessages);
    const session = await resolveRequestSession(req, user);
    const lastUserMessage = getLastUserMessage(modelMessages);
    const shouldPersistUserMessage =
      Boolean(session && lastUserMessage?.content) && !isConfirmationResponseText(lastUserMessage.content);
    let persistedUserMessage = null;

    if (shouldPersistUserMessage) {
      try {
        persistedUserMessage = await chatSessionRepository.createMessage({
          sessionId: session.id,
          role: "user",
          content: lastUserMessage.content,
          metadata: { source: "chat" }
        });
      } catch (_error) {
        // 对话记录失败不影响本次流式响应
      }
    }
    const provider = createOpenAI({
      apiKey: env.ai.apiKey,
      ...(env.ai.baseURL ? { baseURL: env.ai.baseURL } : {})
    });
    const agent = new ToolLoopAgent({
      model: provider.chat(env.ai.model),
      instructions: systemPrompt,
      tools: {
        runSql: createAiSqlTool({
          user,
          confirmedConfirmationIds,
          sessionId: session?.id ?? null,
          messageId: persistedUserMessage?.id ?? null
        })
      },
      stopWhen: stepCountIs(8)
    });

    const result = await agent.stream({
      prompt: modelMessages
    });

    result.pipeUIMessageStreamToResponse(res, {
      async onFinish({ responseMessage, isAborted }) {
        if (!session || isAborted) {
          return;
        }

        try {
          const assistantText = extractAssistantTextFromUiMessage(responseMessage);

          await persistToolMessages({
            sessionId: session.id,
            responseMessage
          });

          if (assistantText) {
            await chatSessionRepository.createMessage({
              sessionId: session.id,
              role: "assistant",
              content: assistantText,
              metadata: { source: "ai", model: env.ai.model }
            });
          }

          const conversationMessageCount = await chatSessionRepository.countConversationMessages(session.id);
          if (assistantText && conversationMessageCount === 2) {
            const titleUserText =
              persistedUserMessage?.content ??
              (await chatSessionRepository.getMessages(session.id)).find((message) => message.role === "user")?.content;

            if (!titleUserText) {
              return;
            }

            void generateSessionTitle({
              provider,
              sessionId: session.id,
              userText: titleUserText,
              assistantText
            });
          }
        } catch (_error) {
          // 对话记录失败不影响本次流式响应
        }
      },
      onError(error) {
        return error instanceof Error ? error.message : "AI 流式响应失败";
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmSqlWrite(req, res, next) {
  try {
    const user = readAuthUser(req);

    if (!user) {
      throw new HttpError(401, "请先登录");
    }

    const result = await resolveAiSqlConfirmation({
      user,
      confirmationId: req.params.confirmationId,
      approved: Boolean(req.body?.approved)
    });

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
