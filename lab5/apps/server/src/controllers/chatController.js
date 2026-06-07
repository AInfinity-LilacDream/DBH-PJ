import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

const MAX_CONTEXT_MESSAGES = 20;

const SYSTEM_PROMPT =
  "你是复旦百事通，一个面向校园信息查询的中文助手。当前版本只支持普通对话流式回答，不具备工具调用或数据库实时查询能力；如果用户需要精确课程、地点或活动数据，请引导用户使用页面左侧的信息查询入口。";

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
    const result = streamText({
      model: provider(env.ai.model),
      system: SYSTEM_PROMPT,
      messages: normalizeRequestMessages(req.body)
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
