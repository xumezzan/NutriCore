import { useMemo, useState, useEffect, useRef } from "react";
import { MealLog, AppLanguage } from "../types";
import {
  Camera,
  Mic,
  Keyboard,
  Sparkles,
  ChevronRight,
  Sunrise,
  Sun,
  Moon,
  Zap,
  X,
} from "lucide-react";
import { tg } from "../telegram";

interface HomeProps {
  mealLogs: MealLog[];
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  language: AppLanguage;
  onOpenScanner: (mode?: "photo" | "voice" | "text", prefill?: string) => void;
  onNavigateToDiary: () => void;
  onNavigateToCoach: () => void;
}

const COPY = {
  ru: {
    morning: "Доброе утро",
    afternoon: "Добрый день",
    evening: "Добрый вечер",
    question: "Что ты съел?",
    inputPlaceholder: "Опиши еду или сфотографируй...",
    photo: "Фото",
    voice: "Голос",
    type: "Ввести",
    quickAdd: "Быстрое добавление",
    today: "Сегодня",
    of: "из",
    kcal: "ккал",
    see: "Подробнее",
    emptyHint: "Сделай первый scan — я мгновенно посчитаю калории и БЖУ.",
    proteins: "Б",
    fats: "Ж",
    carbs: "У",
  },
  uz: {
    morning: "Xayrli tong",
    afternoon: "Xayrli kun",
    evening: "Xayrli kech",
    question: "Nima yedingiz?",
    inputPlaceholder: "Taomni tasvirlang yoki suratga oling...",
    photo: "Surat",
    voice: "Ovoz",
    type: "Yozish",
    quickAdd: "Tez qo'shish",
    today: "Bugun",
    of: "dan",
    kcal: "kkal",
    see: "Batafsil",
    emptyHint: "Birinchi skanerlashni boshlang — men kaloriya va KBJUni darhol hisoblayman.",
    proteins: "O",
    fats: "Y",
    carbs: "U",
  },
};

const QUICK_CHIPS_BY_TIME = {
  ru: {
    morning: ["☕ Кофе", "🥣 Овсянка", "🥚 Яйца", "🍌 Банан"],
    afternoon: ["🍲 Суп", "🥗 Салат", "🍚 Плов", "🥖 Хлеб"],
    evening: ["🥩 Курица", "🥦 Овощи", "🐟 Рыба", "🍵 Чай"],
  },
  uz: {
    morning: ["☕ Qahva", "🥣 Sulu", "🥚 Tuxum", "🍌 Banan"],
    afternoon: ["🍲 Sho'rva", "🥗 Salat", "🍚 Palov", "🥖 Non"],
    evening: ["🥩 Tovuq", "🥦 Sabzavot", "🐟 Baliq", "🍵 Choy"],
  },
};

function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * ease));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return display;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function lightHaptic() {
  try {
    tg?.HapticFeedback?.impactOccurred?.("light");
  } catch {}
}

export default function Home({
  mealLogs,
  targetCalories,
  targetProtein,
  targetFat,
  targetCarbs,
  language,
  onOpenScanner,
  onNavigateToDiary,
  onNavigateToCoach,
}: HomeProps) {
  const t = COPY[language];
  const timeOfDay = getTimeOfDay();
  const greeting = t[timeOfDay];
  const TimeIcon = timeOfDay === "morning" ? Sunrise : timeOfDay === "afternoon" ? Sun : Moon;
  const firstName = tg?.initDataUnsafe?.user?.first_name;

  const chips = QUICK_CHIPS_BY_TIME[language][timeOfDay];

  const totals = useMemo(() => {
    const c = Math.round(mealLogs.reduce((acc, m) => acc + m.calories, 0));
    const p = Math.round(mealLogs.reduce((acc, m) => acc + m.protein, 0));
    const f = Math.round(mealLogs.reduce((acc, m) => acc + m.fat, 0));
    const cb = Math.round(mealLogs.reduce((acc, m) => acc + m.carbs, 0));
    return { c, p, f, cb };
  }, [mealLogs]);

  const calProgress = Math.min((totals.c / targetCalories) * 100, 100);
  const displayCalories = useCountUp(totals.c);

  // Proactive insight — generate once per day, dismiss-able
  const todayKey = new Date().toISOString().slice(0, 10); // "2026-05-28"
  const dismissKey = `nc_insight_dismissed_${todayKey}`;
  const [insightDismissed, setInsightDismissed] = useState(
    () => localStorage.getItem(dismissKey) === "1"
  );
  const dismissInsight = () => {
    localStorage.setItem(dismissKey, "1");
    setInsightDismissed(true);
  };

  const insight = useMemo((): { text: string; cta: string; ctaAction: "scan" | "coach" } | null => {
    const hour = new Date().getHours();
    // Only show after 10:00 when there's meaningful data or meaningful absence
    if (hour < 10) return null;
    const protPct = targetProtein > 0 ? (totals.p / targetProtein) * 100 : 100;
    const calPct = targetCalories > 0 ? (totals.c / targetCalories) * 100 : 100;

    if (mealLogs.length === 0 && hour >= 12) {
      return language === "uz"
        ? {
            text: "Bugun hali hech narsa kiritilmagan. Birinchi ovqatingizni skanerlang — bu atigi 5 soniya.",
            cta: "Skanerlash",
            ctaAction: "scan",
          }
        : {
            text: "Сегодня ещё ничего не добавлено. Отсканируй первый приём — это 5 секунд.",
            cta: "Сканировать",
            ctaAction: "scan",
          };
    }
    if (protPct < 40 && hour >= 14) {
      const need = Math.round(targetProtein - totals.p);
      return language === "uz"
        ? {
            text: `Bugun oqsil ${Math.round(protPct)}% — me'yordan ancha kam. Yana ${need}g oqsil kerak. Tuxum, tvorog yoki tovuq qo'shing.`,
            cta: "Maslahat olish",
            ctaAction: "coach",
          }
        : {
            text: `Белка сегодня ${Math.round(protPct)}% от нормы — сильный дефицит. Нужно ещё ${need}г. Добавь яйца, творог или курицу.`,
            cta: "Спросить Coach",
            ctaAction: "coach",
          };
    }
    if (calPct > 90 && hour < 18) {
      const remain = Math.max(0, targetCalories - totals.c);
      return language === "uz"
        ? {
            text: `Kun yarim bo'lmay ${Math.round(calPct)}% kaloriya iste'mol qildingiz. Kechqurun faqat ${remain} kkal qoldi.`,
            cta: "Batafsil",
            ctaAction: "coach",
          }
        : {
            text: `Уже ${Math.round(calPct)}% калорий, а день ещё не закончен. На вечер осталось ${remain} ккал.`,
            cta: "Подробнее",
            ctaAction: "coach",
          };
    }
    return null;
  }, [totals, targetCalories, targetProtein, mealLogs.length, language]);

  const handleQuickChip = (chip: string) => {
    lightHaptic();
    // Убираем emoji-префикс из chip-label, оставляем чистое название продукта
    const stripped = chip.replace(/^\p{Emoji}+\s*/u, "").trim();
    const prompt =
      language === "uz"
        ? `Hozir ${stripped} yedim, taxminiy 1 porsiya`
        : `Сейчас съел ${stripped}, примерно одна порция`;
    onOpenScanner("text", prompt);
  };

  return (
    <div className="space-y-7" id="home_tab_panel">
      {/* Greeting block */}
      <div className="space-y-1 pt-2 animate-stagger-1">
        <div className="flex items-center gap-2 text-[#8E8E93] text-[13px] font-medium">
          <TimeIcon className="w-3.5 h-3.5 text-brand-primary" />
          <span>
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </span>
        </div>
        <h1
          className="text-[28px] leading-[1.15] font-black text-white tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {t.question}
        </h1>
      </div>

      {/* AI Input Pill — core CTA */}
      <div
        id="home_ai_input_pill"
        className="relative rounded-3xl overflow-hidden animate-stagger-2"
        style={{
          background: "linear-gradient(180deg, #15151A 0%, #101015 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,229,119,0.15)",
        }}
      >
        {/* Soft neon glow */}
        <div className="pointer-events-none absolute -top-20 -right-10 w-48 h-48 rounded-full bg-brand-primary/10 blur-3xl" />

        <button
          onClick={() => {
            lightHaptic();
            onOpenScanner("text");
          }}
          className="relative w-full text-left px-5 pt-5 pb-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_12px_rgba(0,229,119,0.6)]" />
          <span className="text-[15px] text-[#8E8E93] font-medium flex-1 truncate">
            {t.inputPlaceholder}
          </span>
        </button>

        <div className="relative grid grid-cols-3 gap-2 px-3 pb-3">
          <button
            onClick={() => {
              lightHaptic();
              onOpenScanner("photo");
            }}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.97] border border-white/5 transition-all"
          >
            <Camera className="w-5 h-5 text-brand-primary" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold text-white/90 tracking-wide">
              {t.photo}
            </span>
          </button>
          <button
            onClick={() => {
              lightHaptic();
              onOpenScanner("voice");
            }}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.97] border border-white/5 transition-all"
          >
            <Mic className="w-5 h-5 text-brand-primary" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold text-white/90 tracking-wide">
              {t.voice}
            </span>
          </button>
          <button
            onClick={() => {
              lightHaptic();
              onOpenScanner("text");
            }}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.97] border border-white/5 transition-all"
          >
            <Keyboard className="w-5 h-5 text-brand-primary" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold text-white/90 tracking-wide">
              {t.type}
            </span>
          </button>
        </div>
      </div>

      {/* Quick chips — time-of-day aware */}
      <div className="space-y-3 animate-stagger-3">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-3 h-3 text-brand-primary" />
          <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold">
            {t.quickAdd}
          </h3>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-4 px-4 pb-1">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleQuickChip(chip)}
              className="shrink-0 px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] text-[13px] font-medium text-white/85 whitespace-nowrap transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Today strip — compact summary, tap to Diary */}
      <button
        onClick={() => {
          lightHaptic();
          onNavigateToDiary();
        }}
        id="home_today_strip"
        className="w-full text-left rounded-2xl p-4 transition-all hover:bg-white/[0.02] active:scale-[0.99] tap-scale animate-stagger-4"
        style={{
          background: "linear-gradient(180deg, #131318 0%, #0E0E12 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold">
            {t.today}
          </h3>
          <div className="flex items-center gap-1 text-[#8E8E93]">
            <span className="text-[11px] font-medium">{t.see}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span
            className="text-[26px] font-black text-white tracking-tight tabular-nums"
            style={{ letterSpacing: "-0.02em" }}
          >
            {displayCalories}
          </span>
          <span className="text-[13px] text-[#8E8E93] font-medium">
            {t.of} {targetCalories} {t.kcal}
          </span>
        </div>

        {/* Slim progress bar */}
        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${calProgress}%`,
              background: "linear-gradient(90deg, #00E577 0%, #00D9F6 100%)",
            }}
          />
        </div>

        {/* Inline macros */}
        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-baseline gap-1">
            <span className="text-[#8E8E93] font-semibold">{t.proteins}</span>
            <span className="text-white font-bold tabular-nums">{totals.p}</span>
            <span className="text-[#48484A]">/{targetProtein}g</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[#8E8E93] font-semibold">{t.fats}</span>
            <span className="text-white font-bold tabular-nums">{totals.f}</span>
            <span className="text-[#48484A]">/{targetFat}g</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[#8E8E93] font-semibold">{t.carbs}</span>
            <span className="text-white font-bold tabular-nums">{totals.cb}</span>
            <span className="text-[#48484A]">/{targetCarbs}g</span>
          </div>
        </div>

        {mealLogs.length === 0 && (
          <p className="text-[12px] text-[#8E8E93] mt-3 leading-relaxed">
            {t.emptyHint}
          </p>
        )}
      </button>

      {/* Proactive AI Coach card — dismiss-able, once per day */}
      {insight && !insightDismissed && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3 animate-fade-in"
          style={{
            background: "linear-gradient(135deg, rgba(0,229,119,0.06) 0%, rgba(0,217,246,0.04) 100%)",
            border: "1px solid rgba(0,229,119,0.15)",
          }}
        >
          <div className="p-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 shrink-0">
            <Zap className="w-4 h-4 text-brand-primary" />
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            <p className="text-[13px] text-white/90 leading-relaxed">{insight.text}</p>
            <button
              onClick={() => {
                lightHaptic();
                if (insight.ctaAction === "scan") onOpenScanner("text");
                else onNavigateToCoach();
              }}
              className="text-[11px] font-bold text-brand-primary hover:text-white transition-colors flex items-center gap-1"
            >
              {insight.cta}
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={dismissInsight}
            className="p-1 text-[#48484A] hover:text-[#8E8E93] transition-colors shrink-0"
            aria-label="dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
