import "dotenv/config";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { z } from "zod";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "96kb" }));
app.use("/api/chat", rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many questions in a short time. Please wait a minute and try again." } }));

app.get("/api/health", (_req, res) => {
  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push("Gemini");
  if (process.env.GROQ_API_KEY) providers.push("Groq");
  res.json({ ok: true, configured: providers.length > 0, providers });
});

const requestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).min(1).max(18),
  lesson: z.object({
    title: z.string().max(160), summary: z.string().max(1200), use: z.string().max(600),
    time: z.string().max(80), space: z.string().max(80),
  }),
  graph: z.object({ step: z.string().max(500), label: z.string().max(80), value: z.string().max(500) }).optional(),
  studentGraph: z.object({
    nodes: z.array(z.string().min(1).max(32)).min(1).max(24),
    edges: z.array(z.object({ from: z.string().min(1).max(32), to: z.string().min(1).max(32), weight: z.number().finite().min(-1_000_000).max(1_000_000) })).max(80),
    directed: z.boolean(), start: z.string().min(1).max(32), algorithm: z.enum(["dijkstra"]).nullable(),
    traceSummary: z.string().max(12_000).optional(),
  }).optional(),
});
const systemInstruction = `You are the Group 4 study tutor, a patient guide for an undergraduate Algorithms and Complexity course.
Explain clearly in short steps, with concrete examples. Match the student's level; ask a guiding question when that helps them learn.
Use the provided lesson and graph state as the source of truth. Distinguish a graph's actual computed result from intuition. Never invent graph node values or claim a trace state that isn't in context.
When a student supplies a graph, use exactly its vertices, edges, direction, weights, and start vertex, and prioritize it over the lesson's sample graph for that question. Never invent missing edges or weights. Dijkstra requires non-negative weights; for negative weights, recommend Bellman–Ford. If an app-computed Dijkstra trace is provided, use it as the source of truth and explain its steps without changing the result.
The current lesson, its complexity, suggested use, and graph step are provided as context. You can compare graph algorithms when asked. Use plain text and readable line breaks; avoid unnecessary markdown tables.`;
function contextMessages(body) {
  const { lesson, graph, studentGraph } = body;
  const context = [
    `CURRENT LESSON: ${lesson.title}`,
    `OVERVIEW: ${lesson.summary}`,
    `WHEN TO USE: ${lesson.use}`,
    `TIME COMPLEXITY: ${lesson.time}; SPACE COMPLEXITY: ${lesson.space}`,
    graph ? `CURRENT GRAPH TRACE STEP: ${graph.step}; ${graph.label}: ${graph.value}` : "This lesson has no active graph trace.",
    studentGraph ? `STUDENT GRAPH: vertices ${studentGraph.nodes.join(", ")}; ${studentGraph.directed ? "directed" : "undirected"}; start at ${studentGraph.start}.` : "No student-supplied graph is active.",
    studentGraph ? `STUDENT GRAPH EDGES: ${studentGraph.edges.map(edge => `${edge.from} ${studentGraph.directed ? "→" : "—"} ${edge.to} (weight ${edge.weight})`).join(", ") || "none supplied"}.` : "",
    studentGraph?.traceSummary ? `APP-COMPUTED DIJKSTRA TRACE (authoritative):\n${studentGraph.traceSummary}` : "",
  ].join("\n");
  const messages = body.messages.map(({ role, content }) => ({ role, content }));
  const firstUser = messages.findIndex(m => m.role === "user");
  if (firstUser >= 0) messages[firstUser] = { ...messages[firstUser], content: `[Lesson context]\n${context}\n\n[Student question]\n${messages[firstUser].content}` };
  return messages;
}
function failureStatus(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.httpStatusCode ?? error?.error?.code);
  if (Number.isFinite(status) && status >= 400) return status;
  const message = String(error?.message ?? "");
  if (/429|rate.?limit|quota|resource_exhausted/i.test(message)) return 429;
  if (/timed out|timeout|ECONNRESET|ENOTFOUND|fetch failed/i.test(message)) return 503;
  return 502;
}
function shouldFallback(status) { return status === 401 || status === 403 || status === 408 || status === 409 || status === 429 || status >= 500; }
async function callGemini(messages) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 20_000 } });
  const contents = messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  while (contents[0]?.role === "model") contents.shift();
  const result = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    contents,
    config: { systemInstruction, maxOutputTokens: 900, temperature: 0.55 },
  });
  const text = result.text?.trim();
  if (!text) throw Object.assign(new Error("Provider returned an empty answer"), { status: 502 });
  return text;
}
async function callGroq(messages) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20_000, maxRetries: 0 });
  const result = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [{ role: "system", content: systemInstruction }, ...messages],
    max_completion_tokens: 900,
    temperature: 0.55,
  });
  const text = result.choices?.[0]?.message?.content?.trim();
  if (!text) throw Object.assign(new Error("Provider returned an empty answer"), { status: 502 });
  return text;
}
const providers = [
  { name: "Gemini", key: "GEMINI_API_KEY", call: callGemini },
  { name: "Groq", key: "GROQ_API_KEY", call: callGroq },
];
app.post("/api/chat", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the message and try again." });
  const active = providers.filter(provider => process.env[provider.key]);
  if (!active.length) return res.status(503).json({ error: "The AI tutor is not configured yet. Add at least one provider key to the project's .env file and restart the app." });
  const messages = contextMessages(parsed.data);
  const failures = [];
  for (let i = 0; i < active.length; i++) {
    const provider = active[i];
    try {
      const reply = await provider.call(messages);
      return res.json({ reply, provider: provider.name, fallback: i > 0 });
    } catch (error) {
      const status = failureStatus(error);
      console.error(`[${provider.name}] tutor request failed (HTTP ${status}).`);
      failures.push({ provider: provider.name, status });
      if (!shouldFallback(status)) break;
    }
  }
  const rateLimited = failures.some(f => f.status === 429);
  const serviceUnavailable = failures.some(f => f.status >= 500 || f.status === 408);
  if (rateLimited && failures.length === active.length && failures.every(f => f.status === 429)) return res.status(429).json({ error: "The configured tutors have reached their request limits. Please wait a little and try again." });
  return res.status(503).json({ error: "The AI tutor is temporarily unavailable. Please try again shortly." });
});
const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(resolve(clientDist, "index.html")));
}
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "That message is too long. Please shorten it and try again." });
  console.error("Request error:", error?.message || "unknown");
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
app.listen(port, host, () => console.log(`Graphite API ready at http://${host}:${port}`));

