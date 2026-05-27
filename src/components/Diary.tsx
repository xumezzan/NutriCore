import { useState, useEffect, useRef } from "react";
import { MealLog, AppLanguage } from "../types";
import { Flame, Apple, Utensils, Trash2, Sparkles } from "lucide-react";

function useCountUp(target: number, duration = 800): number {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * ease));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return display;
}

function ProgressRing({
  percentage,
  size,
  strokeWidth,
  color,
  trackColor = "rgba(255, 255, 255, 0.05)",
  gradientId,
  children,
}: {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor?: string;
  gradientId?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center animate-fade-in"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E577" />
              <stop offset="100%" stopColor="#00D9F6" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={gradientId ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

interface DiaryProps {
  mealLogs: MealLog[];
  onDeleteLog: (id: string) => void;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  language: AppLanguage;
}

const COPY = {
  ru: {
    title: "Дневник",
    subtitle: "Сегодняшний рацион",
    eaten: "Съедено",
    remaining: "Осталось",
    target: "Цель",
    kcal: "ккал",
    protein: "Белки",
    fat: "Жиры",
    carbs: "Углеводы",
    meals: "Приёмы пищи",
    empty: "Пока ничего не добавлено. Используй сканер на главной — фото или голос работают одинаково быстро.",
    tipTitle: "AI-совет дня",
  },
  uz: {
    title: "Kundalik",
    subtitle: "Bugungi ratsion",
    eaten: "Iste'mol qilindi",
    remaining: "Qoldi",
    target: "Me'yor",
    kcal: "kkal",
    protein: "Oqsillar",
    fat: "Yog'lar",
    carbs: "Uglevodlar",
    meals: "Ovqatlar",
    empty: "Hozircha hech narsa qo'shilmagan. Asosiy ekrandagi skanerni ishlating — surat yoki ovoz bir xil tez ishlaydi.",
    tipTitle: "Kunlik AI maslahat",
  },
};

const TIPS = {
  ru: [
    "Добавляй белок в каждый приём — он повышает сытость и сохраняет мышцы.",
    "Стакан воды за 20 минут до еды снижает аппетит на 15-20%.",
    "Сон менее 6 часов поднимает грелин (гормон голода) на 15%.",
    "Овощи — половина тарелки: объём, клетчатка, мало калорий.",
    "Ешь медленно, 15-20 мин. Сигнал насыщения приходит с задержкой.",
  ],
  uz: [
    "Har bir ovqatga oqsil qo'shing — bu to'qlikni oshiradi va mushaklarni saqlaydi.",
    "Ovqatdan 20 daqiqa oldin bir stakan suv iching — ishtaha 15-20% kamayadi.",
    "6 soatdan kam uyqu grelin (ochlik gormoni) ni 15% oshiradi.",
    "Sabzavotlar likobchaning yarmini egallashi kerak: hajm, tola, kam kaloriya.",
    "Sekin ovqatlaning, 15-20 daqiqa. Miya to'yganlik signalini kechikib oladi.",
  ],
};

export default function Diary({
  mealLogs,
  onDeleteLog,
  targetCalories,
  targetProtein,
  targetFat,
  targetCarbs,
  language,
}: DiaryProps) {
  const t = COPY[language];

  const totalCalories = Math.round(mealLogs.reduce((a, m) => a + m.calories, 0));
  const totalProtein = Math.round(mealLogs.reduce((a, m) => a + m.protein, 0));
  const totalFat = Math.round(mealLogs.reduce((a, m) => a + m.fat, 0));
  const totalCarbs = Math.round(mealLogs.reduce((a, m) => a + m.carbs, 0));

  const calProgress = Math.min((totalCalories / targetCalories) * 100, 100);
  const protProgress = Math.min((totalProtein / targetProtein) * 100, 100);
  const fatProgress = Math.min((totalFat / targetFat) * 100, 100);
  const carbsProgress = Math.min((totalCarbs / targetCarbs) * 100, 100);

  const remainingCalories = Math.max(targetCalories - totalCalories, 0);

  // Animated display values
  const displayCalories = useCountUp(totalCalories);
  const displayRemaining = useCountUp(remainingCalories);
  const displayProtein = useCountUp(totalProtein);
  const displayFat = useCountUp(totalFat);
  const displayCarbs = useCountUp(totalCarbs);

  const dayOfYear = (() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  })();
  const tipOfDay = TIPS[language][dayOfYear % TIPS[language].length];

  return (
    <div className="space-y-6" id="diary_tab_panel">
      {/* Header */}
      <div className="space-y-1 pt-2 animate-stagger-1">
        <div className="flex items-center gap-2 text-[#8E8E93] text-[13px] font-medium">
          <Flame className="w-3.5 h-3.5 text-brand-primary" />
          <span>{t.subtitle}</span>
        </div>
        <h1
          className="text-[28px] leading-[1.15] font-black text-white tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {t.title}
        </h1>
      </div>

      {/* Calorie hub */}
      <div
        id="calorie_circular_hub"
        className="rounded-3xl p-6 relative overflow-hidden animate-stagger-2"
        style={{
          background: "linear-gradient(180deg, #15151A 0%, #0E0E12 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-brand-primary/8 blur-3xl" />

        <div className="flex flex-col items-center gap-5">
          <ProgressRing
            percentage={calProgress}
            size={200}
            strokeWidth={12}
            color="#00E577"
            gradientId="diaryCalGrad"
          >
            <Flame className="w-6 h-6 text-brand-primary mb-1" />
            <div className="text-[34px] font-black text-white tracking-tighter tabular-nums leading-none">
              {displayCalories}
            </div>
            <div className="text-[10px] text-[#8E8E93] uppercase tracking-[0.2em] font-bold mt-1">
              {t.eaten}
            </div>
            <div className="text-[11px] text-[#8E8E93] mt-1 tabular-nums">
              {t.remaining}:{" "}
              <span className="text-brand-primary font-bold">{displayRemaining}</span>
            </div>
          </ProgressRing>

          <div className="flex items-center justify-around w-full pt-2 border-t border-white/[0.04]">
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold mb-1">
                {t.target}
              </div>
              <div className="text-[15px] font-black text-white tabular-nums">
                {targetCalories}
              </div>
              <div className="text-[10px] text-[#48484A]">{t.kcal}</div>
            </div>
            <div className="w-px h-10 bg-white/[0.06]" />
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold mb-1">
                {t.eaten}
              </div>
              <div className="text-[15px] font-black text-white tabular-nums">
                {displayCalories}
              </div>
              <div className="text-[10px] text-[#48484A]">{t.kcal}</div>
            </div>
            <div className="w-px h-10 bg-white/[0.06]" />
            <div className="text-center">
              <div className="text-[9px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold mb-1">
                {t.remaining}
              </div>
              <div className="text-[15px] font-black text-brand-primary tabular-nums">
                {displayRemaining}
              </div>
              <div className="text-[10px] text-[#48484A]">{t.kcal}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Macros — 3 rings */}
      <div className="grid grid-cols-3 gap-3 animate-stagger-3">
        {[
          { label: t.protein, prog: protProgress, display: displayProtein, target: targetProtein, color: "#00E577" },
          { label: t.fat,     prog: fatProgress,  display: displayFat,     target: targetFat,     color: "#00D9F6" },
          { label: t.carbs,   prog: carbsProgress, display: displayCarbs,  target: targetCarbs,   color: "#A78BFA" },
        ].map((macro) => (
          <div
            key={macro.label}
            className="rounded-2xl p-3 flex flex-col items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.15em] text-[#8E8E93] font-bold">
              {macro.label}
            </div>
            <ProgressRing
              percentage={macro.prog}
              size={68}
              strokeWidth={5.5}
              color={macro.color}
            >
              <div className="text-[10px] font-black tabular-nums text-white">
                {Math.round(macro.prog)}%
              </div>
            </ProgressRing>
            <div className="text-center leading-tight">
              <span className="text-[12px] font-bold text-white tabular-nums">
                {macro.display}g
              </span>
              <span className="text-[10px] text-[#48484A] block tabular-nums">
                / {macro.target}g
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Meal journal */}
      <div className="space-y-3 animate-stagger-4" id="food_journal_list">
        <div className="flex items-center gap-2 px-1">
          <Utensils className="w-3 h-3 text-brand-primary" />
          <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold">
            {t.meals} ({mealLogs.length})
          </h3>
        </div>

        {mealLogs.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            <Apple className="w-9 h-9 text-[#48484A] mx-auto mb-3 stroke-[1.5]" />
            <p className="text-[12px] text-[#8E8E93] leading-relaxed max-w-xs mx-auto">
              {t.empty}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mealLogs.map((log) => {
              const scoreColor =
                log.healthScore >= 75
                  ? "text-brand-primary bg-brand-primary/10 border-brand-primary/20"
                  : log.healthScore >= 50
                  ? "text-[#00D9F6] bg-[#00D9F6]/10 border-[#00D9F6]/20"
                  : "text-red-400 bg-red-500/10 border-red-500/20";

              return (
                <div
                  key={log.id}
                  id={`meal_log_item_${log.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl p-3"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
                      {log.image ? (
                        <img
                          src={log.image}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-[#8E8E93]">
                          {log.productName.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-white truncate">
                        {log.productName}
                      </div>
                      <div className="text-[11px] text-[#8E8E93] mt-0.5 tabular-nums">
                        {log.timestamp} · {log.calories} {t.kcal} · P{Math.round(log.protein)}{" "}
                        F{Math.round(log.fat)} C{Math.round(log.carbs)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold tabular-nums ${scoreColor}`}
                    >
                      {log.healthScore}
                    </div>
                    <button
                      onClick={() => onDeleteLog(log.id)}
                      className="p-1.5 rounded-lg text-[#48484A] hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                      aria-label="delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tip card */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="p-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h5 className="text-[10px] uppercase tracking-[0.18em] text-brand-primary font-bold">
            {t.tipTitle}
          </h5>
          <p className="text-[12px] text-[#8E8E93] leading-relaxed">{tipOfDay}</p>
        </div>
      </div>
    </div>
  );
}
