import React from "react";
import { MealLog, AppLanguage } from "../types";
import { Flame, Apple, Sparkles, Plus, Trash2, Trophy, Utensils } from "lucide-react";

// Reusable animated premium circular progress SVG ring
function ProgressRing({
  percentage,
  size,
  strokeWidth,
  color,
  trackColor = "rgba(255, 255, 255, 0.05)",
  gradientId,
  children
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
  const clampedProgress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center animate-fade-in" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E577" />
              <stop offset="100%" stopColor="#00D9F6" />
            </linearGradient>
          </defs>
        )}
        {/* Track / Background Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Active Animated Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={gradientId ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {children && <div className="absolute flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

interface DashboardProps {
  mealLogs: MealLog[];
  onDeleteLog: (id: string) => void;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  language: AppLanguage;
  onNavigateToScan: () => void;
}

export default function Dashboard({
  mealLogs,
  onDeleteLog,
  targetCalories,
  targetProtein,
  targetFat,
  targetCarbs,
  language,
  onNavigateToScan
}: DashboardProps) {
  // Sum consumed
  const totalCalories = mealLogs.reduce((acc, curr) => acc + curr.calories, 0);
  const totalProtein = mealLogs.reduce((acc, curr) => acc + curr.protein, 0);
  const totalFat = mealLogs.reduce((acc, curr) => acc + curr.fat, 0);
  const totalCarbs = mealLogs.reduce((acc, curr) => acc + curr.carbs, 0);

  const calProgress = Math.min((totalCalories / targetCalories) * 100, 100);
  const protProgress = Math.min((totalProtein / targetProtein) * 100, 100);
  const fatProgress = Math.min((totalFat / targetFat) * 100, 100);
  const carbsProgress = Math.min((totalCarbs / targetCarbs) * 100, 100);

  const labels = {
    ru: {
      trackerTitle: "Дневник Питания",
      eaten: "Съедено",
      remaining: "Осталось",
      target: "Норма",
      noMeals: "Еда еще не добавлена. Отсканируйте штрих-код или состав продукта, либо сфотографируйте блюдо, чтобы пополнить счетчик!",
      recentScans: "Сегодняшний рацион",
      scanBtn: "Сканировать продукт",
      caloriesUnit: "ккал",
      proteinLabel: "Белки",
      fatLabel: "Жиры",
      carbsLabel: "Углеводы",
      streakTitle: "Фитнес-прогресс",
      streakBadgeHex: "Уровень: Новичок",
      tipHeader: "AI-Совет Дня",
      tipBody: "Попробуйте пить зелёный чай без сахара между приёмами пищи. Это ускоряет базальный метаболизм в среднем на 3-4%."
    },
    uz: {
      trackerTitle: "Kunlik Ratsion",
      eaten: "Iste'mol qilindi",
      remaining: "Qoldi",
      target: "Me'yor",
      noMeals: "Hali hech narsa qo'shilmadi. Ratsionga kiritish uchun shtrix-kod, mahsulot tarkibini skanerlang yoki taomni rasmga oling!",
      recentScans: "Bugungi ovqatlar ro'yxati",
      scanBtn: "Tahlil skaneri",
      caloriesUnit: "kkal",
      proteinLabel: "Oqsillar",
      fatLabel: "Yog'lar",
      carbsLabel: "Uglevodlar",
      streakTitle: "Sog'liq ko'rsatkichi",
      streakBadgeHex: "Daraja: Yangi boshlovchi",
      tipHeader: "Kunlik AI Maslahat",
      tipBody: "Ovqatlanish oralig'ida shakarsiz ko'k choy ichishni odat qiling. Bu metabolizmni 3-4% tezlashtiradi."
    }
  }[language];

  const remainingCalories = Math.max(targetCalories - totalCalories, 0);

  return (
    <div className="space-y-6" id="dashboard_tab_panel">
      {/* Calories Progress Meter Card */}
      <div className="bg-brand-card p-6 rounded-[28px] border border-brand-border space-y-5 text-left relative overflow-hidden shadow-xl" id="calorie_circular_hub">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-brand-primary uppercase tracking-widest font-extrabold font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              {labels.trackerTitle}
            </span>
            <h3 className="text-lg font-black text-[#F5F5F7] mt-1 tracking-tight">
              {labels.streakTitle}
            </h3>
          </div>
          <div className="bg-[#050505] border border-brand-border-light/60 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] text-brand-primary font-mono font-bold">{labels.streakBadgeHex}</span>
          </div>
        </div>

        {/* Central panel containing Circular Calorie Progress */}
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4 bg-[#060606]/40 rounded-2xl p-5 border border-brand-border-light/40">
          
          {/* Large Calorie Ring */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ProgressRing
              percentage={calProgress}
              size={150}
              strokeWidth={10}
              color="#00E577"
              gradientId="calorieGrad"
            >
              <Flame className="w-5.5 h-5.5 text-brand-primary animate-pulse" />
              <div className="text-2xl font-black text-white tracking-tighter mt-1 font-mono">
                {totalCalories}
              </div>
              <div className="text-[9px] text-[#555] uppercase font-mono font-extrabold tracking-wider">
                {labels.eaten}
              </div>
              <div className="text-[10px] text-[#888] font-mono mt-0.5">
                {labels.remaining}: <span className="text-brand-primary font-bold">{remainingCalories}</span>
              </div>
            </ProgressRing>
          </div>

          {/* Detailed statistics block */}
          <div className="space-y-3.5 flex-1 w-full text-center sm:text-left">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3 bg-[#0e0e0e] rounded-xl border border-brand-border-light/60">
                <div className="text-[9px] text-[#555] font-mono font-bold uppercase">{labels.target}</div>
                <div className="text-sm font-black text-[#F5F5F7] font-mono mt-0.5">{targetCalories} <span className="text-[10px] font-normal text-[#555]">kcal</span></div>
              </div>
              <div className="p-3 bg-[#0e0e0e] rounded-xl border border-brand-border-light/60">
                <div className="text-[9px] text-[#555] font-mono font-bold uppercase">{labels.remaining}</div>
                <div className="text-sm font-black text-brand-primary font-mono mt-0.5">{remainingCalories} <span className="text-[10px] font-normal text-[#555]">kcal</span></div>
              </div>
            </div>
            
            <div className="w-full bg-[#0A0A0A] h-2.5 rounded-full overflow-hidden border border-brand-border-light p-0.5">
              <div 
                id="calorie_progress_bar"
                className="bg-gradient-to-r from-brand-primary to-brand-blue h-full rounded-full transition-all duration-1000" 
                style={{ width: `${calProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#555] font-mono">
              <span>0%</span>
              <span className="text-[#888]">{Math.round(calProgress)}% {labels.eaten.toLowerCase()}</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* BJU progress circular grid */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          
          {/* Protein */}
          <div className="bg-[#080808]/60 border border-brand-border-light/40 rounded-2xl p-3 flex flex-col items-center text-center gap-2">
            <div className="text-[10px] text-[#888] font-extrabold uppercase tracking-wider">{labels.proteinLabel}</div>
            <ProgressRing
              percentage={protProgress}
              size={68}
              strokeWidth={5.5}
              color="#00E577"
            >
              <div className="text-[10px] font-black font-mono text-white">{Math.round(protProgress)}%</div>
            </ProgressRing>
            <div className="text-center mt-1 leading-tight">
              <span className="text-[11px] font-bold text-[#F5F5F7] font-mono">{totalProtein}g</span>
              <span className="text-[9px] text-[#555] font-mono block">/ {targetProtein}g</span>
            </div>
          </div>

          {/* Fats */}
          <div className="bg-[#080808]/60 border border-brand-border-light/40 rounded-2xl p-3 flex flex-col items-center text-center gap-2">
            <div className="text-[10px] text-[#888] font-extrabold uppercase tracking-wider">{labels.fatLabel}</div>
            <ProgressRing
              percentage={fatProgress}
              size={68}
              strokeWidth={5.5}
              color="#00D9F6"
            >
              <div className="text-[10px] font-black font-mono text-white">{Math.round(fatProgress)}%</div>
            </ProgressRing>
            <div className="text-center mt-1 leading-tight">
              <span className="text-[11px] font-bold text-[#F5F5F7] font-mono">{totalFat}g</span>
              <span className="text-[9px] text-[#555] font-mono block">/ {targetFat}g</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="bg-[#080808]/60 border border-brand-border-light/40 rounded-2xl p-3 flex flex-col items-center text-center gap-2">
            <div className="text-[10px] text-[#888] font-extrabold uppercase tracking-wider">{labels.carbsLabel}</div>
            <ProgressRing
              percentage={carbsProgress}
              size={68}
              strokeWidth={5.5}
              color="#8E8E93"
            >
              <div className="text-[10px] font-black font-mono text-white">{Math.round(carbsProgress)}%</div>
            </ProgressRing>
            <div className="text-center mt-1 leading-tight">
              <span className="text-[11px] font-bold text-[#F5F5F7] font-mono">{totalCarbs}g</span>
              <span className="text-[9px] text-[#555] font-mono block">/ {targetCarbs}g</span>
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Ingress Button */}
      <button
        onClick={onNavigateToScan}
        id="btn_navigate_scanner"
        className="w-full bg-brand-primary hover:bg-[#00E577] active:scale-[0.98] text-black font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-brand-primary/10 flex items-center justify-center gap-2.5 transition-all text-xs uppercase tracking-widest font-mono"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        {labels.scanBtn}
      </button>

      {/* Eaten Food Journal List */}
      <div className="space-y-3.5 text-left" id="food_journal_list">
        <h4 className="text-xs font-mono text-brand-primary uppercase tracking-widest flex items-center gap-2">
          <Utensils className="w-3.5 h-3.5" />
          {labels.recentScans} ({mealLogs.length})
        </h4>

        {mealLogs.length === 0 ? (
          <div className="bg-brand-card border border-dashed border-brand-border p-8 rounded-[24px] text-center">
            <Apple className="w-10 h-10 text-brand-border-light mx-auto mb-3 stroke-[1.5]" />
            <p className="text-xs text-[#888] leading-relaxed max-w-xs mx-auto">
              {labels.noMeals}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {mealLogs.map((log) => {
              // Score colors based on brand guidance
              const scoreColor = log.healthScore >= 75
                ? "text-brand-primary border-brand-primary/20 bg-brand-primary/5"
                : log.healthScore >= 50
                ? "text-brand-blue border-brand-blue/20 bg-brand-blue/5"
                : "text-red-400 border-red-500/20 bg-red-500/5";

              return (
                <div 
                  key={log.id} 
                  id={`meal_log_item_${log.id}`}
                  className="bg-brand-card border border-brand-border p-3.5 rounded-2xl flex items-center justify-between hover:border-brand-border-light transition-all gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 bg-brand-panel rounded-xl flex items-center justify-center border border-brand-border font-extrabold font-mono text-[10px] text-[#888] shrink-0 select-none overflow-hidden">
                      {log.image ? (
                        <img 
                          src={log.image} 
                          alt="Food" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>{log.productName.slice(0, 3).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{log.productName}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#555] font-mono mt-0.5">
                        <span>{log.timestamp}</span>
                        <span>•</span>
                        <span className="text-[#888]">{log.calories} kcal</span>
                        <span>•</span>
                        <span>P:{Math.round(log.protein)} F:{Math.round(log.fat)} C:{Math.round(log.carbs)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Score badge in log */}
                    <div className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold ${scoreColor}`}>
                      {log.healthScore}
                    </div>

                    <button
                      onClick={() => onDeleteLog(log.id)}
                      id={`delete_log_btn_${log.id}`}
                      className="p-1.5 hover:bg-brand-panel/60 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete log"
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

      {/* Sparkles Tip card */}
      <div className="bg-brand-card rounded-2xl border border-brand-border p-4 flex items-start text-left gap-3.5 shadow-md">
        <div className="p-1.5 bg-brand-primary/10 rounded-lg border border-brand-primary/20 text-brand-primary">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h5 className="text-xs font-mono text-brand-primary uppercase tracking-widest">{labels.tipHeader}</h5>
          <p className="text-[11px] text-[#888] leading-relaxed">{labels.tipBody}</p>
        </div>
      </div>
    </div>
  );
}
