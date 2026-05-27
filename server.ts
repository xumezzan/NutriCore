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
  console.warn("OPENAI_API_KEY is not defined. Running in Demo/Sandbox mode.");
}

// Precalculated demo items for the supermarket shelf
const DEMO_ITEMS = {
  nestle_sutim: {
    productName: "Sutim Молоко 3.2%",
    healthScore: 85,
    category: "dairy",
    novaCategory: 1,
    macros: { calories: 60, protein: 3.0, fat: 3.2, carbs: 4.7, fiber: 0, sodium: 50 },
    pros: ["Отличный источник кальция и белка", "Минимальная обработка (NOVA 1)", "Без сахара и трансжиров"],
    cons: ["Содержит лактозу (аллерген для некоторых)", "Средняя жирность"],
    verdict: "Ajoyib sut mahsuloti. Har kuni iste'mol qilish uchun juda foydali. Отличный молочный продукт для ежедневного рациона.",
    ingredientsFound: ["Натурализированное цельное коровье молоко"],
    allergensAlerts: ["Лактоза / Sut oqsili"],
    reviewsAnalysis: {
      sentiment: "positive",
      ratingEstimate: "4.8/5",
      summary: "Один из самых популярных молочных продуктов Узбекистана. Покупатели ценят за стабильный вкус."
    },
    goalEvaluation: "Соответствует норме. Для похудения контролируйте объём — жирность 3.2%. Протеин поможет мышцам."
  },
  tashkent_osh: {
    productName: "Toshkent To'y Oshi (Плов Свадебный)",
    healthScore: 68,
    category: "traditional",
    novaCategory: 2,
    macros: { calories: 240, protein: 8.5, fat: 12.0, carbs: 24.5, fiber: 1.5, sodium: 340 },
    pros: ["Натуральные цельные ингредиенты", "Высокая сытость", "Богат белком мяса говядины/баранины"],
    cons: ["Высокая калорийность", "Много масла и животных жиров", "Высокая углеводная нагрузка"],
    verdict: "Традиционный узбекский плов. Отличен для энергии, однако содержит большой объём жиров. Употребляйте умеренно.",
    ingredientsFound: ["Рис Лазер/Аланга", "Говядина", "Баранина", "Морковь", "Курдючное сало", "Зира", "Чеснок", "Нут"],
    allergensAlerts: ["Нет выраженных аллергенов"],
    reviewsAnalysis: {
      sentiment: "positive",
      ratingEstimate: "4.9/5",
      summary: "Любимое блюдо СНГ. Высокие оценки вкуса, сытности и аутентичности."
    },
    goalEvaluation: "Для набора массы — идеальный высококалорийный приём. Для похудения — порция до 150-200г строго в первой половине дня."
  },
  lays_chips: {
    productName: "Lay's Сметана и Зелень",
    healthScore: 32,
    category: "snacks",
    novaCategory: 4,
    macros: { calories: 520, protein: 6.0, fat: 32.0, carbs: 53.0, fiber: 4.0, sodium: 680 },
    pros: ["Быстрый источник кратковременной энергии", "Отличные вкусовые качества"],
    cons: ["Ультраобработанный продукт (NOVA 4)", "Экстремально высокое содержание соли", "Содержит канцероген акриламид"],
    verdict: "Продукт высокой степени промышленной обработки. Чрезмерно соленый, перенасыщен пустыми жирами. Лучше исключить.",
    ingredientsFound: ["Картофель", "Растительное масло", "Ароматизаторы", "Глутамат натрия", "Сухая сметана"],
    allergensAlerts: ["Глютен пшеницы", "Глутамат натрия", "Молочная сыворотка"],
    reviewsAnalysis: {
      sentiment: "mixed",
      ratingEstimate: "4.5/5 (по вкусу)",
      summary: "Любимый вкус миллионов, но критикуется нутрициологами за вред для ЖКТ и высокий натрий."
    },
    goalEvaluation: "Крайне противопоказан для похудения. При наборе массы не даёт качественного белка для мышц."
  },
  pepsi_zero: {
    productName: "Pepsi Wild Cherry Zero Sugar",
    healthScore: 48,
    category: "beverage",
    novaCategory: 4,
    macros: { calories: 1, protein: 0, fat: 0, carbs: 0.1, fiber: 0, sodium: 10 },
    pros: ["Практически нулевая калорийность", "Позволяет заменять сладкие газировки"],
    cons: ["Содержит аспартам и ацесульфам калия", "Высокая кислотность портит эмаль", "NOVA 4 — ультраобработанный"],
    verdict: "Нулевая калорийность удобна для похудения, однако химический состав не делает напиток полезным.",
    ingredientsFound: ["Вода", "Краситель сахарный колер", "Ортофосфорная кислота", "Аспартам", "Ацесульфам калия", "Кофеин"],
    allergensAlerts: ["Фенилаланин (источник аспартама)"],
    reviewsAnalysis: {
      sentiment: "mixed",
      ratingEstimate: "4.3/5",
      summary: "Уважается худеющими, но беспокоят слухи о вреде аспартама."
    },
    goalEvaluation: "Безопасен по калориям для похудения, но подсластители усиливают тягу к сладкому."
  },
  samarkand_shaurma: {
    productName: "Samarqand Go'shtli Lavash (Шаурма)",
    healthScore: 71,
    category: "fast_food",
    novaCategory: 3,
    macros: { calories: 310, protein: 14.5, fat: 11.5, carbs: 36.0, fiber: 2.1, sodium: 490 },
    pros: ["Сбалансирован по белкам и углеводам", "Содержит свежие овощи", "Тонкий лаваш вместо плотной булки"],
    cons: ["Жирные майонезные соусы", "Высокий уровень соли", "Качество мяса зависит от точки продажи"],
    verdict: "Отличный перекус. При заказе без майонеза превращается в полноценно хороший обед.",
    ingredientsFound: ["Пшеничный лаваш", "Куриное мясо/говядина", "Капустный салат", "Огурцы", "Помидоры", "Чесночный соус"],
    allergensAlerts: ["Глютен пшеницы", "Куриное яйцо (в майонезе)"],
    reviewsAnalysis: {
      sentiment: "positive",
      ratingEstimate: "4.7/5",
      summary: "Одно из самых любимых блюд уличной еды Узбекистана. Ценится за сытность и сочность."
    },
    goalEvaluation: "Для набора массы — отличный источник белков. Для похудения — без майонеза, минус до 150 ккал."
  }
};

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

    // Demo shelf item shortcut
    if (text && DEMO_ITEMS[text.trim().toLowerCase() as keyof typeof DEMO_ITEMS]) {
      const item = JSON.parse(JSON.stringify(DEMO_ITEMS[text.trim().toLowerCase() as keyof typeof DEMO_ITEMS]));
      adjustScoreBasedOnGoal(item, userGoal);
      return res.json({ success: true, data: item, source: "demo_database" });
    }

    // Sandbox fallback
    if (!ai) {
      const name = (text && text.length <= 50) ? text : "Сканированный продукт";
      const fallback = {
        productName: name,
        healthScore: Math.floor(Math.random() * 40) + 50,
        category: "general",
        novaCategory: 2,
        macros: { calories: 180, protein: 7.5, fat: 4.2, carbs: 22.1, fiber: 2.8, sodium: 120 },
        pros: ["Преимущественно натуральные компоненты", "Умеренная калорийность"],
        cons: ["Возможны простые сахара", "Возможны консерванты"],
        verdict: language === "uz"
          ? "Tizim sandbox rejimida. To'liq tahlil uchun OPENAI_API_KEY ni .env fayliga qo'shing."
          : "Приложение в демо-режиме. Для анализа фото добавьте OPENAI_API_KEY в файл .env.",
        ingredientsFound: ["Пшеничный белок", "Крахмал", "Специи", "Вода", "Соль"],
        allergensAlerts: ["Глютен"],
        reviewsAnalysis: { sentiment: "neutral", ratingEstimate: "4.2/5", summary: "Популярный продукт СНГ рынка." },
        goalEvaluation: `Оценка под цель: ${userGoal === "lose" ? "Похудение" : userGoal === "gain" ? "Набор массы" : "Поддержание веса"}.`
      };
      adjustScoreBasedOnGoal(fallback, userGoal);
      return res.json({ success: true, data: fallback, source: "sandbox_simulation", noApiKeyWarning: true });
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
      const reply = language === "uz"
        ? "Assalomu alaykum! Tizim sandbox rejimida. To'liq AI maslahati uchun OPENAI_API_KEY ni .env ga qo'shing."
        : "Приложение в демо-режиме. Добавьте OPENAI_API_KEY в файл .env для полноценного AI-коучинга.";
      return res.json({ success: true, text: reply, source: "sandbox_simulation" });
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

    // Sandbox mode — keyword-based fallback
    if (!ai) {
      const lower = text.toLowerCase();
      const detectedItems: any[] = [];

      if (lower.includes("плов") || lower.includes("osh")) {
        detectedItems.push({
          productName: language === "uz" ? "Toshkent To'y Oshi" : "Свадебный Плов",
          weightGrams: 300, calories: 720, protein: 25.5, fat: 36.0, carbs: 73.5, healthScore: 68,
          cookingMethod: language === "uz"
            ? "Kamroq qo'y yog'i va ko'proq sabzi bilan tayyorlang."
            : "Готовьте с меньшим количеством масла и бо́льшим объёмом моркови."
        });
      }
      if (lower.includes("яблоко") || lower.includes("olma")) {
        detectedItems.push({
          productName: language === "uz" ? "Yashil Olma" : "Свежее Яблоко",
          weightGrams: 150, calories: 78, protein: 0.5, fat: 0.3, carbs: 18.5, healthScore: 95,
          cookingMethod: "Печёное яблоко с корицей — отличный десерт без сахара."
        });
      }
      if (lower.includes("молоко") || lower.includes("sut")) {
        detectedItems.push({
          productName: "Sutim Молоко 3.2%",
          weightGrams: 200, calories: 120, protein: 6.0, fat: 6.4, carbs: 9.4, healthScore: 85,
          cookingMethod: "Пить холодным или добавлять в цельнозерновые каши."
        });
      }

      if (detectedItems.length === 0) {
        detectedItems.push({
          productName: text.slice(0, 30) + " (анализ)",
          weightGrams: 200, calories: 240, protein: 8.0, fat: 6.0, carbs: 35.0, healthScore: 75,
          cookingMethod: "Готовьте на пару или запекайте для минимизации лишних жиров."
        });
      }

      const coachSummary = language === "uz"
        ? `[SANDBOX] "${text}" tahlil qilindi. To'liq AI uchun OPENAI_API_KEY ni .env ga qo'shing.`
        : `[ДЕМО-РЕЖИМ] Текст «${text}» распознан. Добавьте OPENAI_API_KEY в .env для реального AI-анализа.`;

      return res.json({ success: true, data: { items: detectedItems, coachSummary }, source: "sandbox_simulation", noApiKeyWarning: true });
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
