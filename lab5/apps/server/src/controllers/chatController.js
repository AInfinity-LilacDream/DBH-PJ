import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, ToolLoopAgent } from "ai";
import { env } from "../config/env.js";
import { aiSqlTool, DATABASE_SCHEMA_FOR_AI } from "../services/aiSqlTool.js";
import { HttpError } from "../utils/httpError.js";

const MAX_CONTEXT_MESSAGES = 20;

const SYSTEM_PROMPT = `
你是“复旦百事通”，一个面向校园信息查询与管理的中文助手。

你可以直接回答一般问题；当用户需要精确的课程、地点、活动、人员、报名、选课、管理数据，或者明确要求新增、修改、删除数据时，你可以调用 runSql 工具查询或写入 PostgreSQL 数据库。

数据库结构：
${DATABASE_SCHEMA_FOR_AI}

SQL 工具使用规则：
1. 只有需要数据库事实或用户明确要求写表时才调用 runSql。
2. 查询优先使用 SELECT，并尽量显式选择需要的字段，不要 SELECT *。
3. 写表只在用户明确表达新增、修改、删除意图时使用 INSERT/UPDATE/DELETE；不要因为普通咨询而写表。
4. 不要生成 DDL、事务控制、多语句或危险操作。
5. 对查询结果进行解释和总结，不要把工具返回 JSON 原样丢给用户。
6. 回答前端时使用 Markdown，表格数据可以用 Markdown 表格，重点结论放在前面。
7. 如果数据库结果为空，直接说明没有查到，并给出可能的下一步筛选建议。
`.trim();

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

    const provider = createOpenAI({
      apiKey: env.ai.apiKey,
      ...(env.ai.baseURL ? { baseURL: env.ai.baseURL } : {})
    });
    const agent = new ToolLoopAgent({
      model: provider.chat(env.ai.model),
      instructions: SYSTEM_PROMPT,
      tools: {
        runSql: aiSqlTool
      },
      stopWhen: stepCountIs(8)
    });

    const result = await agent.stream({
      prompt: normalizeRequestMessages(req.body)
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
