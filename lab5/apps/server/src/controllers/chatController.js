import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, ToolLoopAgent } from "ai";
import { env } from "../config/env.js";
import { createAiSqlTool, DATABASE_SCHEMA_FOR_AI, resolveAiSqlConfirmation } from "../services/aiSqlTool.js";
import { HttpError } from "../utils/httpError.js";
import { verifyAuthToken } from "../utils/token.js";
import { query } from "../db/pool.js";

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
13. 你只能向当前用户透露其本人的个人信息（姓名、性别、联系方式、学号/工号、院系、成绩等）。
14. 查询其他用户（学生/教师/管理员）的数据时，禁止暴露任何个人身份信息（姓名、手机号、邮箱、学号、工号、成绩等）。只能提供去个性化的统计汇总数据（如人数、分布比例）或公开的课程/活动/地点等公共信息。
15. 如果用户询问其他具体个人的信息，直接回复"抱歉，我无法查询其他用户的个人信息。"
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

  context += `\n注意：你只能向当前用户透露以上其本人的信息。对其他任何人的个人信息必须严格保密。\n`;
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

function getRequestUser(req) {
  const header = req.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  try {
    return verifyAuthToken(match[1]);
  } catch (_error) {
    return null;
  }
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

function extractTextFromParts(parts) {
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
    const contentText = extractTextFromParts(message.content);
    if (contentText) {
      return contentText;
    }
  }

  return extractTextFromParts(message?.parts);
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

    const user = getRequestUser(req);
    const userContext = await fetchUserContext(user);
    const userContextString = buildUserContextString(userContext);
    const systemPrompt = BASE_SYSTEM_PROMPT + userContextString;

    const modelMessages = normalizeRequestMessages(req.body);
    const confirmedConfirmationIds = getConfirmedConfirmationIds(modelMessages);
    const provider = createOpenAI({
      apiKey: env.ai.apiKey,
      ...(env.ai.baseURL ? { baseURL: env.ai.baseURL } : {})
    });
    const agent = new ToolLoopAgent({
      model: provider.chat(env.ai.model),
      instructions: systemPrompt,
      tools: {
        runSql: createAiSqlTool({ user, confirmedConfirmationIds })
      },
      stopWhen: stepCountIs(8)
    });

    const result = await agent.stream({
      prompt: modelMessages
    });

    result.pipeUIMessageStreamToResponse(res, {
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
    const user = getRequestUser(req);

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
