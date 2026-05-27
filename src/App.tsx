import { useState, useEffect } from "react";
import { UserProfile, MealLog, CoachMessage, AppLanguage } from "./types";
import Dashboard from "./components/Dashboard";
import Scanner from "./components/Scanner";
import NutritionCoach from "./components/NutritionCoach";
import Profile from "./components/Profile";
import Onboarding, { calculateAge } from "./components/Onboarding";
import SpotlightTour from "./components/SpotlightTour";
import { storage, getTelegramLanguage, apiFetch, tg } from "./telegram";

import {
  Flame,
  Scan,
  MessageSquare,
  User,
  ShieldCheck,
  Sparkles
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "scanner" | "coach" | "profile">("dashboard");
  const [language, setLanguage] = useState<AppLanguage>(() => getTelegramLanguage() ?? "ru");
  const [showTour, setShowTour] = useState<boolean>(false);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [isThinking, setIsThinking] = useState(false);

  // Hydrate from CloudStorage (with localStorage fallback) on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, m, c] = await Promise.all([
        storage.getItem("sc_user_profile"),
        storage.getItem("sc_meal_logs"),
        storage.getItem("sc_coach_messages"),
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
    storage.setItem("sc_coach_messages", JSON.stringify(messages));
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

  // Switch tabs programmatically
  const navigateToScanTab = () => {
    setActiveTab("scanner");
  };

  return (
    <div className={`min-h-screen bg-brand-bg text-[#F5F5F7] font-sans flex flex-col justify-between selection:bg-brand-primary/30 selection:text-white ${profile.onboarded ? "pb-24" : ""}`}>
      {/* Top Navigation Frame */}
      <header className="sticky top-0 z-40 bg-brand-bg/85 backdrop-blur-md border-b border-brand-border tg-pt-safe">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
          
          {/* Brand block representing Apple + Uber cleanliness */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-black font-extrabold select-none text-sm shadow-md shadow-brand-primary/10 active:scale-95 transition-transform">
              NC
            </div>
            <div className="text-left">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none uppercase">NutriCore AI</h1>
              <span className="text-[9px] text-brand-primary font-bold tracking-widest font-mono select-none">UNICORN PRO</span>
            </div>
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

            {/* Shield system badge to verify sandbox vs real */}
            <div className="p-1 px-1.5 bg-brand-panel rounded-lg border border-brand-border-light text-[10px] text-[#888] flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
              <span>OK</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 scroll-smooth">
        {!hydrated ? (
          <div className="min-h-[75vh] flex flex-col items-center justify-center gap-6 animate-fade-in">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-brand-primary flex items-center justify-center text-black font-extrabold text-2xl shadow-2xl shadow-brand-primary/30">
                NC
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-primary rounded-full animate-ping opacity-60" />
            </div>
            <div className="text-center space-y-1.5">
              {tg?.initDataUnsafe?.user?.first_name ? (
                <h2 className="text-xl font-black text-white">
                  {language === "uz" ? "Xush kelibsiz" : "Добро пожаловать"},{" "}
                  <span className="text-brand-primary">{tg.initDataUnsafe.user.first_name}</span>!
                </h2>
              ) : (
                <h2 className="text-xl font-black text-white">NutriCore AI</h2>
              )}
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-brand-primary" />
                {language === "uz" ? "Yuklanmoqda..." : "Загрузка..."}
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
          <>
            {activeTab === "dashboard" && (
              <Dashboard
                mealLogs={mealLogs}
                onDeleteLog={handleDeleteLog}
                targetCalories={targets.calories}
                targetProtein={targets.protein}
                targetFat={targets.fat}
                targetCarbs={targets.carbs}
                language={language}
                onNavigateToScan={navigateToScanTab}
              />
            )}

            {activeTab === "scanner" && (
              <Scanner
                profile={profile}
                language={language}
                onAddMealLog={handleAddMealLog}
              />
            )}

            {activeTab === "coach" && (
              <NutritionCoach
                profile={profile}
                language={language}
                messages={messages}
                onSendMessage={handleSendMessage}
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
          </>
        )}
      </main>

      {/* Persistent Bottom Utility Tab Navigator */}
      {profile.onboarded && (
        <nav id="bottom_nav_bar" className="fixed bottom-0 left-0 right-0 z-50 bg-brand-bg/95 backdrop-blur-lg border-t border-brand-border py-2.5 tg-pb-safe">
        <div className="max-w-md mx-auto px-3.5 grid grid-cols-4 gap-0.5">
          
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === "dashboard" 
                ? "text-brand-primary font-bold" 
                : "text-[#888] hover:text-[#F5F5F7]"
            }`}
          >
            <Flame className="w-5 h-5" />
            <span className="text-[9px] font-medium uppercase tracking-wider select-none">Diar</span>
          </button>

          <button
            onClick={() => setActiveTab("scanner")}
            id="nav_scanner_tab"
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === "scanner" 
                ? "text-brand-primary font-bold" 
                : "text-[#888] hover:text-[#F5F5F7]"
            }`}
          >
            <Scan className="w-5 h-5" />
            <span className="text-[9px] font-medium uppercase tracking-wider select-none">Scan</span>
          </button>

          <button
            onClick={() => setActiveTab("coach")}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === "coach" 
                ? "text-brand-primary font-bold" 
                : "text-[#888] hover:text-[#F5F5F7]"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-medium uppercase tracking-wider select-none">Coach</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              activeTab === "profile"
                ? "text-brand-primary font-bold"
                : "text-[#888] hover:text-[#F5F5F7]"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-medium uppercase tracking-wider select-none font-bold">Bio</span>
          </button>

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
