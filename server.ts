import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const REQUIRE_TMA = process.env.REQUIRE_TMA === "true";
const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60; // 24h

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// ─── Telegram initData HMAC validation ─────────────────────────────────────
// Verifies the initData string sent from the Mini App against the bot token.
// See https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function verifyTelegramInitData(initData: string, botToken: string): { ok: boolean; userId?: number; reason?: string } {
  if (!initData) return { ok: false, reason: "empty" };
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no_hash" };
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computed !== hash) return { ok: false, reason: "bad_hash" };

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Number.isNaN(authDate)) return { ok: false, reason: "no_auth_date" };
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec > INIT_DATA_MAX_AGE_SEC) return { ok: false, reason: "expired" };

  let userId: number | undefined;
  try {
    const userJson = params.get("user");
    if (userJson) userId = JSON.parse(userJson).id;
  } catch {
    // user payload is optional for our purposes
  }
  return { ok: true, userId };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tgUserId?: number;
    }
  }
}

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  // If we don't have a bot token configured, we can't validate. Allow through
  // unless REQUIRE_TMA=true is set explicitly (e.g. in production).
  if (!BOT_TOKEN) {
    if (REQUIRE_TMA) {
      return res.status(503).json({ success: false, error: "Server is not configured for Telegram (missing TELEGRAM_BOT_TOKEN)." });
    }
    return next();
  }

  const initData =
    (req.header("x-telegram-init-data") as string | undefined) ||
    (req.body && typeof req.body === "object" ? (req.body.initData as string | undefined) : undefined);

  if (!initData) {
    if (REQUIRE_TMA) {
      return res.status(401).json({ success: false, error: "Missing Telegram initData." });
    }
    return next();
  }

  const result = verifyTelegramInitData(initData, BOT_TOKEN);
  if (!result.ok) {
    return res.status(401).json({ success: false, error: `Invalid Telegram initData: ${result.reason}` });
  }
  req.tgUserId = result.userId;
  next();
});

// Initialize OpenAI client
let ai: OpenAI | null = null;
const API_KEY = process.env.OPENAI_API_KEY;

if (API_KEY) {
  try {
    ai = new OpenAI({ apiKey: API_KEY });
    console.log("OpenAI GPT-4o client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize OpenAI client:", err);
  }
} else {
  console.warn("OPENAI_API_KEY is not defined. AI endpoints will return 503.");
}

// Helper: adjust health score based on fitness goal
function adjustScoreBasedOnGoal(data: any, goal: string) {
  if (!data?.healthScore) return;
  const fat = data.macros?.fat || 0;
  const protein = data.macros?.protein || 0;
  const calories = data.macros?.calories || 0;
  let modifier = 0;

  if (goal === "lose") {
    if (calories > 350) modifier -= 10;
    if (calories < 100) modifier += 5;
    if (fat > 15) modifier -= 8;
  } else if (goal === "gain") {
    if (protein > 15) modifier += 12;
    if (protein < 3) modifier -= 5;
    if (calories > 300) modifier += 5;
  } else {
    if (fat > 25) modifier -= 5;
    if (protein > 10) modifier += 3;
  }

  data.healthScore = Math.min(Math.max(data.healthScore + modifier, 1), 100);
}

// Helper: parse JSON from GPT-4o response safely
function parseJSON(text: string): any {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleaned);
}

// ─── /api/scan ─────────────────────────────────────────────────────────────
app.post("/api/scan", async (req, res) => {
  try {
    const { image, text, userProfile, language = "ru" } = req.body;
    const userGoal = userProfile?.goal || "maintain";
    const userConditions = userProfile?.conditions || "";

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: language === "uz"
          ? "AI xizmat sozlanmagan. Administrator OPENAI_API_KEY ni qo'shishi kerak."
          : "AI-сервис не настроен. Администратор должен добавить OPENAI_API_KEY."
      });
    }

    const systemPrompt = language === "uz"
      ? `Siz elite darajadagi nutrition coach va salomatlik mutaxassisisiz (O'zbekiston va MDH).
Foydalanuvchi maqsadi: ${userGoal === "lose" ? "ozish" : userGoal === "gain" ? "mushak yig'ish" : "vazn ushlash"}.
Cheklovlar: ${userConditions || "yo'q"}.
Mahsulot yoki taomni tahlil qilib, FAQAT quyidagi JSON formatida javob bering (markdown yoki qo'shimcha matn yo'q):
{
  "productName": "nomi (o'zbek tilida)",
  "healthScore": 1-100 raqam,
  "category": "dairy"|"beverage"|"snacks"|"traditional"|"fast_food"|"bakery"|"general",
  "novaCategory": 1-4 raqam,
  "macros": {"calories": raqam, "protein": raqam, "fat": raqam, "carbs": raqam, "fiber": raqam, "sodium": raqam},
  "pros": ["...","..."],
  "cons": ["...","..."],
  "verdict": "qisqa xulosa o'zbek tilida",
  "ingredientsFound": ["..."],
  "allergensAlerts": ["..."],
  "reviewsAnalysis": {"sentiment": "positive"|"negative"|"mixed"|"neutral", "ratingEstimate": "X/5", "summary": "..."},
  "goalEvaluation": "maqsadga moslik izohi"
}`
      : `Вы — высококлассный нутрициолог и фитнес-коуч, специалист по продуктам СНГ и Узбекистана.
Цель пользователя: ${userGoal === "lose" ? "похудение" : userGoal === "gain" ? "набор мышечной массы" : "поддержание формы"}.
Ограничения: ${userConditions || "нет"}.
Проанализируйте продукт/блюдо и верните ТОЛЬКО JSON без markdown и лишнего текста:
{
  "productName": "название на русском",
  "healthScore": число 1-100 (строгая оценка с учётом сахара, трансжиров, соли, NOVA),
  "category": "dairy"|"beverage"|"snacks"|"traditional"|"fast_food"|"bakery"|"general",
  "novaCategory": число 1-4,
  "macros": {"calories": число, "protein": число, "fat": число, "carbs": число, "fiber": число, "sodium": число},
  "pros": ["плюс1","плюс2","плюс3"],
  "cons": ["минус1","минус2","минус3"],
  "verdict": "дружелюбный совет нутрициолога на русском",
  "ingredientsFound": ["ингредиент1","ингредиент2"],
  "allergensAlerts": ["аллерген1"],
  "reviewsAnalysis": {"sentiment": "positive"|"negative"|"mixed"|"neutral", "ratingEstimate": "X.X/5", "summary": "резюме отзывов"},
  "goalEvaluation": "объяснение соответствия цели пользователя"
}`;

    let responseText: string;

    if (image) {
      const base64Data = image.includes(",") ? image.split(",")[1] : image;
      const mimeType = image.includes(";") ? image.split(";")[0].split(":")[1] : "image/jpeg";

      const completion = await ai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" } },
              { type: "text", text: language === "uz" ? "Ushbu mahsulot yoki taomni tahlil qiling." : "Проанализируйте этот продукт или блюдо." }
            ]
          }
        ],
        max_tokens: 1200
      });
      responseText = completion.choices[0]?.message?.content || "{}";
    } else {
      const completion = await ai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: language === "uz" ? `Ushbu mahsulotni tahlil qiling: ${text}` : `Проанализируйте: ${text}` }
        ],
        max_tokens: 1200
      });
      responseText = completion.choices[0]?.message?.content || "{}";
    }

    try {
      const parsed = parseJSON(responseText);
      adjustScoreBasedOnGoal(parsed, userGoal);
      return res.json({ success: true, data: parsed, source: "gpt4o_vision_ai" });
    } catch (e) {
      console.error("JSON parse error:", e, responseText);
      return res.status(500).json({ success: false, error: "Failed to parse AI response. Try again." });
    }

  } catch (error: any) {
    console.error("Scan error:", error);
    res.status(500).json({ success: false, error: error?.message || "Internal server error." });
  }
});

// ─── /api/coach ────────────────────────────────────────────────────────────
app.post("/api/coach", async (req, res) => {
  try {
    const { message, history = [], userProfile, language = "ru" } = req.body;

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: language === "uz"
          ? "AI xizmat sozlanmagan. Administrator OPENAI_API_KEY ni qo'shishi kerak."
          : "AI-сервис не настроен. Администратор должен добавить OPENAI_API_KEY."
      });
    }

    const { goal = "maintain", weight = 70, height = 175, age = 25, gender = "male", conditions = "" } = userProfile || {};

    let bmr = 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age) + (gender === "male" ? 5 : -161);
    let targetCalories = Math.round(bmr * 1.375);
    if (goal === "lose") targetCalories = Math.round(targetCalories * 0.82);
    if (goal === "gain") targetCalories = Math.round(targetCalories * 1.15);

    const proteinGrams = goal === "gain" ? Math.round(Number(weight) * 2) : Math.round(Number(weight) * 1.6);
    const fatGrams = Math.round(Number(weight) * 0.9);
    const carbsGrams = Math.round((targetCalories - (proteinGrams * 4 + fatGrams * 9)) / 4);

    const systemPrompt = `Вы — профессиональный, дружелюбный AI Нутрициолог и фитнес-коуч, специалист по кухне СНГ и Узбекистана.
Профиль пользователя: ${age} лет, ${height} см, ${weight} кг, ${gender === "male" ? "мужчина" : "женщина"}.
Цель: ${goal === "lose" ? "похудение" : goal === "gain" ? "набор сухой мышечной массы" : "поддержание здоровья"}.
Нормы: ${targetCalories} ккал, белки ${proteinGrams}г, жиры ${fatGrams}г, углеводы ${carbsGrams}г.
Ограничения: ${conditions || "нет"}.
Язык ответа: ${language === "uz" ? "O'zbek tili" : "Русский"}.
Общайтесь простым языком, без сложной терминологии. Давайте практичные советы с акцентом на узбекскую кухню (плов, сомса, манты, лепешки, сухофрукты). Отвечайте в Markdown кратко и по делу.`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((h: any) => ({
        role: h.role === "user" ? "user" : "assistant" as const,
        content: h.text
      })),
      { role: "user", content: message }
    ];

    const completion = await ai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 800
    });

    res.json({
      success: true,
      text: completion.choices[0]?.message?.content || "",
      source: "gpt4o_coaching_ai",
      macrosTargets: { calories: targetCalories, protein: proteinGrams, fat: fatGrams, carbs: carbsGrams }
    });

  } catch (err: any) {
    console.error("Coach error:", err);
    res.status(500).json({ success: false, error: err?.message || "Coach unavailable." });
  }
});

// ─── /api/voice-log ────────────────────────────────────────────────────────
app.post("/api/voice-log", async (req, res) => {
  try {
    const { text, userProfile, language = "ru" } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, error: "Text is empty" });
    }

    const userGoal = userProfile?.goal || "maintain";
    const userConditions = userProfile?.conditions || "";

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: language === "uz"
          ? "AI xizmat sozlanmagan. Administrator OPENAI_API_KEY ni qo'shishi kerak."
          : "AI-сервис не настроен. Администратор должен добавить OPENAI_API_KEY."
      });
    }

    const systemPrompt = `Вы — AI нутрициолог, специалист по кухне СНГ и Узбекистана.
Пользователь описал свой рацион голосом или текстом. Разберите каждый продукт/блюдо и верните строго JSON:
{
  "items": [
    {
      "productName": "название",
      "weightGrams": число (граммы порции),
      "calories": число (ккал для данной порции),
      "protein": число,
      "fat": число,
      "carbs": число,
      "healthScore": число 1-100,
      "cookingMethod": "совет по здоровому приготовлению"
    }
  ],
  "coachSummary": "экспертный разбор всего рациона с мотивацией"
}
Правила: если вес указан — считайте под него. Если нет — используйте стандартную порцию (плов 300г, сомса 120г, яблоко 150г, стакан молока 250мл).
Цель пользователя: ${userGoal === "lose" ? "похудение" : userGoal === "gain" ? "набор массы" : "поддержание веса"}.
Ограничения: ${userConditions || "нет"}.
Язык: ${language === "uz" ? "O'zbek tili" : "Русский"}. Только JSON, без markdown.`;

    const completion = await ai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Рацион пользователя: "${text}"` }
      ],
      max_tokens: 1500
    });

    const parsed = parseJSON(completion.choices[0]?.message?.content || "{}");
    return res.json({ success: true, data: parsed, source: "gpt4o_voice_parser" });

  } catch (err: any) {
    console.error("Voice-log error:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to parse meal." });
  }
});

// ─── Vite / Static serving ─────────────────────────────────────────────────
async function setupViteOrProduction() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, response) => {
      response.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static server configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NutriCore AI server listening on port ${PORT}`);
  });
}

setupViteOrProduction();
