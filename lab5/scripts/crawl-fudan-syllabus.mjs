#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import vm from "node:vm";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);
const DEFAULT_OUT_DIR = path.resolve(__dirname, "../data/fudan-syllabus");
const DEFAULT_SOURCES = ["web"];
const DEFAULT_START_URLS = [
  "https://gecc.fudan.edu.cn/flysh/Data/List/jxdg",
  "https://math.fudan.edu.cn/anal/34382/list.htm",
  "https://math.fudan.edu.cn/gdsx/34085/list.htm",
  "http://gdds.jpkc.fudan.edu.cn/25965/list.htm"
];
const SYLLABUS_KEYWORDS = [
  "教学大纲",
  "课程大纲",
  "Course Syllabus",
  "syllabus",
  "jxdg"
];
const SYLLABUS_SIGNALS = [
  "课程性质",
  "基本要求",
  "教学要求",
  "教学内容",
  "学时分配",
  "考核方式",
  "成绩评定",
  "参考文献"
];
const COURSE_FIELD_LINE_RE =
  /^(课程名称|课程代码|课程序号|开课院系|院系|部门|教师|任课教师|授课教师|主讲教师|学期|学期 ID|学分|总学时|课程类别|课程分类|课程层级|适用门类|所属一级学科|授课语言|考核方式|实际\/上限人数|备注)\s*[：:]\s*(.*?)\s*$/gm;
const COURSE_INTRO_START_RE =
  /课程简介\s*[（(]\s*中文\s*[）)]\s*(?:\/\s*Course Description\s*\(in Chinese\))?\s*/i;
const COURSE_INTRO_END_RES = [
  /课程简介\s*[（(]\s*英文\s*[）)]\s*(?:\/\s*Course Description\s*\(in English\))?/i,
  /教学目标\s*\/\s*Course Objectives/i,
  /教学方式\s*\/\s*Teaching Methods/i,
  /教学内容与进度安排\s*\/\s*Course Content/i,
  /教学参考资料\s*\/\s*Suggested Readings/i
];
const SKIP_LINK_RE =
  /\.(?:css|js|png|jpe?g|gif|svg|ico|webp|mp4|mp3|avi|mov|zip|rar|7z|tar|gz)(?:[?#].*)?$/i;

function printHelp() {
  console.log(`
复旦教学大纲抓取脚本

用法：
  node scripts/crawl-fudan-syllabus.mjs [选项]

常用选项：
  --start <url>           追加一个起始页面，可重复使用
  --source <name>         数据源：web、fdjwgl、all，默认 web，可重复使用
  --max-pages <n>         最多抓取页面数，默认 80
  --max-depth <n>         链接发现深度，默认 2
  --delay-ms <n>          每次请求间隔，默认 800
  --concurrency <n>       fdjwgl 大纲详情并发数，默认 4
  --detail-limit <n>      fdjwgl 大纲详情最多抓取条数，默认不限制
  --timeout-ms <n>        单次请求超时，默认 15000
  --out-dir <path>        输出目录，默认 lab5/data/fudan-syllabus
  --from-json [path]      从已有 JSON 用字段正则提取课程信息并重新生成 SQL
  --allowed-host <host>   允许继续发现链接的域名，可重复使用
  --discover-all          在允许域名内按深度继续发现全部 HTML 链接
  --import-db             抓取后直接写入当前 PostgreSQL Course/Department 表
  --help                  显示帮助

环境变量：
  FUDAN_START_URLS        起始 URL，多个 URL 用换行或逗号分隔
  FUDAN_COOKIE            登录后的 Cookie 字符串
  FUDAN_COOKIE_FILE       存放 Cookie 字符串的本地文件
  FUDAN_ALLOWED_HOSTS     允许域名，多个域名用换行或逗号分隔
  FUDAN_SOURCES           数据源列表，多个值用换行或逗号分隔
  FUDAN_INPUT_JSON        已有课程 JSON 路径，用于重新提取并生成 SQL
  FUDAN_FDJWGL_SEMESTER_ID  本科教务学期 ID，不填则从课程表页自动识别当前学期
  FUDAN_FDJWGL_SEMESTER     写入 Teaching.semester 的学期名，如 2025-2026-2
  FUDAN_FDJWGL_PAGE_SIZE    全校开课查询每页条数，默认 1000
  FUDAN_FDJWGL_CONCURRENCY  fdjwgl 大纲详情并发数，默认 4
  FUDAN_FDJWGL_DETAIL_LIMIT fdjwgl 大纲详情最多抓取条数，默认不限制
  FUDAN_DESCRIPTION_MAX_CHARS  写入课程描述的最大长度，默认 1200

Danxi 参考接口与全校大纲接口：
  fdjwgl: GET https://fdjwgl.fudan.edu.cn/student/for-std/course-table
          GET https://fdjwgl.fudan.edu.cn/student/for-std/course-table/semester/<id>/print-data
  全校课程大纲：
          GET https://fdjwgl.fudan.edu.cn/student/for-all/lesson-search
          GET https://fdjwgl.fudan.edu.cn/student/for-all/lesson-search/semester/<id>/search/<id>?teachingSyllabus=1&queryPage__=1%2C1000
          GET https://fdjwgl.fudan.edu.cn/student/for-all/lesson-search/teachingSyllabusInfo/<lessonId>

PDF 说明：
  页面中发现 PDF 大纲时会自动下载并尝试抽文本。
  本机安装 pdftotext（poppler）时效果最好；否则会尝试 Python pypdf。

数据库环境变量（--import-db 时使用）：
  DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD
`);
}

function parseArgs(argv) {
  const options = {
    starts: [],
    allowedHosts: [],
    sources: splitList(process.env.FUDAN_SOURCES),
    outDir: process.env.FUDAN_OUT_DIR ?? DEFAULT_OUT_DIR,
    maxPages: Number(process.env.FUDAN_MAX_PAGES ?? 80),
    maxDepth: Number(process.env.FUDAN_MAX_DEPTH ?? 2),
    delayMs: Number(process.env.FUDAN_DELAY_MS ?? 800),
    timeoutMs: Number(process.env.FUDAN_TIMEOUT_MS ?? 15000),
    inputJson: process.env.FUDAN_INPUT_JSON ?? "",
    minTextChars: Number(process.env.FUDAN_MIN_TEXT_CHARS ?? 300),
    descriptionMaxChars: Number(process.env.FUDAN_DESCRIPTION_MAX_CHARS ?? 1200),
    fdjwglSemesterId: process.env.FUDAN_FDJWGL_SEMESTER_ID ?? "",
    fdjwglSemester: process.env.FUDAN_FDJWGL_SEMESTER ?? "",
    fdjwglPageSize: Number(process.env.FUDAN_FDJWGL_PAGE_SIZE ?? 1000),
    fdjwglConcurrency: Number(process.env.FUDAN_FDJWGL_CONCURRENCY ?? 4),
    fdjwglDetailLimit: Number(process.env.FUDAN_FDJWGL_DETAIL_LIMIT ?? 0),
    discoverAll: process.env.FUDAN_DISCOVER_ALL === "1",
    importDb: process.env.FUDAN_IMPORT_DB === "1",
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      return argv[index];
    };

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--source") {
      options.sources.push(next());
    } else if (arg.startsWith("--source=")) {
      options.sources.push(arg.slice("--source=".length));
    } else if (arg === "--start") {
      options.starts.push(next());
    } else if (arg.startsWith("--start=")) {
      options.starts.push(arg.slice("--start=".length));
    } else if (arg === "--allowed-host") {
      options.allowedHosts.push(next());
    } else if (arg.startsWith("--allowed-host=")) {
      options.allowedHosts.push(arg.slice("--allowed-host=".length));
    } else if (arg === "--out-dir") {
      options.outDir = next();
    } else if (arg.startsWith("--out-dir=")) {
      options.outDir = arg.slice("--out-dir=".length);
    } else if (arg === "--from-json") {
      const value = argv[index + 1];
      options.inputJson = value && !value.startsWith("--") ? next() : path.join(options.outDir, "fudan-syllabus.json");
    } else if (arg.startsWith("--from-json=")) {
      options.inputJson = arg.slice("--from-json=".length);
    } else if (arg === "--max-pages") {
      options.maxPages = Number(next());
    } else if (arg.startsWith("--max-pages=")) {
      options.maxPages = Number(arg.slice("--max-pages=".length));
    } else if (arg === "--max-depth") {
      options.maxDepth = Number(next());
    } else if (arg.startsWith("--max-depth=")) {
      options.maxDepth = Number(arg.slice("--max-depth=".length));
    } else if (arg === "--delay-ms") {
      options.delayMs = Number(next());
    } else if (arg.startsWith("--delay-ms=")) {
      options.delayMs = Number(arg.slice("--delay-ms=".length));
    } else if (arg === "--concurrency") {
      options.fdjwglConcurrency = Number(next());
    } else if (arg.startsWith("--concurrency=")) {
      options.fdjwglConcurrency = Number(arg.slice("--concurrency=".length));
    } else if (arg === "--detail-limit") {
      options.fdjwglDetailLimit = Number(next());
    } else if (arg.startsWith("--detail-limit=")) {
      options.fdjwglDetailLimit = Number(arg.slice("--detail-limit=".length));
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(next());
    } else if (arg.startsWith("--timeout-ms=")) {
      options.timeoutMs = Number(arg.slice("--timeout-ms=".length));
    } else if (arg === "--semester-id") {
      options.fdjwglSemesterId = next();
    } else if (arg.startsWith("--semester-id=")) {
      options.fdjwglSemesterId = arg.slice("--semester-id=".length);
    } else if (arg === "--semester") {
      options.fdjwglSemester = next();
    } else if (arg.startsWith("--semester=")) {
      options.fdjwglSemester = arg.slice("--semester=".length);
    } else if (arg === "--discover-all") {
      options.discoverAll = true;
    } else if (arg === "--import-db") {
      options.importDb = true;
    } else {
      throw new Error(`未知参数：${arg}`);
    }
  }

  options.starts.push(...splitList(process.env.FUDAN_START_URLS));
  if (!options.starts.length) {
    options.starts.push(...DEFAULT_START_URLS);
  }
  options.allowedHosts.push(...splitList(process.env.FUDAN_ALLOWED_HOSTS));
  if (!options.sources.length) {
    options.sources.push(...DEFAULT_SOURCES);
  }

  options.starts = unique(options.starts.filter(Boolean).map((url) => url.trim()));
  options.allowedHosts = unique(options.allowedHosts.filter(Boolean).map((host) => host.trim()));
  options.sources = normalizeSources(options.sources);

  if (!Number.isFinite(options.maxPages) || options.maxPages <= 0) {
    throw new Error("--max-pages 必须是正整数");
  }
  if (!Number.isFinite(options.maxDepth) || options.maxDepth < 0) {
    throw new Error("--max-depth 必须是非负整数");
  }
  if (!Number.isFinite(options.fdjwglPageSize) || options.fdjwglPageSize <= 0) {
    throw new Error("FUDAN_FDJWGL_PAGE_SIZE 必须是正整数");
  }
  if (!Number.isFinite(options.fdjwglConcurrency) || options.fdjwglConcurrency <= 0) {
    throw new Error("--concurrency 必须是正整数");
  }
  if (!Number.isFinite(options.fdjwglDetailLimit) || options.fdjwglDetailLimit < 0) {
    throw new Error("--detail-limit 必须是非负整数");
  }

  return options;
}

function normalizeSources(sources) {
  const normalized = sources
    .flatMap((source) => splitList(source))
    .map((source) => source.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.includes("all")) {
    return ["fdjwgl", "web"];
  }

  for (const source of normalized) {
    if (!["web", "fdjwgl"].includes(source)) {
      throw new Error(`未知数据源：${source}`);
    }
  }

  return unique(normalized);
}

function splitList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(items) {
  return [...new Set(items)];
}

async function readCookie() {
  if (process.env.FUDAN_COOKIE) {
    return process.env.FUDAN_COOKIE.trim();
  }

  if (!process.env.FUDAN_COOKIE_FILE) {
    return "";
  }

  return (await fs.readFile(process.env.FUDAN_COOKIE_FILE, "utf8")).trim();
}

function deriveAllowedHosts(starts, explicitHosts) {
  const hosts = new Set(explicitHosts.map(normalizeHost));

  for (const start of starts) {
    try {
      hosts.add(new URL(start).hostname.toLowerCase());
    } catch {
      // 起始 URL 后续会单独报错，这里只负责补默认域名。
    }
  }

  return hosts;
}

function normalizeHost(host) {
  return host.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
}

function isAllowedHost(url, allowedHosts) {
  return allowedHosts.has(url.hostname.toLowerCase());
}

async function crawlWeb(options) {
  const cookie = await readCookie();
  const allowedHosts = deriveAllowedHosts(options.starts, options.allowedHosts);
  const queue = options.starts.map((url) => ({ url: normalizeAbsoluteUrl(url), depth: 0, viaText: "start" }));
  const visited = new Set();
  const records = [];
  const failures = [];
  const pdfFailures = [];

  while (queue.length && visited.size < options.maxPages) {
    const current = queue.shift();
    const currentUrl = normalizeAbsoluteUrl(current.url);

    if (visited.has(currentUrl)) {
      continue;
    }
    visited.add(currentUrl);

    try {
      console.log(`[${visited.size}/${options.maxPages}] 抓取 ${currentUrl}`);
      const page = await fetchPage(currentUrl, { cookie, timeoutMs: options.timeoutMs });

      if (!page.contentType.includes("html") && !looksLikeHtml(page.html)) {
        continue;
      }

      const title = extractTitle(page.html);
      const mainHtml = extractMainHtml(page.html);
      const text = normalizeText(htmlToText(mainHtml));
      const record = buildRecord({
        title,
        text,
        sourceUrl: page.url,
        requestedUrl: currentUrl,
        fetchedAt: new Date().toISOString()
      });

      if (isSyllabusLike(record, options.minTextChars)) {
        records.push(record);
        console.log(`  收录：${record.courseName} / ${record.departmentName}`);
      }

      const pdfLinks = extractPdfLinks(page.html, page.url);
      for (const pdfLink of pdfLinks) {
        try {
          const pdfRecord = await crawlPdf(pdfLink, {
            pageTitle: title,
            pageText: text,
            fetchedAt: new Date().toISOString(),
            cookie,
            timeoutMs: options.timeoutMs
          });

          if (isSyllabusLike(pdfRecord, options.minTextChars)) {
            records.push(pdfRecord);
            console.log(`  收录 PDF：${pdfRecord.courseName} / ${pdfRecord.departmentName}`);
          }
        } catch (error) {
          pdfFailures.push({ url: pdfLink.url, message: error.message });
          console.warn(`  PDF 失败：${error.message}`);
        }
      }

      if (current.depth < options.maxDepth) {
        const links = extractLinks(page.html, page.url);
        for (const link of links) {
          if (shouldFollow(link, current.depth + 1, allowedHosts, options)) {
            queue.push({ url: link.url, depth: current.depth + 1, viaText: link.text });
          }
        }
      }
    } catch (error) {
      failures.push({ url: currentUrl, message: error.message });
      console.warn(`  失败：${error.message}`);
    }

    if (queue.length && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  return {
    records: dedupeRecords(records, options.descriptionMaxChars),
    failures,
    pdfFailures,
    visitedCount: visited.size,
    allowedHosts: [...allowedHosts],
    sourceReports: [
      {
        source: "web",
        visitedCount: visited.size,
        recordCount: records.length,
        failures,
        pdfFailures
      }
    ]
  };
}

async function crawlFdjwgl(options) {
  const cookie = await readCookie();
  if (!cookie) {
    throw new Error("抓取 fdjwgl 需要 FUDAN_COOKIE 或 FUDAN_COOKIE_FILE");
  }

  const courseTableUrl = "https://fdjwgl.fudan.edu.cn/student/for-std/course-table";
  const lessonSearchUrl = "https://fdjwgl.fudan.edu.cn/student/for-all/lesson-search";
  let semesterId = options.fdjwglSemesterId;
  let semesterText = options.fdjwglSemester;
  let semesterLookupCount = 0;

  if (!semesterId || !semesterText) {
    semesterLookupCount = 1;
    const page = await fetchPage(courseTableUrl, {
      cookie,
      timeoutMs: options.timeoutMs,
      accept: "text/html,application/xhtml+xml"
    });
    const semesterInfo = parseFdjwglSemesterInfo(page.html);
    semesterId ||= semesterInfo.currentSemesterId;
    semesterText ||= semesterInfo.currentSemester;
  }

  if (!semesterId) {
    throw new Error("未能识别 fdjwgl 学期 ID，请用 --semester-id 指定");
  }

  const semester = normalizeSemesterText(semesterText);
  const listResult = await fetchFdjwglLessonSearchLessons({
    semesterId,
    cookie,
    timeoutMs: options.timeoutMs,
    pageSize: options.fdjwglPageSize
  });
  const lessons = listResult.lessons;
  const selectedLessons = options.fdjwglDetailLimit > 0 ? lessons.slice(0, options.fdjwglDetailLimit) : lessons;
  const detailFailures = [];
  const lessonsWithSyllabus = await mapWithConcurrency(selectedLessons, options.fdjwglConcurrency, async (lesson, index) => {
    const sourceUrl = buildFdjwglSyllabusUrl(lesson.id);

    if (options.delayMs > 0 && index > 0) {
      await sleep(options.delayMs);
    }

    try {
      const page = await fetchPage(sourceUrl, {
        cookie,
        timeoutMs: options.timeoutMs,
        accept: "text/html,application/xhtml+xml"
      });
      const syllabus = extractFdjwglSyllabus(page.html);
      return {
        lesson,
        syllabus,
        sourceUrl: page.url
      };
    } catch (error) {
      detailFailures.push({ url: sourceUrl, lessonId: lesson.id, message: error.message });
      return {
        lesson,
        syllabus: null,
        sourceUrl
      };
    }
  });

  const records = buildFdjwglLessonSearchRecords(lessonsWithSyllabus, {
    semester,
    semesterId,
    sourceUrl: lessonSearchUrl,
    fetchedAt: new Date().toISOString()
  });
  const dedupedRecords = dedupeRecords(records, options.descriptionMaxChars);
  const visitedCount = semesterLookupCount + listResult.pageCount + selectedLessons.length;

  return {
    records: dedupedRecords,
    failures: detailFailures,
    pdfFailures: [],
    visitedCount,
    allowedHosts: ["fdjwgl.fudan.edu.cn"],
    sourceReports: [
      {
        source: "fdjwgl",
        sourceName: "复旦本科教务全校开课查询",
        visitedCount,
        recordCount: dedupedRecords.length,
        rawRecordCount: records.length,
        listLessonCount: lessons.length,
        listTotalRows: listResult.totalRows,
        listPageCount: listResult.pageCount,
        detailLessonCount: selectedLessons.length,
        detailFailureCount: detailFailures.length,
        semesterId,
        semester,
        failures: detailFailures
      }
    ]
  };
}

function combineResults(results, options) {
  const records = dedupeRecords(results.flatMap((result) => result.records), options.descriptionMaxChars);
  return {
    records,
    failures: results.flatMap((result) => result.failures ?? []),
    pdfFailures: results.flatMap((result) => result.pdfFailures ?? []),
    visitedCount: results.reduce((sum, result) => sum + (result.visitedCount ?? 0), 0),
    allowedHosts: unique(results.flatMap((result) => result.allowedHosts ?? [])),
    sourceReports: results.flatMap((result) => result.sourceReports ?? [])
  };
}

function normalizeAbsoluteUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

async function fetchPage(url, { cookie, timeoutMs, accept = "", referer = "" }) {
  const response = await fetchResponse(url, { cookie, timeoutMs, accept, referer });
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  const html = decodeBuffer(buffer, contentType);

  return {
    url: response.url,
    contentType: contentType.toLowerCase(),
    html
  };
}

async function fetchBinary(url, { cookie, timeoutMs }) {
  const response = await fetchResponse(url, { cookie, timeoutMs });
  const contentType = response.headers.get("content-type") ?? "";
  return {
    url: response.url,
    contentType: contentType.toLowerCase(),
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

async function fetchJson(url, { cookie = "", authorization = "", timeoutMs, referer = "" }) {
  const response = await fetchResponse(url, {
    cookie,
    authorization,
    timeoutMs,
    accept: "application/json, text/plain, */*",
    referer,
    requestedWith: "XMLHttpRequest"
  });
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`接口返回不是 JSON：${url}`);
  }
}

async function fetchResponse(
  url,
  { cookie = "", authorization = "", timeoutMs, accept = "", referer = "", requestedWith = "" }
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 FudanSyllabusCrawler/1.0 (+course data research)",
      Accept: accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6"
    };

    if (cookie) {
      headers.Cookie = cookie;
    }
    if (authorization) {
      headers.Authorization = authorization;
    }
    if (referer) {
      headers.Referer = referer;
    }
    if (requestedWith) {
      headers["X-Requested-With"] = requestedWith;
    }

    const response = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

function decodeBuffer(buffer, contentType) {
  const charset = detectCharset(buffer, contentType);
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function detectCharset(buffer, contentType) {
  const fromHeader = contentType.match(/charset=([^;\s]+)/i)?.[1];
  if (fromHeader) {
    return normalizeCharset(fromHeader);
  }

  const head = buffer.toString("latin1", 0, Math.min(buffer.length, 4096));
  const fromMeta =
    head.match(/<meta[^>]+charset=["']?\s*([^"'\s/>]+)/i)?.[1] ??
    head.match(/<meta[^>]+content=["'][^"']*charset=([^"'\s;]+)/i)?.[1];
  return normalizeCharset(fromMeta ?? "utf-8");
}

function normalizeCharset(charset) {
  const value = charset.toLowerCase().replace(/^["']|["']$/g, "");
  if (value === "gb2312" || value === "gbk") {
    return "gb18030";
  }
  return value;
}

function looksLikeHtml(html) {
  return /<html[\s>]|<body[\s>]|<title[\s>]/i.test(html);
}

function extractTitle(html) {
  const candidates = [
    matchText(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    matchText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    matchText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i)
  ];

  return normalizeText(candidates.filter(Boolean).join(" / ")).replace(/\s*\/\s*$/, "");
}

function matchText(html, pattern) {
  const matched = html.match(pattern)?.[1];
  return matched ? htmlToText(matched) : "";
}

function extractMainHtml(html) {
  const classNames = [
    "wp_articlecontent",
    "paging_content",
    "view-cnt",
    "articlecontent",
    "news_content",
    "wp_entry",
    "right-nr"
  ];

  for (const className of classNames) {
    const found = findElementByClass(html, className);
    if (found && htmlToText(found).length > 200) {
      return found;
    }
  }

  return html;
}

function findElementByClass(html, className) {
  const openPattern = new RegExp(
    `<([a-z][\\w:-]*)\\b[^>]*class=["'][^"']*${escapeRegExp(className)}[^"']*["'][^>]*>`,
    "i"
  );
  const open = openPattern.exec(html);
  if (!open) {
    return "";
  }

  const tag = open[1];
  const bodyStart = open.index + open[0].length;
  const tagPattern = new RegExp(`<\\/?${escapeRegExp(tag)}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = bodyStart;
  let depth = 1;
  let next;

  while ((next = tagPattern.exec(html))) {
    if (next[0].startsWith("</")) {
      depth -= 1;
    } else if (!next[0].endsWith("/>")) {
      depth += 1;
    }

    if (depth === 0) {
      return html.slice(bodyStart, next.index);
    }
  }

  return html.slice(bodyStart);
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
      .replace(/<!--[\s\S]*?-->/g, "\n")
      .replace(/<(?:br|hr)\b[^>]*>/gi, "\n")
      .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article|table)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function decodeEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " "
  };

  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }
    return named[body.toLowerCase()] ?? entity;
  });
}

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html))) {
    const attrs = match[1];
    const href = readAttr(attrs, "href");
    if (!href || /^(?:javascript|mailto|tel):/i.test(href)) {
      continue;
    }

    try {
      const url = new URL(href, baseUrl);
      url.hash = "";
      links.push({
        url: url.toString(),
        text: normalizeText(htmlToText(match[2])),
        title: readAttr(attrs, "title")
      });
    } catch {
      // 非标准链接直接跳过。
    }
  }

  return links;
}

function extractPdfLinks(html, baseUrl) {
  const links = [];
  const attrPattern = /\b(?:href|pdfsrc)\s*=\s*(["'])(.*?)\1/gi;
  let match;

  while ((match = attrPattern.exec(html))) {
    const rawUrl = match[2];
    if (!/\.pdf(?:[?#].*)?$/i.test(rawUrl)) {
      continue;
    }

    try {
      const url = new URL(rawUrl, baseUrl);
      url.hash = "";
      links.push({
        url: url.toString(),
        text: inferNearbyText(html, match.index)
      });
    } catch {
      // 非标准 PDF 链接直接跳过。
    }
  }

  return uniqueBy(links, (link) => link.url);
}

function inferNearbyText(html, offset) {
  const start = Math.max(0, offset - 600);
  const end = Math.min(html.length, offset + 600);
  return normalizeText(htmlToText(html.slice(start, end)));
}

function readAttr(attrs, name) {
  const matched = attrs.match(new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return matched?.[2] ?? "";
}

function shouldFollow(link, depth, allowedHosts, options) {
  let parsed;
  try {
    parsed = new URL(link.url);
  } catch {
    return false;
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return false;
  }
  if (!isAllowedHost(parsed, allowedHosts)) {
    return false;
  }
  if (SKIP_LINK_RE.test(parsed.pathname)) {
    return false;
  }

  const haystack = `${link.url}\n${link.text}\n${link.title}`;
  return options.discoverAll || depth === 0 || containsAny(haystack, SYLLABUS_KEYWORDS);
}

async function crawlPdf(link, { pageTitle, pageText, fetchedAt, cookie, timeoutMs }) {
  const pdf = await fetchBinary(link.url, { cookie, timeoutMs });
  const text = await extractPdfText(pdf.buffer);

  if (!text) {
    throw new Error(`未能从 PDF 抽取文本：${pdf.url}`);
  }

  const title = normalizeText(
    [link.text, pageTitle]
      .filter(Boolean)
      .join(" / ")
  );

  return buildRecord({
    title,
    text,
    sourceUrl: pdf.url,
    requestedUrl: link.url,
    fetchedAt,
    contextText: pageText
  });
}

async function extractPdfText(buffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fudan-syllabus-"));
  const pdfPath = path.join(tempDir, "source.pdf");

  try {
    await fs.writeFile(pdfPath, buffer);

    const fromPdftotext = await tryPdftotext(pdfPath);
    if (fromPdftotext) {
      return fromPdftotext;
    }

    return await tryPythonPypdf(pdfPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function tryPdftotext(pdfPath) {
  try {
    const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30000
    });
    return normalizeText(stdout);
  } catch {
    return "";
  }
}

async function tryPythonPypdf(pdfPath) {
  const code = [
    "from pypdf import PdfReader",
    "import sys",
    "reader = PdfReader(sys.argv[1])",
    "print('\\n\\n'.join(page.extract_text() or '' for page in reader.pages))"
  ].join("\n");

  try {
    const { stdout } = await execFileAsync("python3", ["-c", code, pdfPath], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30000
    });
    return normalizeText(stdout);
  } catch {
    return "";
  }
}

function buildRecord({ title, text, sourceUrl, requestedUrl, fetchedAt, contextText = "" }) {
  const courseName = inferCourseName({ title, text, sourceUrl, contextText });
  const departmentName = inferDepartmentName({ title, text, sourceUrl, contextText });

  return {
    id: stableId(`${departmentName}\n${courseName}\n${sourceUrl}`),
    courseName,
    departmentName,
    title,
    sourceUrl,
    requestedUrl,
    fetchedAt,
    sourceType: "web",
    textLength: text.length,
    text
  };
}

async function fetchFdjwglLessonSearchLessons({ semesterId, cookie, timeoutMs, pageSize }) {
  const lessons = [];
  let page = 1;
  let totalPages = 1;
  let totalRows = 0;

  while (page <= totalPages) {
    const url = buildFdjwglLessonSearchUrl(semesterId, page, pageSize);
    const json = await fetchJson(url, {
      cookie,
      timeoutMs,
      referer: "https://fdjwgl.fudan.edu.cn/student/for-all/lesson-search"
    });
    const rows = Array.isArray(json?.data) ? json.data : [];
    const pageInfo = json?._page_ ?? {};

    lessons.push(...rows);
    totalRows = Number(pageInfo.totalRows ?? totalRows ?? rows.length);
    totalPages = Number(pageInfo.totalPages ?? totalPages);
    console.log(`fdjwgl 列表：第 ${page}/${totalPages} 页，累计 ${lessons.length}/${totalRows || "?"} 条`);

    if (!rows.length) {
      break;
    }
    page += 1;
  }

  return {
    lessons: uniqueBy(lessons, (lesson) => lesson.id),
    totalRows,
    pageCount: page - 1
  };
}

function buildFdjwglLessonSearchUrl(semesterId, page, pageSize) {
  const url = new URL(`https://fdjwgl.fudan.edu.cn/student/for-all/lesson-search/semester/${semesterId}/search/${semesterId}`);
  url.searchParams.set("teachingSyllabus", "1");
  url.searchParams.set("queryPage__", `${page},${pageSize}`);
  return url.toString();
}

function buildFdjwglSyllabusUrl(lessonId) {
  return `https://fdjwgl.fudan.edu.cn/student/for-all/lesson-search/teachingSyllabusInfo/${lessonId}`;
}

function buildFdjwglLessonSearchRecords(items, { semester, semesterId, sourceUrl, fetchedAt }) {
  const byLesson = new Map();

  for (const item of items) {
    const lesson = item.lesson;
    const courseName = cleanDataText(lesson.course?.nameZh ?? lesson.nameZh);
    if (!courseName) {
      continue;
    }

    const courseCode = cleanDataText(lesson.course?.code ?? lesson.courseCode ?? lesson.code);
    const lessonCode = cleanDataText(lesson.code);
    const departmentName = cleanDataText(lesson.openDepartment?.nameZh) || inferDepartmentFromCourseCode(courseCode);
    const teachers = extractFdjwglLessonTeachers(lesson, item.syllabus);
    const scheduleText = normalizeText(lesson.scheduleText?.dateTimePlacePersonText?.textZh ?? "");
    const syllabusText = normalizeText(item.syllabus?.text ?? "");
    const textParts = [
      "数据来源：复旦本科教务全校开课查询（筛选：有审核通过的教学大纲）",
      `列表接口：${sourceUrl}`,
      `大纲链接：${item.sourceUrl}`,
      `学期 ID：${semesterId}`,
      semester ? `学期：${semester}` : "",
      courseCode ? `课程代码：${courseCode}` : "",
      lessonCode ? `课程序号：${lessonCode}` : "",
      `课程名称：${courseName}`,
      `开课院系：${departmentName}`,
      lesson.course?.credits != null ? `学分：${lesson.course.credits}` : "",
      lesson.requiredPeriodInfo?.total != null ? `总学时：${lesson.requiredPeriodInfo.total}` : "",
      lesson.courseType?.nameZh ? `课程类别：${lesson.courseType.nameZh}` : "",
      lesson.course?.courseTableType?.nameZh ? `课程分类：${lesson.course.courseTableType.nameZh}` : "",
      lesson.course?.courseDifficultyLevel?.nameZh ? `课程层级：${lesson.course.courseDifficultyLevel.nameZh}` : "",
      lesson.course?.subjectClass?.nameZh ? `适用门类：${lesson.course.subjectClass.nameZh}` : "",
      lesson.course?.firstSubject?.nameZh ? `所属一级学科：${lesson.course.firstSubject.nameZh}` : "",
      lesson.teachLang?.nameZh ? `授课语言：${lesson.teachLang.nameZh}` : "",
      lesson.examMode?.nameZh ? `考核方式：${lesson.examMode.nameZh}` : "",
      lesson.compulsorys?.length ? `修读性质：${formatFdjwglCompulsorys(lesson.compulsorys)}` : "",
      lesson.stdCount != null || lesson.limitCount != null ? `实际/上限人数：${lesson.stdCount ?? ""}/${lesson.limitCount ?? ""}` : "",
      teachers.length ? `教师：${teachers.join("、")}` : "",
      lesson.remark ? `备注：${cleanDataText(lesson.remark)}` : "",
      scheduleText ? `时间地点：\n${scheduleText}` : "",
      syllabusText ? `教学大纲：\n${syllabusText}` : "教学大纲：详情页未能抽取正文"
    ];
    const text = normalizeText(textParts.filter(Boolean).join("\n"));

    byLesson.set(String(lesson.id), {
      id: stableId(`fdjwgl-syllabus\n${semesterId}\n${lesson.id}`),
      courseName,
      departmentName,
      title: `${courseName} - 复旦本科教务教学大纲`,
      sourceUrl: item.sourceUrl,
      requestedUrl: item.sourceUrl,
      fetchedAt,
      sourceType: "fdjwgl",
      code: courseCode,
      lessonCode,
      lessonId: lesson.id,
      teachers,
      semesters: semester ? [semester] : [],
      textLength: text.length,
      text
    });
  }

  return [...byLesson.values()];
}

function extractFdjwglLessonTeachers(lesson, syllabus) {
  const teachers = new Set();

  for (const item of lesson.teacherAssignmentList ?? []) {
    const name = cleanDataText(item.person?.nameZh ?? item.person?.nameEn);
    if (name) {
      teachers.add(name);
    }
  }
  for (const member of syllabus?.model?.memberList ?? []) {
    const name = cleanDataText(member.name ?? member.nameZh);
    if (name) {
      teachers.add(name);
    }
  }

  return [...teachers];
}

function formatFdjwglCompulsorys(values) {
  const map = {
    COMPULSORY: "必修",
    ELECTIVE: "选修"
  };
  return values.map((value) => map[value] ?? value).join("、");
}

function extractFdjwglSyllabus(html) {
  const model = extractFdjwglSyllabusModel(html);
  const modelText = model ? renderFdjwglSyllabusModel(model) : "";
  const fallbackText = normalizeText(htmlToText(extractMainHtml(html)));
  const text = modelText || fallbackText;

  if (!text || text.includes("无教学大纲数据")) {
    throw new Error("详情页未包含可抽取的教学大纲正文");
  }

  return {
    model,
    text
  };
}

function extractFdjwglSyllabusModel(html) {
  const marker = "let model =";
  const start = html.indexOf(marker);
  if (start < 0) {
    return null;
  }

  const braceStart = html.indexOf("{", start);
  if (braceStart < 0) {
    return null;
  }

  const literal = extractBalancedJavascriptObject(html, braceStart);
  if (!literal) {
    return null;
  }

  try {
    return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  } catch (error) {
    throw new Error(`教学大纲 model 解析失败：${error.message}`);
  }
}

function extractBalancedJavascriptObject(text, startIndex) {
  let quote = "";
  let escaped = false;
  let depth = 0;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function renderFdjwglSyllabusModel(model) {
  const paragraphs = model.structuredDocument?.paragraphs ?? [];
  const lines = [];

  for (const paragraph of paragraphs) {
    const mode = model.paragraphMode?.[paragraph.id] ?? "NORMAL";
    const body = renderFdjwglSyllabusParagraph(model, paragraph, mode);
    if (!body) {
      continue;
    }

    lines.push(`${formatSyllabusParagraphTitle(paragraph)}\n${body}`);
  }

  return normalizeText(lines.join("\n\n"));
}

function renderFdjwglSyllabusParagraph(model, paragraph, mode) {
  if (mode === "TEST_MODE") {
    return renderFdjwglExamGrades(model);
  }
  if (mode === "TEXTBOOK") {
    return renderFdjwglTextbooks(model);
  }
  if (mode === "TEACHER") {
    return renderFdjwglMembers(model);
  }
  if (mode === "CONTENT_REQUIREMENT") {
    return renderFdjwglContentRequirements(model);
  }
  if (mode === "OBJECTIVE") {
    return renderFdjwglObjectives(model) || normalizeText(htmlToText(paragraph.contentZh ?? ""));
  }
  if (mode === "FILE") {
    return renderFdjwglFiles(model, paragraph.id);
  }

  return normalizeText(htmlToText(paragraph.contentZh ?? paragraph.contentEn ?? ""));
}

function formatSyllabusParagraphTitle(paragraph) {
  return cleanDataText([paragraph.titleZh, paragraph.titleEn].filter(Boolean).join(" / "));
}

function renderFdjwglExamGrades(model) {
  const lines = [];
  if (model.gradeCalcRule) {
    lines.push(`总评计算规则：${normalizeText(htmlToText(String(model.gradeCalcRule)))}`);
  }

  for (const item of model.examGradeList ?? []) {
    const parts = [
      cleanDataText(item.criteria),
      item.percentage != null ? `权重 ${item.percentage}%` : "",
      item.standard ? `评定标准：${normalizeText(htmlToText(String(item.standard)))}` : ""
    ].filter(Boolean);

    if (parts.length) {
      lines.push(`- ${parts.join("；")}`);
    }
  }

  return normalizeText(lines.join("\n"));
}

function renderFdjwglTextbooks(model) {
  const lines = [];
  for (const [index, item] of (model.textbookList ?? []).entries()) {
    const parts = [
      item.name ?? item.nameZh,
      item.author ? `作者：${item.author}` : "",
      item.isbn ? `ISBN：${item.isbn}` : "",
      item.publishingHouse ? `出版社：${item.publishingHouse}` : "",
      item.date ?? item.dateStr ? `出版日期：${item.date ?? item.dateStr}` : ""
    ].filter(Boolean);

    if (parts.length) {
      lines.push(`教材 ${index + 1}：${parts.join("；")}`);
    }

    for (const [refIndex, ref] of (item.referenceTextbooks ?? []).entries()) {
      const refParts = [
        ref.name ?? ref.nameZh,
        ref.author ? `作者：${ref.author}` : "",
        ref.isbn ? `ISBN：${ref.isbn}` : "",
        ref.publishingHouse ? `出版社：${ref.publishingHouse}` : "",
        ref.date ?? ref.dateStr ? `出版日期：${ref.date ?? ref.dateStr}` : ""
      ].filter(Boolean);
      if (refParts.length) {
        lines.push(`参考书 ${refIndex + 1}：${refParts.join("；")}`);
      }
    }
  }

  return normalizeText(lines.join("\n"));
}

function renderFdjwglMembers(model) {
  const lines = [];
  for (const member of model.memberList ?? []) {
    const parts = [
      cleanDataText(member.name ?? member.nameZh),
      member.title ? `职称：${cleanDataText(member.title)}` : "",
      member.department ? `院系：${cleanDataText(member.department)}` : "",
      member.teachingContent ? `职责：${cleanDataText(member.teachingContent)}` : "",
      member.email ? `邮箱：${cleanDataText(member.email)}` : "",
      member.profileHomepage ? `主页：${cleanDataText(member.profileHomepage)}` : ""
    ].filter(Boolean);

    if (parts.length) {
      lines.push(`- ${parts.join("；")}`);
    }
  }

  return normalizeText(lines.join("\n"));
}

function renderFdjwglContentRequirements(model) {
  const lines = [];
  for (const item of model.contentRequirementList ?? []) {
    const parts = [
      item.courseTimes != null ? `课次 ${item.courseTimes}` : "",
      item.contentZh ? `教学内容：${normalizeText(htmlToText(String(item.contentZh)))}` : "",
      item.requirementZh ? `教学要求：${normalizeText(htmlToText(String(item.requirementZh)))}` : "",
      item.periods != null ? `学时：${item.periods}` : ""
    ].filter(Boolean);

    if (parts.length) {
      lines.push(`- ${parts.join("；")}`);
    }
  }

  return normalizeText(lines.join("\n"));
}

function renderFdjwglObjectives(model) {
  const lines = [];
  for (const [index, item] of (model.objectiveList ?? []).entries()) {
    const content = normalizeText(htmlToText(String(item.contentZh ?? item.contentEn ?? item.content ?? "")));
    if (content) {
      lines.push(`CO${index + 1}：${content}`);
    }
  }
  return normalizeText(lines.join("\n"));
}

function renderFdjwglFiles(model, paragraphId) {
  const lines = [];
  for (const item of model.courseSyllabusParagraphFileVms ?? []) {
    if (paragraphId && item.paragraphId !== paragraphId) {
      continue;
    }
    const fileInfo = item.fileInfo;
    if (fileInfo?.name) {
      lines.push(`附件：${fileInfo.name}`);
    }
  }
  return normalizeText(lines.join("\n"));
}

function buildFdjwglRecords(activities, { semester, semesterId, sourceUrl, fetchedAt }) {
  const byCourse = new Map();

  for (const activity of activities) {
    const courseName = cleanDataText(activity.courseName);
    if (!courseName) {
      continue;
    }

    const courseCode = cleanDataText(activity.courseCode || activity.lessonCode);
    const departmentName = inferDepartmentFromCourseCode(courseCode);
    const key = `${departmentName}\n${courseName}`;
    const current = byCourse.get(key) ?? {
      courseName,
      departmentName,
      code: courseCode,
      teachers: new Set(),
      semesters: new Set(),
      rooms: new Set(),
      campuses: new Set(),
      courseTypes: new Set(),
      credits: new Set(),
      periods: new Set(),
      examples: []
    };

    for (const teacher of activity.teachers ?? []) {
      current.teachers.add(cleanDataText(teacher));
    }
    if (semester) {
      current.semesters.add(semester);
    }
    if (activity.room) {
      current.rooms.add(cleanDataText(activity.room));
    }
    if (activity.campus) {
      current.campuses.add(cleanDataText(activity.campus));
    }
    if (activity.courseType?.nameZh || activity.courseType?.name) {
      current.courseTypes.add(cleanDataText(activity.courseType.nameZh ?? activity.courseType.name));
    }
    if (activity.credits != null) {
      current.credits.add(String(activity.credits));
    }
    if (activity.periodInfo?.total != null) {
      current.periods.add(`总学时 ${activity.periodInfo.total}`);
    }
    if (current.examples.length < 3) {
      current.examples.push(formatFdjwglActivity(activity));
    }

    byCourse.set(key, current);
  }

  return [...byCourse.values()].map((course) => {
    const teachers = [...course.teachers].filter(Boolean);
    const semesters = [...course.semesters].filter(Boolean);
    const description = normalizeText([
      "数据来源：Danxi 参考的复旦本科教务课程表接口",
      `接口：${sourceUrl}`,
      `学期 ID：${semesterId}`,
      course.code ? `课程代码：${course.code}` : "",
      course.courseTypes.size ? `课程类别：${[...course.courseTypes].join("、")}` : "",
      course.credits.size ? `学分：${[...course.credits].join("、")}` : "",
      course.periods.size ? `学时：${[...course.periods].join("、")}` : "",
      teachers.length ? `教师：${teachers.join("、")}` : "",
      course.campuses.size ? `校区：${[...course.campuses].join("、")}` : "",
      course.rooms.size ? `教室：${[...course.rooms].join("、")}` : "",
      semesters.length ? `学期：${semesters.join("、")}` : "",
      course.examples.length ? `排课样例：\n${course.examples.join("\n")}` : ""
    ].filter(Boolean).join("\n"));

    return {
      id: stableId(`fdjwgl\n${course.departmentName}\n${course.courseName}\n${course.code}`),
      courseName: course.courseName,
      departmentName: course.departmentName,
      title: `${course.courseName} - 复旦本科教务`,
      sourceUrl,
      requestedUrl: sourceUrl,
      fetchedAt,
      sourceType: "fdjwgl",
      code: course.code,
      teachers,
      semesters,
      textLength: description.length,
      text: description
    };
  });
}

function parseFdjwglSemesterInfo(html) {
  const optionPattern = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
  const options = [];
  let match;

  while ((match = optionPattern.exec(html))) {
    const value = readAttr(match[1], "value");
    if (!/^\d+$/.test(value)) {
      continue;
    }
    const text = normalizeText(htmlToText(match[2]));
    const selected = /\bselected\b/i.test(match[1]);
    options.push({ value, text, selected });
  }

  const selected = options.find((option) => option.selected) ?? inferCurrentFdjwglOption(options) ?? options[0];
  const scriptMatch = html.match(/['"]id['"]\s*:\s*["']?(\d{3,})["']?/);

  return {
    currentSemesterId: selected?.value ?? scriptMatch?.[1] ?? "",
    currentSemester: normalizeSemesterText(selected?.text ?? "")
  };
}

function normalizeSemesterText(text) {
  const normalizedMatch = text.match(/(\d{4})\s*[-—－]\s*(\d{4})\s*[-—－]\s*([12])/);
  if (normalizedMatch) {
    return `${normalizedMatch[1]}-${normalizedMatch[2]}-${normalizedMatch[3]}`;
  }

  const yearMatch = text.match(/(\d{4})\s*[-—－]\s*(\d{4})/);
  if (!yearMatch) {
    return text.trim();
  }

  const term = text.includes("2学期") || text.includes("第二") ? "2" : "1";
  return `${yearMatch[1]}-${yearMatch[2]}-${term}`;
}

function inferCurrentFdjwglOption(options) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const academicStartYear = month >= 8 ? year : year - 1;
  const term = month >= 8 || month <= 1 ? "1" : "2";
  const expected = `${academicStartYear}-${academicStartYear + 1}-${term}`;

  return options.find((option) => normalizeSemesterText(option.text) === expected);
}

function formatFdjwglActivity(activity) {
  const weekday = activity.weekday ? `周${activity.weekday}` : "";
  const unit = activity.startUnit && activity.endUnit ? `${activity.startUnit}-${activity.endUnit}节` : "";
  const weeks = activity.weeksStr ? `${activity.weeksStr}` : "";
  const room = activity.room ? cleanDataText(activity.room) : "";
  return `- ${[weekday, unit, weeks, room].filter(Boolean).join(" ")}`;
}

function inferDepartmentFromCourseCode(code) {
  const prefix = String(code ?? "").match(/^[A-Za-z]+/)?.[0]?.toUpperCase() ?? "";
  const map = {
    CHIN: "中国语言文学系",
    COMP: "计算机科学技术学院",
    CS: "计算机科学技术学院",
    DATA: "大数据学院",
    ECON: "经济学院",
    ENGL: "外国语言文学学院",
    FINA: "经济学院",
    HIST: "历史学系",
    MATH: "数学科学学院",
    PHIL: "哲学学院",
    PHYS: "物理学系",
    POLI: "国际关系与公共事务学院",
    PSYC: "社会发展与公共政策学院",
    SOCI: "社会发展与公共政策学院",
    STAT: "数学科学学院"
  };
  return map[prefix] ?? "复旦大学";
}

function splitTeachers(value) {
  return cleanDataText(value)
    .split(/[、,，/;；]+/)
    .map(cleanTeacherName)
    .filter(Boolean);
}

function cleanTeacherName(value) {
  return cleanDataText(value)
    .replace(/^(?:教师|任课教师|授课教师|主讲教师)\s*[：:]\s*/u, "")
    .replace(/\s+(?:教授|副教授|讲师|助教|研究员|特聘教授|其他)$/u, "")
    .trim();
}

function extractCourseFields(text) {
  const fields = {};
  const sourceText = String(text ?? "");
  let match;

  COURSE_FIELD_LINE_RE.lastIndex = 0;
  while ((match = COURSE_FIELD_LINE_RE.exec(sourceText))) {
    const label = match[1];
    const value = cleanDataText(match[2]);
    if (!value) {
      continue;
    }

    if (label === "课程名称") {
      fields.courseName = value;
    } else if (label === "开课院系" || label === "院系" || label === "部门") {
      fields.departmentName = value;
    } else if (["教师", "任课教师", "授课教师", "主讲教师"].includes(label)) {
      fields.teachers = splitTeachers(value);
    } else if (label === "学期") {
      fields.semesters = splitSemesterValues(value);
    } else if (label === "课程代码") {
      fields.code = value;
    } else if (label === "课程序号") {
      fields.lessonCode = value;
    } else if (label === "学期 ID") {
      fields.semesterId = value;
    } else {
      fields[normalizeCourseFieldKey(label)] = value;
    }
  }

  return fields;
}

function splitSemesterValues(value) {
  return cleanDataText(value)
    .split(/[、,，/;；]+/)
    .map(normalizeSemesterText)
    .filter((semester) => /^\d{4}-\d{4}-[12]$/.test(semester));
}

function normalizeCourseFieldKey(label) {
  const map = {
    学分: "credits",
    总学时: "totalPeriods",
    课程类别: "courseCategory",
    课程分类: "courseType",
    课程层级: "courseLevel",
    适用门类: "subjectClass",
    所属一级学科: "firstSubject",
    授课语言: "teachLang",
    考核方式: "examMode",
    "实际/上限人数": "capacity",
    备注: "remark"
  };
  return map[label] ?? label;
}

function normalizeRecordFields(record, descriptionMaxChars = 20000) {
  const text = normalizeText(record.text ?? record.description ?? "");
  const extracted = extractCourseFields(text);
  const courseName = cleanDataText(record.courseName) || extracted.courseName || "";
  const departmentName =
    cleanDataText(record.departmentName) ||
    extracted.departmentName ||
    inferDepartmentFromCourseCode(record.code ?? extracted.code) ||
    "";
  const teachers = unique([
    ...(Array.isArray(record.teachers) ? record.teachers.map(cleanTeacherName) : []),
    ...(extracted.teachers ?? [])
  ].filter(Boolean));
  const semesters = unique([
    ...(Array.isArray(record.semesters) ? record.semesters.map(normalizeSemesterText) : []),
    ...(extracted.semesters ?? [])
  ].filter((semester) => /^\d{4}-\d{4}-[12]$/.test(semester)));
  const sourceType = cleanDataText(record.sourceType) || "json";
  const sourceUrl = cleanDataText(record.sourceUrl ?? record.requestedUrl);
  const fetchedAt = cleanDataText(record.fetchedAt) || new Date().toISOString();
  const normalizedText = text || normalizeText(Object.entries(extracted).map(([key, value]) => `${key}：${value}`).join("\n"));

  return {
    ...record,
    ...extracted,
    courseName,
    departmentName,
    title: cleanDataText(record.title) || (courseName ? `${courseName} - 课程数据` : "课程数据"),
    sourceUrl,
    requestedUrl: cleanDataText(record.requestedUrl) || sourceUrl,
    fetchedAt,
    sourceType,
    code: cleanDataText(record.code) || extracted.code || "",
    lessonCode: cleanDataText(record.lessonCode) || extracted.lessonCode || "",
    teachers,
    semesters,
    textLength: normalizedText.length,
    text: normalizedText,
    description: buildDescription(
      {
        ...record,
        courseName,
        departmentName,
        title: cleanDataText(record.title) || (courseName ? `${courseName} - 课程数据` : "课程数据"),
        sourceUrl,
        fetchedAt,
        sourceType,
        text: normalizedText
      },
      descriptionMaxChars
    )
  };
}

function cleanDataText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSyllabusLike(record, minTextChars) {
  if (record.text.length < minTextChars) {
    return false;
  }

  const lead = `${record.title}\n${record.sourceUrl}\n${record.text.slice(0, 2000)}`;
  const hasKeyword = containsAny(lead, SYLLABUS_KEYWORDS);
  const signalCount = SYLLABUS_SIGNALS.filter((signal) => record.text.includes(signal)).length;
  return hasKeyword || signalCount >= 3;
}

function containsAny(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function inferCourseName({ title, text, sourceUrl, contextText = "" }) {
  const snippets = [title, text.slice(0, 800), contextText.slice(0, 800)];

  for (const snippet of snippets) {
    const quoted = [...snippet.matchAll(/《([^》]{2,80})》/g)]
      .map((match) => cleanCourseName(match[1]))
      .find((name) => name && !/教学大纲|课程大纲|Course Syllabus/i.test(name));
    if (quoted) {
      return quoted;
    }
  }

  const titleParts = title
    .split(/[\/｜|\-–—－_]/)
    .map(cleanCourseName)
    .filter((part) => part && !/复旦大学|教学大纲|课程大纲|精品课程|学院|首页/.test(part));

  if (titleParts.length) {
    return titleParts.at(-1);
  }

  const url = new URL(sourceUrl);
  if (url.hostname.includes("gdds")) {
    return "高等代数";
  }
  if (url.pathname.includes("/anal/")) {
    return "数学分析";
  }
  if (url.pathname.includes("/gdsx/")) {
    return "高等数学";
  }

  const firstLine = cleanCourseName(text.split("\n").find((line) => line.length >= 2 && line.length <= 80) ?? "");
  return firstLine || `复旦课程-${stableId(sourceUrl).slice(0, 8)}`;
}

function cleanCourseName(name) {
  return name
    .replace(/\(.*?Course Syllabus.*?\)/gi, "")
    .replace(/教学大纲|课程大纲|精品课程|复旦大学|核心课程|课程网站|网站/g, "")
    .replace(/^[\s:：\-－]+|[\s:：\-－]+$/g, "")
    .trim();
}

function inferDepartmentName({ title, text, sourceUrl, contextText = "" }) {
  const url = new URL(sourceUrl);
  const haystack = `${title}\n${text.slice(0, 1000)}\n${contextText.slice(0, 1000)}`;

  if (url.hostname.includes("math") || url.hostname.includes("gdds") || haystack.includes("数学科学学院")) {
    return "数学科学学院";
  }
  if (url.hostname.includes("gecc") || haystack.includes("通识教育")) {
    return "通识教育中心";
  }

  const matched = haystack.match(/复旦大学([^。\n]{2,30}(?:学院|中心|系|书院))/);
  return matched?.[1] ?? "复旦大学";
}

function dedupeRecords(records, descriptionMaxChars) {
  const byCourse = new Map();

  for (const rawRecord of records) {
    const record = normalizeRecordFields(rawRecord, descriptionMaxChars);
    if (!record.courseName || !record.departmentName) {
      continue;
    }

    const key = `${record.departmentName}\n${record.courseName}`;
    const current = byCourse.get(key);
    if (!current) {
      byCourse.set(key, {
        ...record,
        description: record.description || buildDescription(record, descriptionMaxChars)
      });
    } else {
      const base =
        record.textLength > current.textLength
          ? {
              ...record,
              description: record.description || buildDescription(record, descriptionMaxChars)
            }
          : current;
      byCourse.set(key, {
        ...base,
        teachers: unique([...(current.teachers ?? []), ...(record.teachers ?? [])]),
        semesters: unique([...(current.semesters ?? []), ...(record.semesters ?? [])])
      });
    }
  }

  return [...byCourse.values()].sort((a, b) => {
    const depCompare = a.departmentName.localeCompare(b.departmentName, "zh-CN");
    return depCompare || a.courseName.localeCompare(b.courseName, "zh-CN");
  });
}

function buildDescription(record, maxChars) {
  const fields = extractCourseFields(record.text);
  const intro = extractCourseIntro(record.text);
  const courseName = cleanDataText(record.courseName) || fields.courseName || "课程信息";
  const limit = Number.isFinite(maxChars) && maxChars > 0 ? maxChars : 1200;

  if (!intro || intro.length > limit) {
    return courseName;
  }

  return intro;
}

function extractCourseIntro(text) {
  const sourceText = String(text ?? "");
  const startMatch = COURSE_INTRO_START_RE.exec(sourceText);
  if (!startMatch) {
    return "";
  }

  const start = startMatch.index + startMatch[0].length;
  const tail = sourceText.slice(start);
  const endIndexes = COURSE_INTRO_END_RES
    .map((pattern) => pattern.exec(tail)?.index ?? -1)
    .filter((index) => index >= 0);
  const end = endIndexes.length ? Math.min(...endIndexes) : tail.length;
  return normalizeText(tail.slice(0, end)).replace(/^课程简介\s*[：:]\s*/u, "");
}

async function readRecordsFromJson(options) {
  const inputPath = path.resolve(options.inputJson);
  const json = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const rawRecords = Array.isArray(json) ? json : json.records ?? json.data;

  if (!Array.isArray(rawRecords)) {
    throw new Error(`课程 JSON 必须是数组，或包含 records/data 数组：${inputPath}`);
  }

  const records = dedupeRecords(rawRecords, options.descriptionMaxChars);
  return {
    records,
    failures: [],
    pdfFailures: [],
    visitedCount: 0,
    allowedHosts: [],
    sourceReports: [
      {
        source: "json",
        inputPath,
        rawRecordCount: rawRecords.length,
        recordCount: records.length,
        fieldRegex: COURSE_FIELD_LINE_RE.source
      }
    ]
  };
}

function stableId(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function uniqueBy(items, key) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const value = key(item);
    if (!seen.has(value)) {
      seen.add(value);
      result.push(item);
    }
  }

  return result;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;
  const workerCount = Math.min(concurrency, items.length);

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      completed += 1;

      if (completed % 50 === 0 || completed === items.length) {
        console.log(`fdjwgl 详情：已处理 ${completed}/${items.length} 条`);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function writeOutputs(result, options) {
  await fs.mkdir(options.outDir, { recursive: true });

  const jsonPath = path.join(options.outDir, "fudan-syllabus.json");
  const sqlPath = path.join(options.outDir, "fudan-course-upsert.sql");
  const reportPath = path.join(options.outDir, "crawl-report.json");

  await fs.writeFile(jsonPath, `${JSON.stringify(result.records, null, 2)}\n`, "utf8");
  await fs.writeFile(sqlPath, renderSql(result.records), "utf8");
  await fs.writeFile(
    reportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        visitedCount: result.visitedCount,
        recordCount: result.records.length,
        allowedHosts: result.allowedHosts,
        sourceReports: result.sourceReports,
        failures: result.failures,
        pdfFailures: result.pdfFailures
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return { jsonPath, sqlPath, reportPath };
}

function renderSql(records) {
  const statements = [
    "-- 由 scripts/crawl-fudan-syllabus.mjs 生成",
    "-- 可重复执行：按院系与课程名 upsert 到 Department / Course，并尽量补充 Teacher / Teaching",
    "BEGIN;"
  ];

  for (const record of records) {
    statements.push(`
WITH dept AS (
  INSERT INTO Department (dep_name, description)
  VALUES (${sqlLiteral(record.departmentName)}, ${sqlLiteral("由复旦教学大纲抓取脚本自动补充。")})
  ON CONFLICT (dep_name)
  DO UPDATE SET description = COALESCE(Department.description, EXCLUDED.description)
  RETURNING dep_id
), course_row AS (
  INSERT INTO Course (course_name, dep_id, description)
  SELECT ${sqlLiteral(record.courseName)}, dept.dep_id, ${sqlLiteral(record.description)}
  FROM dept
  ON CONFLICT (course_name, dep_id)
  DO UPDATE SET description = EXCLUDED.description
  RETURNING course_id, dep_id
)
SELECT course_id FROM course_row;`.trim());

    for (const teacher of record.teachers ?? []) {
      for (const semester of record.semesters ?? []) {
        statements.push(`
WITH dept AS (
  SELECT dep_id FROM Department WHERE dep_name = ${sqlLiteral(record.departmentName)}
), course_row AS (
  SELECT c.course_id
  FROM Course c
  JOIN dept d ON d.dep_id = c.dep_id
  WHERE c.course_name = ${sqlLiteral(record.courseName)}
), existing_teacher AS (
  SELECT t.people_id
  FROM Teacher t
  JOIN People p ON p.people_id = t.people_id
  JOIN dept d ON d.dep_id = t.dept_id
  WHERE p.name = ${sqlLiteral(teacher)}
  ORDER BY t.people_id
  LIMIT 1
), inserted_person AS (
  INSERT INTO People (name, gender, phone, email)
  SELECT ${sqlLiteral(teacher)}, 'O', NULL, NULL
  WHERE NOT EXISTS (SELECT 1 FROM existing_teacher)
  RETURNING people_id
), person_row AS (
  SELECT people_id FROM existing_teacher
  UNION ALL
  SELECT people_id FROM inserted_person
  LIMIT 1
), teacher_row AS (
  INSERT INTO Teacher (people_id, staff_no, title, dept_id)
  SELECT person_row.people_id,
         ${sqlLiteral(`CR${stableId(`${record.departmentName}-${teacher}`).slice(0, 10).toUpperCase()}`)},
         '其他',
         dept.dep_id
  FROM person_row, dept
  ON CONFLICT (people_id)
  DO UPDATE SET dept_id = EXCLUDED.dept_id
  RETURNING people_id
)
INSERT INTO Teaching (teacher_id, course_id, semester)
SELECT teacher_row.people_id, course_row.course_id, ${sqlLiteral(semester)}
FROM teacher_row, course_row
ON CONFLICT (teacher_id, course_id, semester) DO NOTHING;`.trim());
      }
    }
  }

  statements.push("COMMIT;", "");
  return statements.join("\n\n");
}

function sqlLiteral(value) {
  if (value == null) {
    return "NULL";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function importToDb(records) {
  const pg = await import("pg");
  const { Pool } = pg.default;
  const pool = new Pool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "dbh_pj_lab5",
    user: process.env.DB_USER ?? process.env.USER,
    password: process.env.DB_PASSWORD ?? ""
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    for (const record of records) {
      const dept = await client.query(
        `
          INSERT INTO Department (dep_name, description)
          VALUES ($1, $2)
          ON CONFLICT (dep_name)
          DO UPDATE SET description = COALESCE(Department.description, EXCLUDED.description)
          RETURNING dep_id
        `,
        [record.departmentName, "由复旦教学大纲抓取脚本自动补充。"]
      );

      await client.query(
        `
          INSERT INTO Course (course_name, dep_id, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (course_name, dep_id)
          DO UPDATE SET description = EXCLUDED.description
          RETURNING course_id
        `,
        [record.courseName, dept.rows[0].dep_id, record.description]
      );

      const course = await client.query(
        "SELECT course_id FROM Course WHERE course_name = $1 AND dep_id = $2",
        [record.courseName, dept.rows[0].dep_id]
      );

      for (const teacherName of record.teachers ?? []) {
        const staffNo = `CR${stableId(`${record.departmentName}-${teacherName}`).slice(0, 10).toUpperCase()}`;
        const existingTeacher = await client.query(
          `
            SELECT t.people_id
            FROM Teacher t
            JOIN People p ON p.people_id = t.people_id
            WHERE p.name = $1 AND t.dept_id = $2
            ORDER BY t.people_id
            LIMIT 1
          `,
          [teacherName, dept.rows[0].dep_id]
        );
        const person =
          existingTeacher.rows[0] ??
          (
            await client.query(
              `
                INSERT INTO People (name, gender, phone, email)
                VALUES ($1, 'O', NULL, NULL)
                RETURNING people_id
              `,
              [teacherName]
            )
          ).rows[0];

        await client.query(
          `
            INSERT INTO Teacher (people_id, staff_no, title, dept_id)
            VALUES ($1, $2, '其他', $3)
            ON CONFLICT (people_id)
            DO UPDATE SET dept_id = EXCLUDED.dept_id
          `,
          [person.people_id, staffNo, dept.rows[0].dep_id]
        );

        for (const semester of record.semesters ?? []) {
          await client.query(
            `
              INSERT INTO Teaching (teacher_id, course_id, semester)
              VALUES ($1, $2, $3)
              ON CONFLICT (teacher_id, course_id, semester) DO NOTHING
            `,
            [person.people_id, course.rows[0].course_id, semester]
          );
        }
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  let result;
  if (options.inputJson) {
    result = await readRecordsFromJson(options);
  } else {
    const results = [];
    for (const source of options.sources) {
      if (source === "web") {
        results.push(await crawlWeb(options));
      } else if (source === "fdjwgl") {
        results.push(await crawlFdjwgl(options));
      }
    }
    result = combineResults(results, options);
  }

  const output = await writeOutputs(result, options);

  if (options.importDb) {
    await importToDb(result.records);
    console.log(`已写入数据库：${result.records.length} 门课程`);
  }

  const sourceLabel = options.inputJson ? `json:${path.resolve(options.inputJson)}` : options.sources.join("、");
  console.log(`完成：数据源 ${sourceLabel}，访问 ${result.visitedCount} 次，收录 ${result.records.length} 门课程`);
  console.log(`JSON：${output.jsonPath}`);
  console.log(`SQL：${output.sqlPath}`);
  console.log(`报告：${output.reportPath}`);

  if (result.failures.length) {
    console.log(`失败页面：${result.failures.length} 个，详见 crawl-report.json`);
  }
  if (result.pdfFailures.length) {
    console.log(`PDF 失败：${result.pdfFailures.length} 个，安装 pdftotext 后可重试`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
