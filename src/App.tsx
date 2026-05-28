import { useState, useEffect } from "react";
import { UserProfile, MealLog, CoachMessage, AppLanguage } from "./types";
import Home from "./components/Home";
import Diary from "./components/Diary";
import Scanner from "./components/Scanner";
import NutritionCoach from "./components/NutritionCoach";
import Profile from "./components/Profile";
import Onboarding, { calculateAge } from "./components/Onboarding";
import SpotlightTour from "./components/SpotlightTour";
import { storage, getTelegramLanguage, apiFetch, tg } from "./telegram";

import {
  Home as HomeIcon,
  BookOpen,
  MessageSquare,
  Scan,
  Sparkles,
} from "lucide-react";

const DEFAULT_PROFILE: UserProfile = {
  age: 0,
  birthdate: "",
  height: 0,
  weight: 0,
  gender: "male",
  goal: "maintain",
  conditions: "",
  onboarded: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "dashboard" | "scanner" | "coach" | "profile">("home");
  const [scanMode, setScanMode] = useState<"camera" | "voice" | "text">("voice");
  const [scanPrefill, setScanPrefill] = useState<string | undefined>(undefined);

  // Clear prefill once Scanner mounts and has consumed it
  useEffect(() => {
    if (activeTab === "scanner" && scanPrefill) {
      const t = setTimeout(() => setScanPrefill(undefined), 300);
      return () => clearTimeout(t);
    }
  }, [activeTab, scanPrefill]);
  const [language, setLanguage] = useState<AppLanguage>(() => getTelegramLanguage() ?? "ru");
  const [showTour, setShowTour] = useState<boolean>(false);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const [isThinking, setIsThinking] = useState(false);

  // Hydrate from CloudStorage (with localStorage fallback) on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, m, c] = await Promise.all([
        storage.getItem("sc_user_profile"),
        storage.getItem("sc_meal_logs"),
        storage.getItem("sc_coach_messages"),
        // Enforce minimum 2-second splash so the greeting is readable
        new Promise((r) => setTimeout(r, 2000)),
      ]);
      if (cancelled) return;

      if (p) {
        try {
          const parsed = JSON.parse(p);
          if (parsed.birthdate) parsed.age = calculateAge(parsed.birthdate);
          setProfile(parsed);
        } catch {}
      }
      if (m) {
        try {
          const parsed: MealLog[] = JSON.parse(m);
          // Strip legacy stub entries that shipped with the old DEFAULT_MEAL_LOGS
          const LEGACY_IDS = new Set(["init_log_1", "init_log_2"]);
          setMealLogs(parsed.filter((log) => !LEGACY_IDS.has(log.id)));
        } catch {}
      }
      if (c) {
        try { setMessages(JSON.parse(c)); } catch {}
      }
      setHydrated(true);
      setSplashDone(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist state — but only after hydration so we don't overwrite stored
  // data with the initial defaults on first mount.
  useEffect(() => {
    if (!hydrated) return;
    storage.setItem("sc_user_profile", JSON.stringify(profile));
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    storage.setItem("sc_meal_logs", JSON.stringify(mealLogs));
  }, [mealLogs, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    // Keep only the last 50 messages to stay well within CloudStorage limits.
    const toSave = messages.length > 50 ? messages.slice(-50) : messages;
    storage.setItem("sc_coach_messages", JSON.stringify(toSave));
  }, [messages, hydrated]);

  // Seed the first greeting only after hydration, so we don't overwrite
  // a restored chat history from CloudStorage.
  useEffect(() => {
    if (!hydrated) return;
    if (messages.length === 0) {
      const defaultGreet = language === "uz"
        ? "Assalomu alaykum! Men sizning shaxsiy AI parhez va fitnes maslahatchingizman. O'zbekistondagi milliy taomlar yoki do'kondagi turli mahsulotlar borasida qanday savollaringiz bor? Istagan savolingizni bera olasiz!"
        : "Приветствую вас! Я ваш карманный AI Нутрициолог и коуч по фитнесу. Оцифруйте ваш рацион: спросите меня об узбекских блюдах (плов, сомса, лаваш) или магазинных продуктах в СНГ. Чем могу помочь?";

      setMessages([
        {
          id: "greet_1",
          role: "coach",
          text: defaultGreet,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  }, [language, hydrated]);

  // Delete logged items
  const handleDeleteLog = (id: string) => {
    setMealLogs(mealLogs.filter(log => log.id !== id));
  };

  // Inject a coach message directly (used by weekly digest)
  const handleInjectCoachMessage = (text: string) => {
    const msg: CoachMessage = {
      id: "coach_inject_" + Date.now(),
      role: "coach",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msg]);
  };

  // Add a newly scanned item to the logged meal calendar list
  const handleAddMealLog = (newLog: Omit<MealLog, "id" | "timestamp">) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const logItem: MealLog = {
      ...newLog,
      id: "scan_" + Date.now(),
      timestamp: timeStr
    };
    setMealLogs([logItem, ...mealLogs]);
  };

  // Calculate targets from user profiles
  const getBiometricTargets = () => {
    let bmr = 10 * Number(profile.weight) + 6.25 * Number(profile.height) - 5 * Number(profile.age);
    if (profile.gender === "male") {
      bmr += 5;
    } else {
      bmr -= 161;
    }
    
    let calories = Math.round(bmr * 1.375); // Active coefficient multiplier
    if (profile.goal === "lose") calories = Math.round(calories * 0.82); // 18% deficit
    if (profile.goal === "gain") calories = Math.round(calories * 1.15); // 15% surplus

    const protein = profile.goal === "gain" ? Math.round(Number(profile.weight) * 2) : Math.round(Number(profile.weight) * 1.6);
    const fat = Math.round(Number(profile.weight) * 0.9);
    const carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);

    return { calories, protein, fat, carbs };
  };

  const targets = getBiometricTargets();

  // Handle smart chat message delivery to the server side
  const handleSendMessage = async (userText: string) => {
    const userMsg: CoachMessage = {
      id: "user_" + Date.now(),
      role: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setIsThinking(true);

    try {
      const resp = await apiFetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          // Sync last 6 history turns to save tokens safely
          history: updatedHistory.slice(-6).map(m => ({
            role: m.role === "user" ? "user" : "model",
            text: m.text
          })),
          userProfile: profile,
          language: language
        })
      });

      const data = await resp.json();
      if (data.success) {
        const coachMsg: CoachMessage = {
          id: "coach_" + Date.now(),
          role: "coach",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setMessages(prev => [...prev, coachMsg]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      const errResponse: CoachMessage = {
        id: "err_" + Date.now(),
        role: "coach",
        text: language === "uz" 
          ? "Kechirasiz, aloqa o'rnatishda muammo paydo bo'ldi. Iltimos, server sozlamalari yoki internet ulanishini tekshiring." 
          : "Извините, не удалось связаться с сервером. Пожалуйста, проверьте состояние сети или правильность настройки OPENAI_API_KEY.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errResponse]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className={`min-h-screen bg-brand-bg text-[#F5F5F7] font-sans flex flex-col justify-between selection:bg-brand-primary/30 selection:text-white ${profile.onboarded ? "pb-24" : ""}`}>
      {/* Top Navigation Frame */}
      <header className="sticky top-0 z-40 bg-brand-bg/85 backdrop-blur-md border-b border-brand-border tg-pt-safe">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
          
          {/* Brand block */}
          <div className="flex items-center">
            <img src="/logo-lockup.svg" alt="NutriCore AI" className="h-9 w-auto select-none" draggable={false} />
          </div>

          {/* Languages switch + specs fast link */}
          <div className="flex items-center gap-2">
            
            {/* Lang toggler */}
            <div className="flex bg-brand-panel p-0.5 rounded-lg border border-brand-border-light">
              <button
                onClick={() => setLanguage("ru")}
                className={`text-[9px] px-2 py-1 rounded font-bold transition-all ${
                  language === "ru" 
                    ? "bg-brand-border-light text-brand-primary font-black shadow-sm" 
                    : "text-[#888] hover:text-[#F5F5F7]"
                }`}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage("uz")}
                className={`text-[9px] px-2 py-1 rounded font-bold transition-all ${
                  language === "uz" 
                    ? "bg-brand-border-light text-brand-primary font-black shadow-sm" 
                    : "text-[#888] hover:text-[#F5F5F7]"
                }`}
              >
                UZB
              </button>
            </div>

            {/* Avatar — entry to Profile */}
            <button
              onClick={() => setActiveTab("profile")}
              aria-label="profile"
              className={`relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-all active:scale-95 ${
                activeTab === "profile"
                  ? "ring-2 ring-brand-primary"
                  : "ring-1 ring-white/10 hover:ring-white/20"
              }`}
              style={{ background: "linear-gradient(135deg, #1B1B20 0%, #131316 100%)" }}
            >
              <span className="text-[12px] font-bold text-white">
                {(tg?.initDataUnsafe?.user?.first_name?.[0] ?? "U").toUpperCase()}
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 scroll-smooth">
        {!splashDone ? (
          <div className="min-h-[75vh] flex flex-col items-center justify-center gap-8 animate-fade-in">
            {/* Logo icon */}
            <div className="relative w-24 h-24">
              <img src="/logo-icon.svg" alt="NutriCore" className="w-24 h-24 select-none drop-shadow-2xl" draggable={false} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 bg-[#5BA300] rounded-full animate-ping opacity-60" />
              </div>
            </div>

            <div className="text-center space-y-2">
              {tg?.initDataUnsafe?.user?.first_name ? (
                <h2 className="text-2xl font-black text-white leading-tight">
                  {language === "uz" ? "Xush kelibsiz" : "Добро пожаловать"},{" "}
                  <span style={{ color: "#5BA300" }}>{tg.initDataUnsafe.user.first_name}</span>!
                </h2>
              ) : (
                <h2 className="text-2xl font-black text-white">NutriCore AI</h2>
              )}
              <p className="text-xs text-zinc-500">
                {language === "uz" ? "Shaxsiy AI dietolog va fitnes coach" : "Персональный AI нутрициолог и фитнес-коуч"}
              </p>
            </div>

            {/* Animated progress bar — fills over 2 seconds */}
            <div className="w-56 space-y-2">
              <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-primary rounded-full"
                  style={{ animation: "splashProgress 2s cubic-bezier(0.4,0,0.2,1) forwards" }}
                />
              </div>
              <p className="text-[10px] text-zinc-600 font-mono text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-brand-primary" />
                {language === "uz" ? "Sozlanmoqda..." : "Настраивается..."}
              </p>
            </div>
          </div>
        ) : !profile.onboarded ? (
          <Onboarding
            language={language}
            onComplete={(newProfile) => {
              setProfile(newProfile);
              // Instantly fire premium apple/linear interactive Spotlight guided tutorial!
              setShowTour(true);
            }}
          />
        ) : (
          <div key={activeTab} className="animate-fade-in">
            {activeTab === "home" && (
              <Home
                mealLogs={mealLogs}
                targetCalories={targets.calories}
                targetProtein={targets.protein}
                targetFat={targets.fat}
                targetCarbs={targets.carbs}
                language={language}
                onOpenScanner={(mode, prefill) => {
                  if (mode === "photo") setScanMode("camera");
                  else if (mode === "voice") setScanMode("voice");
                  else setScanMode("text");
                  if (prefill) setScanPrefill(prefill);
                  setActiveTab("scanner");
                }}
                onNavigateToDiary={() => setActiveTab("dashboard")}
                onNavigateToCoach={() => setActiveTab("coach")}
              />
            )}

            {activeTab === "dashboard" && (
              <Diary
                mealLogs={mealLogs}
                onDeleteLog={handleDeleteLog}
                targetCalories={targets.calories}
                targetProtein={targets.protein}
                targetFat={targets.fat}
                targetCarbs={targets.carbs}
                language={language}
              />
            )}

            {activeTab === "scanner" && (
              <Scanner
                profile={profile}
                language={language}
                onAddMealLog={handleAddMealLog}
                initialMode={scanMode}
                initialText={scanPrefill}
              />
            )}

            {activeTab === "coach" && (
              <NutritionCoach
                profile={profile}
                language={language}
                messages={messages}
                mealLogs={mealLogs}
                onSendMessage={handleSendMessage}
                onInjectCoachMessage={handleInjectCoachMessage}
                isThinking={isThinking}
              />
            )}

            {activeTab === "profile" && (
              <Profile
                profile={profile}
                setProfile={setProfile}
                language={language}
                onStartTour={() => setShowTour(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Scan FAB — primary product CTA */}
      {profile.onboarded && (
        <button
          id="nav_scanner_tab"
          onClick={() => {
            try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}
            setScanMode("camera");
            setActiveTab("scanner");
          }}
          aria-label="scan"
          className="fixed left-1/2 z-[55] no-select animate-fab-float"
          style={{
            bottom: "calc(52px + max(var(--tg-safe-bottom), env(safe-area-inset-bottom)))",
            transform: "translateX(-50%)",
          }}
        >
          {/* Outer ambient glow — blurred halo */}
          <span
            className="absolute inset-[-6px] rounded-full blur-xl pointer-events-none"
            style={{ background: "rgba(0,229,119,0.3)" }}
          />
          {/* Button face */}
          <span
            className="relative flex items-center justify-center w-[60px] h-[60px] rounded-full active:scale-90 transition-transform duration-150"
            style={{
              background: "linear-gradient(180deg, #00FF85 0%, #00C964 100%)",
              boxShadow:
                "0 0 0 3.5px rgba(10,10,11,0.97), 0 8px 20px rgba(0,229,119,0.4), inset 0 1px 0 rgba(255,255,255,0.45)",
            }}
          >
            <Scan className="w-6 h-6 text-black" strokeWidth={2.6} />
          </span>
        </button>
      )}

      {/* Bottom Nav — 3 tabs, FAB occupies center gap */}
      {profile.onboarded && (
        <nav
          id="bottom_nav_bar"
          className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t tg-pb-safe"
          style={{
            background: "rgba(10,10,11,0.85)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div className="max-w-md mx-auto px-4 py-1.5 grid grid-cols-3 gap-1">
            {(
              [
                { id: "home",      Icon: HomeIcon,      label: "Home" },
                { id: "dashboard", Icon: BookOpen,       label: "Diary" },
                { id: "coach",     Icon: MessageSquare,  label: "Coach" },
              ] as const
            ).map(({ id, Icon, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    try { tg?.HapticFeedback?.impactOccurred?.("light"); } catch {}
                    setActiveTab(id);
                  }}
                  className={`relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl no-select transition-colors duration-150 ${
                    active ? "text-brand-primary" : "text-[#8E8E93] active:text-white"
                  }`}
                >
                  <span
                    className="transition-transform duration-150"
                    style={{ transform: active ? "scale(1.1)" : "scale(1)" }}
                  >
                    <Icon
                      className="w-[22px] h-[22px]"
                      strokeWidth={active ? 2.4 : 1.8}
                    />
                  </span>
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                  {/* Active indicator dot */}
                  <span
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all duration-200"
                    style={{
                      width: active ? "20px" : "0px",
                      background: "#00FF85",
                      opacity: active ? 1 : 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {profile.onboarded && (
        <SpotlightTour
          language={language}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={showTour}
          onClose={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
