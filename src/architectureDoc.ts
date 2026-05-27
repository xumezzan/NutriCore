/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SpecSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  details: { label: string; value: string }[] | Array<string>;
}

export const SYSTEM_SPECS: SpecSection[] = [
  {
    id: "architecture",
    title: "Unicorn Architecture Stack",
    icon: "Layers",
    content: "A premium high-scale, event-driven reactive microservice architecture designed for millions of MAU in Uzbekistan & CIS. Features sub-50ms cache feedback, localized OCR, and async vision pipelines.",
    details: [
      { label: "Client Ingress", value: "Telegram Mini App (HTML5/React SPA) + Telegram Bot API Webflow" },
      { label: "CDN / Reverse Proxy", value: "Cloudflare (Uzbekistan custom edge cache for static assets) + Nginx Ingress" },
      { label: "Application Layer", value: "Python FastAPI (asynchronous ASGI, high concurrency) + Express Node.js API gateway" },
      { label: "Job Processing Queue", value: "Celery v5 + Redis (For long-running high-latency OCR, Vision API, and Web scraping)" },
      { label: "Structured Database", value: "PostgreSQL with Citus (distributed multi-tenant by Telegram ID) + TimescaleDB for meal logging telemetry" },
      { label: "Embedding Cache", value: "PgVector + Redis Enterprise (vector-similarity matching of OCR composition texts to skip Gemini API calls entirely)" },
      { label: "AI & OCR Intelligence", value: "Gemini Pro / 3.5 Flash Vision API (with local pre-trained EasyOCR/Tesseract failover for ingredient lines)" },
      { label: "Object Storage", value: "AWS S3 / Cloudinary (regional Tashkent-based storage for high speed image ingestion)" }
    ]
  },
  {
    id: "database",
    title: "Database Relational Models",
    icon: "Database",
    content: "Optimized relational Postgres schema with smart indices on indexing strings and Telegram User IDs.",
    details: [
      "Table u_users_profile: tg_id (BIGINT Primary Key), first_name (VARCHAR), username (VARCHAR), age (INT), height (INT), weight (DECIMAL), gender (VARCHAR), goal (VARCHAR), daily_calories_target (INT), lang (VARCHAR), premium_status (BOOLEAN), points (INT), created_at (TIMESTAMP)",
      "Table u_food_scans: id (UUID Primary Key), tg_id (BIGINT FK), image_url (VARCHAR), barcode (VARCHAR), parsed_name (VARCHAR), health_score (INT), calories (DECIMAL), protein (DECIMAL), fat (DECIMAL), carbs (DECIMAL), allergen_alerts (TEXT[]), ingredients_raw (TEXT), reviews_sentiment (VARCHAR), created_at (TIMESTAMP)",
      "Table u_daily_journal: log_id (UUID Primary Key), tg_id (BIGINT FK), logged_date (DATE), total_calories (INT), total_protein (DECIMAL), total_fat (DECIMAL), total_carbs (DECIMAL)",
      "Table u_referrals: id (SERIAL), referrer_tg_id (BIGINT FK), referee_tg_id (BIGINT FK, Unique), status (VARCHAR), bonus_points_credited (INT), created_at (TIMESTAMP)",
      "Table u_vector_cache: id (BIGINT Primary Key), raw_ocr_hash (VARCHAR(64), UniqueIndex), embedding (VECTOR(1536)), cached_json_analysis (JSONB), hits_count (INT), updated_at (TIMESTAMP)"
    ]
  },
  {
    id: "ai_pipeline",
    title: "The AI & OCR Engine Pipeline",
    icon: "Cpu",
    content: "How we process an incoming camera frame in <1.2 seconds to minimize API consumption, reduce token latency, and secure hallucination controls.",
    details: [
      "Step 1: Client inputs camera payload (base64 compress). We check local vector database for identical ingredient hashes to save API costs.",
      "Step 2: If cache miss, send to pre-processor OCR (crop, skew correction, contrast optimization using custom canvas filters).",
      "Step 3: Vision Request. Query Gemini 3.5 Flash using strict structured output (responseSchema) containing Name, Score, BJU macros, Pros / Cons, and Allergens.",
      "Step 4: Regional Localization. Search Uzbek and CIS shopping directories (Korzinka, Makro, Lebazar) via brand name + barcode query proxy to verify local ingredients.",
      "Step 5: Hybrid Goal Adjustment. Recalculate original score. For weight loss models, scale simple carbs penalization; for muscle bulk models, boost protein rewards.",
      "Step 6: Output Sanitization. Filter offensive or dangerous content with automated regex and return final JSON token response."
    ]
  },
  {
    id: "api_endpoints",
    title: "Microservice REST APIs",
    icon: "Code",
    content: "Clean, self-documenting REST APIs used by Telegram webviews. Token-based stateless authentication through Telegram WebApp InitData secure hash HMAC.",
    details: [
      "GET /api/user/profile: Fetch bio profile, goals, daily milestones and streak counts",
      "POST /api/user/profile: Update height, weight, target goals, allergies and conditions",
      "POST /api/scan/image: Ingest base64/multipart image of food, состав or barcode. Triggers scanning pipeline",
      "POST /api/scan/barcode: Direct barcode metadata query. Matches DB, fallbacks to internet scraping",
      "GET /api/journal/history?limit=30: Retrieve historical logs of scanned items and aggregate daily averages",
      "POST /api/coach/ask: Real-time conversation thread with personalized smart coach on hydration, nutrition and lifestyle suggestions",
      "GET /api/leaderboard: Load global and league-based daily gamification score rankings for Uzbekistan & SNG context"
    ]
  },
  {
    id: "telegram_sdk",
    title: "Telegram SDK Integration",
    icon: "Smartphone",
    content: "Native Telegram Mini App integration guidelines using @telegram-apps/sdk to guarantee natural feel on iOS, Android and Telegram Desktop.",
    details: [
      "Native BackButton control: Syncing React router state with Mini App hardware back navigation click",
      "HapticFeedback trigger: Soft vibration on product score success (>70), warning double-vibration on high risk ingredients (<40)",
      "MainButton and SecondaryButton native sheets management for quick scanner confirmations",
      "ThemeParams synchronization: Extracting user active telegram CSS variables (--tg-theme-bg-color, --tg-theme-button-color) to auto-match graphite branding",
      "CloudStorage syncing: Leveraging Telegram cloud storage API to instantly persist small local app preferences"
    ]
  },
  {
    id: "scaling_mvp",
    title: "Startup Rollout & Growth Specs",
    icon: "TrendingUp",
    content: "CTO level rollout blueprint, viral loops, monetization and structural scalability specs for Unicorn standard.",
    details: [
      "Scaling: Kubernetes deployment with Horizontal Pod Autoscaler based on CPU & Memory metrics. Multi-region DB replication in CIS.",
      "Cost Optimization: Vector embedding ingredient caching reduces LLM calls by 58% on repeated scans like Pepsi, Sutim, local bread.",
      "Gamification: Earn 'Health Coins' (NC) for scanning, logging items, and hitting BJU goals. Reinvest coins to unlock premium avatars, advanced meal plans or partner discounts (Korzinka/Makro).",
      "Viral Growth Loop: Users share 'Compare Health Cards' on Telegram Stories. Refer 3 friends using unique deep link code to unlock 1 month Premium.",
      "Monetization: Subscription freemium model. Free scans: 5/day. Premium ($3.99/mo or 25,000 UZS) provides unlimited scans, deep toxic additives detection, custom diet planner, direct nutritionist chat exports."
    ]
  }
];
