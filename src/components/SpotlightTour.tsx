import React, { useState, useEffect } from "react";
import { AppLanguage } from "../types";
import { Play, Sparkles, X, ChevronRight, ChevronLeft, Info, HelpCircle } from "lucide-react";

interface Step {
  targetId: string;
  tab: "home" | "dashboard" | "scanner" | "coach" | "profile";
  ru: {
    title: string;
    description: string;
  };
  uz: {
    title: string;
    description: string;
  };
}

const STEPS: Step[] = [
  {
    targetId: "home_ai_input_pill",
    tab: "home",
    ru: {
      title: "AI-копилот по питанию",
      description: "Сфотографируй, скажи или опиши еду — ИИ мгновенно посчитает калории и БЖУ. Это главный способ добавить приём пищи."
    },
    uz: {
      title: "Ovqatlanish bo'yicha AI-kopilot",
      description: "Suratga ol, ayt yoki tasvirla — sun'iy intellekt kaloriya va KBJUni darhol hisoblaydi. Bu ovqat qo'shishning asosiy usuli."
    }
  },
  {
    targetId: "nav_scanner_tab",
    tab: "home",
    ru: {
      title: "Сканер всегда под рукой",
      description: "Зелёная кнопка по центру открывает камеру и голосовой ввод. Доступна с любого экрана — никаких поисков."
    },
    uz: {
      title: "Skaner doim qo'l ostida",
      description: "Markazdagi yashil tugma kamerani va ovozli kiritishni ochadi. Istalgan ekrandan ishlaydi — qidirishga hojat yo'q."
    }
  },
  {
    targetId: "home_today_strip",
    tab: "home",
    ru: {
      title: "Сводка дня",
      description: "Здесь видно остаток калорий и БЖУ за сегодня. Тапни — попадёшь в дневник с полной аналитикой."
    },
    uz: {
      title: "Kunlik xulosa",
      description: "Bu yerda bugungi kaloriya va KBJU qoldig'i ko'rinadi. Bossang — to'liq tahlil bilan kundalikka o'tasiz."
    }
  },
  {
    targetId: "calorie_circular_hub",
    tab: "dashboard",
    ru: {
      title: "Полная аналитика — Diary",
      description: "Большое кольцо калорий, БЖУ детально, лента приёмов пищи и AI-совет дня. Всё что нужно для анализа прогресса."
    },
    uz: {
      title: "To'liq tahlil — Diary",
      description: "Katta kaloriya halqasi, batafsil KBJU, ovqatlar ro'yxati va kunlik AI maslahat. Progressni tahlil qilish uchun hamma narsa."
    }
  },
  {
    targetId: "chat_input",
    tab: "coach",
    ru: {
      title: "AI-нутрициолог в чате",
      description: "Спроси о любом блюде, попроси составить меню или план тренировок. Coach помнит твою цель и параметры."
    },
    uz: {
      title: "Chatdagi AI-dietolog",
      description: "Istalgan taom haqida so'ra, menyu yoki mashq rejasini tuzishni so'ra. Coach maqsading va parametrlaringni eslab qoladi."
    }
  }
];

interface SpotlightTourProps {
  language: AppLanguage;
  activeTab: "home" | "dashboard" | "scanner" | "coach" | "profile";
  setActiveTab: (tab: "home" | "dashboard" | "scanner" | "coach" | "profile") => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SpotlightTour({
  language,
  activeTab,
  setActiveTab,
  isOpen,
  onClose
}: SpotlightTourProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle auto-switching the tab to make targeted elements visible
  useEffect(() => {
    if (!isOpen) return;
    const currentStep = STEPS[activeStep];
    if (currentStep && activeTab !== currentStep.tab) {
      setActiveTab(currentStep.tab);
    }
  }, [activeStep, isOpen]);

  // Track window resizing for accurate spotlight scaling
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update position of the spotlight box with dynamic state
  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      const currentStep = STEPS[activeStep];
      const element = document.getElementById(currentStep.targetId);
      
      if (element) {
        // Scroll the target element into view smoothly before highlighting
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Wait minor state rendering delay for perfect coordinates
        setTimeout(() => {
          const recalculatedElement = document.getElementById(currentStep.targetId);
          if (recalculatedElement) {
            setRect(recalculatedElement.getBoundingClientRect());
          }
        }, 150);
      } else {
        setRect(null);
      }
    };

    updateRect();
    const scrollTimer = setTimeout(updateRect, 350);

    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      clearTimeout(scrollTimer);
    };
  }, [activeStep, activeTab, isOpen, windowSize]);

  if (!isOpen) return null;

  const stepInfo = STEPS[activeStep];
  const langLabels = {
    ru: {
      btnNext: "Далее",
      btnPrev: "Назад",
      btnSkip: "Пропустить",
      btnFinish: "Готово",
      stepIndicator: "Шаг {current} из {total}",
      tipTitle: "ИНТЕРАКТИВНЫЙ ТУР"
    },
    uz: {
      btnNext: "Keyingi",
      btnPrev: "Orqaga",
      btnSkip: "O'tkazib yuborish",
      btnFinish: "Tugatish",
      stepIndicator: "{current} / {total} qadam",
      tipTitle: "INTERAKTIV YO'RIQNOMA"
    }
  }[language];

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  // Determine where to draw tooltip (prefer bottom, fallback to top if close to edge)
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 32px)",
    maxWidth: "380px",
    zIndex: 150,
  };

  if (rect) {
    const midY = rect.top + rect.height / 2;
    if (midY < window.innerHeight / 2) {
      // Spotlight is in upper half, position tooltip below it
      tooltipStyle.top = `${rect.bottom + 20}px`;
    } else {
      // Spotlight is in lower half, position tooltip above it
      tooltipStyle.bottom = `${window.innerHeight - rect.top + 20}px`;
    }
  } else {
    // Default fallback to center of screen
    tooltipStyle.top = "30%";
  }

  return (
    <div className="fixed inset-0 z-[140] pointer-events-auto overflow-hidden animate-fade-in">
      
      {/* 1. Backdrop overlay with modern glassmorphism blur */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px] transition-all duration-500"
        onClick={onClose}
      />

      {/* 2. Premium Spotlight cutout container using CSS Box Shadow trick */}
      {rect && (
        <div
          className="absolute border-2 border-brand-primary rounded-[18px] transition-all duration-300 ease-out shadow-[0_0_25px_rgba(0,229,119,0.3)] animate-pulse"
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            pointerEvents: "none",
            boxShadow: "0 0 0 9999px rgba(5, 5, 8, 0.85), 0 0 15px rgba(0,229,119,0.2) inset",
          }}
        />
      )}

      {/* 3. Smooth animated pointers pointing to highlighted spotlight */}
      {rect && (
        <div
          className="absolute z-[145] text-brand-primary pointer-events-none transition-all duration-500 ease-out flex flex-col items-center"
          style={{
            position: "fixed",
            left: rect.left + rect.width / 2 - 12,
            top: rect.top + rect.height / 2 < window.innerHeight / 2 ? rect.bottom + 6 : rect.top - 32,
          }}
        >
          {rect.top + rect.height / 2 < window.innerHeight / 2 ? (
            <div className="w-6 h-6 border-b-2 border-r-2 border-brand-primary transform rotate-45 animate-bounce" />
          ) : (
            <div className="w-6 h-6 border-t-2 border-l-2 border-brand-primary transform rotate-45 animate-bounce" />
          )}
        </div>
      )}

      {/* 4. Luxury apple-like floating information board card */}
      <div
        style={tooltipStyle}
        className="bg-[#0C0C10]/95 backdrop-blur-xl border border-white/10 p-5 rounded-[24px] text-left shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4 hover:border-brand-primary/20 transition-all duration-300"
      >
        {/* Card header */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono text-zinc-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            {langLabels.tipTitle}
          </span>
          
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800/50 rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Contents info */}
        <div className="space-y-1.5 pt-1">
          <h4 className="text-sm font-black text-white leading-snug font-sans flex items-center gap-1.5">
            <span className="text-[#888] font-mono font-medium">0{activeStep + 1}.</span>
            {stepInfo && stepInfo[language].title}
          </h4>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
            {stepInfo && stepInfo[language].description}
          </p>
        </div>

        {/* Micro slider pager dot dots indicators */}
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <span className="text-[10px] text-zinc-500 font-mono">
            {langLabels.stepIndicator
              .replace("{current}", (activeStep + 1).toString())
              .replace("{total}", STEPS.length.toString())}
          </span>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === activeStep ? "w-4 bg-brand-primary" : "w-1.5 bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Buttons navigation flow toolbar */}
        <div className="flex justify-between gap-2.5 pt-1">
          <button
            onClick={onClose}
            className="text-[10px] text-zinc-500 hover:text-red-400 font-bold uppercase tracking-wider font-mono cursor-pointer"
          >
            {langLabels.btnSkip}
          </button>

          <div className="flex gap-2">
            {activeStep > 0 && (
              <button
                onClick={handlePrev}
                className="bg-[#111116] hover:bg-zinc-800 border border-white/10 text-[#F5F5F7] p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title={langLabels.btnPrev}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleNext}
              className="bg-brand-primary hover:bg-[#00E577] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-mono flex items-center gap-1 cursor-pointer active:scale-95 shadow-md shadow-brand-primary/10"
            >
              <span>{activeStep === STEPS.length - 1 ? langLabels.btnFinish : langLabels.btnNext}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
