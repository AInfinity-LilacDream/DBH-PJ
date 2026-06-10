import dotenv from "dotenv";

dotenv.config({ path: new URL("../apps/server/.env", import.meta.url) });

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
const model = args.model || process.env.AI_MODEL || "gpt-4o-mini";
const baseURL = args.baseUrl || process.env.AI_BASE_URL || "https://api.openai.com/v1";
const endpoint = args.endpoint || buildChatCompletionsEndpoint(baseURL);
const prompt = args.prompt || "请用一句中文回答：2+2 等于几？";

if (!apiKey) {
  exitWithMessage("未找到 AI_API_KEY 或 OPENAI_API_KEY，请先检查 lab5/apps/server/.env。");
}

console.log("AI 接口诊断");
console.log(`- endpoint: ${maskEndpoint(endpoint)}`);
console.log(`- model: ${model}`);
console.log(`- stream: ${args.stream ? "true" : "false"}`);
console.log(`- prompt: ${prompt}`);
console.log("");

if (args.stream) {
  await testStreamCompletion({ endpoint, apiKey, model, prompt });
} else {
  await testCompletion({ endpoint, apiKey, model, prompt });
}

function parseArgs(argv) {
  const parsed = {
    stream: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--stream") {
      parsed.stream = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    const next = argv[index + 1];
    if (arg === "--model" && next) {
      parsed.model = next;
      index += 1;
      continue;
    }

    if (arg === "--base-url" && next) {
      parsed.baseUrl = next;
      index += 1;
      continue;
    }

    if (arg === "--endpoint" && next) {
      parsed.endpoint = next;
      index += 1;
      continue;
    }

    if (arg === "--prompt" && next) {
      parsed.prompt = next;
      index += 1;
      continue;
    }

    exitWithMessage(`未知参数：${arg}。使用 --help 查看用法。`);
  }

  return parsed;
}

function printHelp() {
  console.log(`
用法：
  node scripts/test-ai-api.mjs
  node scripts/test-ai-api.mjs --stream
  node scripts/test-ai-api.mjs --model gpt-4o-mini --prompt "你好"
  node scripts/test-ai-api.mjs --endpoint https://example.com/v1/chat/completions

说明：
  默认读取 apps/server/.env 中的 AI_API_KEY / OPENAI_API_KEY、AI_BASE_URL、AI_MODEL。
  默认 endpoint 与 @ai-sdk/openai 的 baseURL 习惯保持一致：baseURL + /chat/completions。
  如果你的第三方接口要求 /v1，请用 --base-url https://example.com/v1 或 --endpoint 指定完整地址。
`.trim());
}

function buildChatCompletionsEndpoint(value) {
  const normalized = value.replace(/\/+$/, "");

  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

function maskEndpoint(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch (_error) {
    return value;
  }
}

function buildRequestBody({ model, prompt, stream }) {
  return {
    model,
    stream,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };
}

async function testCompletion({ endpoint, apiKey, model, prompt }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildRequestBody({ model, prompt, stream: false }))
  });

  const responseText = await response.text();
  const json = parseJsonSafely(responseText);

  console.log(`HTTP ${response.status} ${response.statusText}`);
  console.log(`content-type: ${response.headers.get("content-type") || "(empty)"}`);

  if (!response.ok) {
    printRawOrJson(json, responseText);
    process.exitCode = 1;
    return;
  }

  if (!json) {
    console.log("响应不是 JSON：");
    console.log(truncate(responseText, 4000));
    return;
  }

  const choice = json.choices?.[0];
  const content = choice?.message?.content ?? "";

  console.log(`finish_reason: ${choice?.finish_reason ?? "(empty)"}`);
  console.log(`choices.length: ${Array.isArray(json.choices) ? json.choices.length : "(not array)"}`);
  console.log(`content.length: ${content.length}`);
  console.log("content:");
  console.log(content || "(empty)");

  if (!content) {
    console.log("");
    console.log("首个 choice 原始内容：");
    console.log(JSON.stringify(choice ?? null, null, 2));
  }

  if (json.usage) {
    console.log("");
    console.log("usage:");
    console.log(JSON.stringify(json.usage, null, 2));
  }
}

async function testStreamCompletion({ endpoint, apiKey, model, prompt }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildRequestBody({ model, prompt, stream: true }))
  });

  console.log(`HTTP ${response.status} ${response.statusText}`);
  console.log(`content-type: ${response.headers.get("content-type") || "(empty)"}`);

  if (!response.ok) {
    const responseText = await response.text();
    printRawOrJson(parseJsonSafely(responseText), responseText);
    process.exitCode = 1;
    return;
  }

  if (!response.body) {
    console.log("响应没有 body。");
    process.exitCode = 1;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventCount = 0;
  let content = "";
  let reasoningContent = "";
  const finishReasons = new Set();
  const rawSamples = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") {
        continue;
      }

      eventCount += 1;

      if (rawSamples.length < 5) {
        rawSamples.push(data);
      }

      const json = parseJsonSafely(data);
      const choice = json?.choices?.[0];
      const delta = choice?.delta ?? {};

      if (typeof delta.content === "string") {
        content += delta.content;
      }

      if (typeof delta.reasoning_content === "string") {
        reasoningContent += delta.reasoning_content;
      }

      if (choice?.finish_reason) {
        finishReasons.add(choice.finish_reason);
      }
    }
  }

  console.log(`sse.events: ${eventCount}`);
  console.log(`finish_reasons: ${Array.from(finishReasons).join(", ") || "(empty)"}`);
  console.log(`content.length: ${content.length}`);
  console.log("content:");
  console.log(content || "(empty)");

  if (reasoningContent) {
    console.log("");
    console.log(`reasoning_content.length: ${reasoningContent.length}`);
    console.log(truncate(reasoningContent, 1200));
  }

  if (!content) {
    console.log("");
    console.log("前 5 个 SSE data 样本：");
    for (const sample of rawSamples) {
      console.log(truncate(sample, 1200));
    }
  }
}

function parseJsonSafely(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function printRawOrJson(json, text) {
  if (json) {
    console.log(JSON.stringify(json, null, 2));
    return;
  }

  console.log(truncate(text, 4000));
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function exitWithMessage(message) {
  console.error(message);
  process.exit(1);
}
