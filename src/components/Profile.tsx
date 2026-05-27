import { UserProfile, AppLanguage } from "../types";
import { User, Scale, Activity, Heart, ShieldAlert, Award, Lock } from "lucide-react";

interface ProfileProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  language: AppLanguage;
  onStartTour?: () => void;
}

export default function Profile({ profile, setProfile, language, onStartTour }: ProfileProps) {
  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setProfile({ ...profile, [field]: value });
  };

  // Mifflin-St Jeor Formula
  const calculateTargets = () => {
    const { weight, height, age, gender, goal } = profile;
    let bmr = 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age);
    if (gender === "male") {
      bmr += 5;
    } else {
      bmr -= 161;
    }
    
    // Assume moderate active factor 1.375
    let calories = Math.round(bmr * 1.375);
    if (goal === "lose") calories = Math.round(calories * 0.82); // 18% deficit
    if (goal === "gain") calories = Math.round(calories * 1.15); // 15% surplus

    const protein = goal === "gain" ? Math.round(Number(weight) * 2) : Math.round(Number(weight) * 1.6);
    const fat = Math.round(Number(weight) * 0.9);
    const carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);

    return { calories, protein, fat, carbs };
  };

  const targets = calculateTargets();

  const labels = {
    ru: {
      profileTitle: "Параметры здоровья",
      profileSubtitle: "Здесь отображаются ваши зафиксированные биометрические параметры",
      gender: "Пол",
      male: "Мужчина ♂",
      female: "Женщина ♀",
      age: "Возраст (обновляется сам)",
      height: "Рост (зафиксировано)",
      weight: "Ваш текущий вес (кг)",
      goal: "Ваша фитнес-цель",
      goalLose: "Похудение",
      goalMaintain: "Удержание веса",
      goalGain: "Набор массы",
      conditions: "Ограничения в питании / Аллергии",
      conditionsPlaceholder: "Запишите аллергены (например: лактоза, глютен, диабет)",
      conditionsLabel: "Медицинские маркеры",
      resultsTitle: "Суточные нормы БЖУ",
      resultsSubtitle: "Рассчитано по формуле Миффлина-Сан Жеора",
      calories: "Калории",
      protein: "Белки",
      fat: "Жиры",
      carbs: "Углеводы",
      streakBadge: "Вы в спортивной форме!",
      onboardingLocked: "Параметр задан в Onboarding",
      birthdateLabel: "Дата рождения",
      startTourBtn: "Интерактивный AI-Тур ✦"
    },
    uz: {
      profileTitle: "Salomatlik parametrlari",
      profileSubtitle: "Sizning mustahkamlangan biometrik ma'lumotlaringiz",
      gender: "Jins",
      male: "Erkak ♂",
      female: "Ayol ♀",
      age: "Yosh (o'zi yangilanadi)",
      height: "Bo'y (sm) (mustahkamlangan)",
      weight: "Hozirgi vazningiz (kg)",
      goal: "Sizning fitnes maqsadingiz",
      goalLose: "Ozish",
      goalMaintain: "Vazn ushlash",
      goalGain: "Mushak yig'ish",
      conditions: "Oziq-ovqat cheklovlari / Allergiya",
      conditionsPlaceholder: "Allergenlar (masalan: laktoza, kleykovina, qandli diabet)",
      conditionsLabel: "Tibbiy belgi",
      resultsTitle: "Kunlik BJU me'yorlari",
      resultsSubtitle: "Mifflin-San Jeor formulasi asosida hisoblandi",
      calories: "Kaloriya",
      protein: "Oqsillar",
      fat: "Yog'lar",
      carbs: "Uglevodlar",
      streakBadge: "Siz ajoyib fitnes holatidasiz!",
      onboardingLocked: "Onboardingda belgilangan",
      birthdateLabel: "Tug'ilgan sana",
      startTourBtn: "Interaktiv AI Yo'riqnoma ✦"
    }
  }[language];

  return (
    <div className="space-y-6" id="personal_profile_frame">
      {/* Upper Cards */}
      <div className="bg-brand-card p-5 rounded-md border border-brand-border flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-tr from-brand-primary to-brand-blue rounded-full flex items-center justify-center text-black border-2 border-brand-border">
              <User className="w-7 h-7" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-black p-1 rounded-full border border-brand-border">
              <Award className="w-4 h-4 text-brand-primary" />
            </div>
          </div>
          <div className="text-left">
            <span className="inline-block bg-brand-primary/10 text-brand-primary text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-brand-primary/20 mb-1">
              Active Member Telegram SNG
            </span>
            <h2 className="text-lg font-bold text-white leading-tight">Athletic Challenger</h2>
          </div>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-brand-card border border-brand-border p-5 rounded-2xl space-y-5 text-left shadow-xl">
        <div className="border-b border-brand-border pb-3">
          <h3 className="text-base font-bold text-white">{labels.profileTitle}</h3>
          <p className="text-xs text-[#888] mt-1 leading-normal">{labels.profileSubtitle}</p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Locked Gender Field */}
          <div className="col-span-2 bg-[#09090c]/85 border border-[#17171d] p-4 rounded-xl relative">
            <div className="absolute top-3.5 right-4 text-zinc-500 flex items-center gap-1 text-[8px] font-mono tracking-wider">
              <Lock className="w-2.5 h-2.5 text-zinc-550" /> {labels.onboardingLocked.toUpperCase()}
            </div>
            <label className="text-xs text-zinc-500 font-bold block mb-2">{labels.gender}</label>
            <div className="grid grid-cols-2 gap-2">
              <div className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-all ${
                profile.gender === "male"
                  ? "bg-brand-primary/5 text-brand-primary border-brand-primary/20"
                  : "bg-transparent text-zinc-650 border-transparent select-none opacity-20"
              }`}>
                {labels.male}
              </div>
              <div className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-all ${
                profile.gender === "female"
                  ? "bg-brand-primary/5 text-brand-primary border-brand-primary/20"
                  : "bg-transparent text-zinc-650 border-transparent select-none opacity-20"
              }`}>
                {labels.female}
              </div>
            </div>
          </div>

          {/* Locked Birthdate Field with Auto Age Display */}
          <div className="bg-[#09090c]/85 border border-[#17171d] p-4 rounded-xl relative">
            <div className="absolute top-3 right-3 text-zinc-500">
              <Lock className="w-3 h-3 text-zinc-550" />
            </div>
            <label className="text-[11px] text-zinc-500 font-bold block">{labels.birthdateLabel}</label>
            <div className="text-sm font-extrabold text-[#F5F5F7] font-mono mt-1">
              {profile.birthdate || "2000-01-01"}
            </div>
            <p className="text-[10px] text-brand-primary font-mono mt-1 font-bold leading-tight">
              {profile.age} {language === "ru" ? "лет / оқи" : "yosh / o'zi"}
            </p>
          </div>

          {/* Locked Height Field */}
          <div className="bg-[#09090c]/85 border border-[#17171d] p-4 rounded-xl relative">
            <div className="absolute top-3 right-3 text-zinc-500">
              <Lock className="w-3 h-3 text-zinc-555" />
            </div>
            <label className="text-[11px] text-zinc-500 font-bold block">{labels.height}</label>
            <div className="text-sm font-extrabold text-[#F5F5F7] font-mono mt-1">
              {profile.height} см
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 font-semibold leading-tight">
              {language === "ru" ? "Задан в Onboarding" : "Onboardingda berilgan"}
            </p>
          </div>

          {/* Fully Interactive Weight range */}
          <div className="col-span-2 space-y-2 bg-[#0d0d12]/50 border border-brand-border-light p-4 rounded-xl">
            <label className="text-xs text-brand-primary font-bold block">{labels.weight}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="35"
                max="160"
                value={profile.weight}
                onChange={(e) => handleInputChange("weight", Number(e.target.value))}
                className="flex-1 accent-brand-primary h-1 bg-[#111] rounded-lg cursor-pointer"
              />
              <div className="bg-[#070707] px-4 py-2 rounded-xl border border-brand-border-light text-sm font-bold text-white font-mono w-24 text-center shadow-inner">
                {profile.weight} {language === "ru" ? "кг" : "kg"}
              </div>
            </div>
          </div>

          {/* Locked Goal display card */}
          <div className="col-span-2 bg-[#09090c]/85 border border-[#17171d] p-4 rounded-xl relative">
            <div className="absolute top-3.5 right-4 text-zinc-550 flex items-center gap-1 text-[8px] font-mono tracking-wider">
              <Lock className="w-2.5 h-2.5" /> {labels.onboardingLocked.toUpperCase()}
            </div>
            <label className="text-xs text-zinc-500 font-bold block mb-2">{labels.goal}</label>
            <div className="flex items-center gap-3 bg-[#050505] p-3 rounded-lg border border-[#121216]">
              {profile.goal === "lose" && (
                <>
                  <Scale className="w-5 h-5 text-brand-primary" />
                  <div>
                    <div className="text-xs font-bold text-white">{labels.goalLose}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Calorie deficit tier</div>
                  </div>
                </>
              )}
              {profile.goal === "maintain" && (
                <>
                  <Activity className="w-5 h-5 text-brand-primary" />
                  <div>
                    <div className="text-xs font-bold text-white">{labels.goalMaintain}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Calorie balance tier</div>
                  </div>
                </>
              )}
              {profile.goal === "gain" && (
                <>
                  <Heart className="w-5 h-5 text-brand-primary" />
                  <div>
                    <div className="text-xs font-bold text-white">{labels.goalGain}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Calorie surplus tier</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Locked Medical Conditions display */}
          <div className="col-span-2 bg-[#09090c]/85 border border-[#17171d] p-4 rounded-xl relative">
            <div className="absolute top-3.5 right-4 text-zinc-550 flex items-center gap-1 text-[8px] font-mono tracking-wider">
              <Lock className="w-2.5 h-2.5" /> {labels.onboardingLocked.toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold mb-2">
              <ShieldAlert className="w-4 h-4 text-brand-blue" />
              {labels.conditions}
            </div>
            <div className="bg-[#050505]/40 text-xs text-zinc-350 p-3 rounded-lg border border-[#121216] leading-relaxed font-sans min-h-[40px] flex items-center">
              {profile.conditions.trim() || (language === "ru" ? "Ограничения отсутствуют" : "Cheklovlar yo'q")}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive tutorial guide reopen trigger */}
      {onStartTour && (
        <button
          onClick={onStartTour}
          className="w-full bg-[#0a0a0d] hover:bg-black/90 border border-brand-primary/25 hover:border-brand-primary/60 text-brand-primary font-mono font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg cursor-pointer"
        >
          <Award className="w-4 h-4 text-brand-primary animate-pulse" />
          <span className="text-xs uppercase tracking-wider">{labels.startTourBtn}</span>
        </button>
      )}

      {/* Target Results Board */}
      <div className="bg-brand-card border border-brand-border p-5 rounded-2xl text-left space-y-4 shadow-2xl">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">{labels.resultsTitle}</h4>
          <p className="text-[10px] text-[#555] font-mono uppercase font-bold mt-0.5">{labels.resultsSubtitle}</p>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          <div className="p-3 bg-brand-panel border border-brand-border-light rounded-xl text-center space-y-1">
            <div className="text-[10px] text-[#888] uppercase font-mono font-bold">{labels.calories}</div>
            <div id="target_calories_val" className="text-base font-bold text-white font-mono">{targets.calories}</div>
            <div className="text-[9px] text-[#555]">kcal</div>
          </div>
          <div className="p-3 bg-brand-panel border border-brand-border-light rounded-xl text-center space-y-1">
            <div className="text-[10px] text-brand-primary uppercase font-mono font-bold">{labels.protein}</div>
            <div id="target_protein_val" className="text-base font-bold text-brand-primary font-mono">{targets.protein}g</div>
            <div className="text-[9px] text-[#555]">16% - 20%</div>
          </div>
          <div className="p-3 bg-brand-panel border border-brand-border-light rounded-xl text-center space-y-1">
            <div className="text-[10px] text-brand-blue uppercase font-mono font-bold">{labels.fat}</div>
            <div id="target_fat_val" className="text-base font-bold text-brand-blue font-mono">{targets.fat}g</div>
            <div className="text-[9px] text-[#555]">25% - 30%</div>
          </div>
          <div className="p-3 bg-brand-panel border border-brand-border-light rounded-xl text-center space-y-1">
            <div className="text-[10px] text-[#888] uppercase font-mono font-bold">{labels.carbs}</div>
            <div id="target_carbs_val" className="text-base font-bold text-[#AAA] font-mono">{targets.carbs}g</div>
            <div className="text-[9px] text-[#555]">45% - 50%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
