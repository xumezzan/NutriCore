import React, { useState, useEffect } from "react";
import { UserProfile, AppLanguage } from "../types";
import { Sparkles, Calendar, Scale, Activity, Heart, ArrowRight } from "lucide-react";
import { tg, hapticImpact } from "../telegram";

interface OnboardingProps {
  language: AppLanguage;
  onComplete: (profile: UserProfile) => void;
}

export function calculateAge(birthdateStr: string): number {
  if (!birthdateStr) return 26;
  const birthDate = new Date(birthdateStr);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) || age < 1 ? 26 : age;
}

export default function Onboarding({ language, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<number>(1);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birthdate, setBirthdate] = useState<string>("2000-01-01");
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(72);
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">("lose");
  const [conditions, setConditions] = useState<string>("");

  const labels = {
    ru: {
      welcome: "Добро пожаловать в NutriCore AI!",
      subtitle: "Давайте настроим ваш профиль один раз для индивидуального подбора КБЖУ и спортивных советов.",
      stepLabel: "Шаг {step} из 4",
      genderTitle: "Укажите ваш пол",
      genderSubtitle: "Выбирается один раз и не подлежит изменению",
      male: "Мужчина ♂",
      female: "Женщина ♀",
      birthdateTitle: "Дата рождения",
      birthdateSubtitle: "Ваш возраст будет обновляться автоматически на основе даты рождения",
      heightTitle: "Укажите ваш рост",
      heightSubtitle: "Понадобится для расчёта расхода калорий (вводится один раз)",
      weightTitle: "Текущий вес",
      weightSubtitle: "Вы сможете легко обновлять свой вес по мере фитнес-прогресса в профиле",
      goalTitle: "Ваша фитнес-цель",
      goalSubtitle: "Это настроит суточный дефицит или профицит калорий",
      goalLose: "Похудение",
      goalMaintain: "Удержание веса",
      goalGain: "Набор массы",
      conditionsLabel: "Медицинские маркеры / Аллергии (Необязательно)",
      conditionsPlaceholder: "Запишите аллергены (например: без лактозы, диабет, нет сахару)",
      next: "Продолжить",
      start: "Создать профиль",
      invalidBirthdate: "Пожалуйста, введите корректную дату рождения",
      cm: "см",
      kg: "кг"
    },
    uz: {
      welcome: "NutriCore AI-ga xush kelibsiz!",
      subtitle: "Shaxsiy KBJU me'yorlari va tahlillarini hisoblash uchun profilingizni bir marta sozlab olamiz.",
      stepLabel: "{step} / 4 qadam",
      genderTitle: "Jinsingizni belgilang",
      genderSubtitle: "Bu ma'lumot faqat bir marta tanlanadi va keyin o'zgarmaydi",
      male: "Erkak ♂",
      female: "Ayol ♀",
      birthdateTitle: "Tugʻilgan sanangiz",
      birthdateSubtitle: "Yoshingiz tug'ilgan kuningizga qarab avtomat ravishda yangilanadi",
      heightTitle: "Bo'yingizni kiriting",
      heightSubtitle: "Kaloriya sarfini aniq hisoblash uchun kerak bo'ladi (bir marta kiritiladi)",
      weightTitle: "Hozirgi vazningiz",
      weightSubtitle: "Vazningizni keyinchalik bio sahifada xohlagancha o'zgartirishingiz mumkin",
      goalTitle: "Sizning fitnes maqsadingiz",
      goalSubtitle: "Bu kunlik kaloriya tanqisligi yoki ortiqchaligini belgilaydi",
      goalLose: "Ozish (Defitsit)",
      goalMaintain: "Vazn ushlash",
      goalGain: "Mushak yig'ish (Profitsit)",
      conditionsLabel: "Tibbiy cheklovlar / Allergiya (Majburiy emas)",
      conditionsPlaceholder: "Masalan: laktoza, kleykovina, diabet, shakarsiz",
      next: "Davom etish",
      start: "Profil yaratish",
      invalidBirthdate: "Iltimos, tug'ilgan sanangizni to'g'ri kiriting",
      cm: "sm",
      kg: "kg"
    }
  }[language];

  const handleNext = () => {
    if (step === 2) {
      if (!birthdate) {
        alert(labels.invalidBirthdate);
        return;
      }
    }
    hapticImpact("light");
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    hapticImpact("light");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleComplete = () => {
    hapticImpact("medium");
    const calculatedAge = calculateAge(birthdate);
    onComplete({
      age: calculatedAge,
      birthdate,
      height,
      weight,
      gender,
      goal,
      conditions,
      onboarded: true
    });
  };

  // Wire native Telegram BackButton + MainButton to the same handlers, so the
  // onboarding feels native inside the Mini App on iOS/Android/Desktop.
  useEffect(() => {
    if (!tg) return;

    // BackButton: visible on every step except the first.
    if (step > 1) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } else {
      tg.BackButton.hide();
    }

    // MainButton: drives "next" / "create profile".
    const mainHandler = () => {
      if (step < 4) handleNext();
      else handleComplete();
    };
    tg.MainButton.setText(step < 4 ? labels.next : labels.start);
    tg.MainButton.show();
    tg.MainButton.enable();
    tg.MainButton.onClick(mainHandler);

    return () => {
      tg.BackButton.offClick(handleBack);
      tg.MainButton.offClick(mainHandler);
      // Hide once the component unmounts (onboarding finished).
      tg.MainButton.hide();
      tg.BackButton.hide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, language, birthdate, height, weight, gender, goal, conditions]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-brand-card border border-brand-border p-6 rounded-[28px] text-left space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header Title */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-brand-primary uppercase tracking-widest font-mono font-extrabold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            NutriCore Unicorn Pro
          </span>
          <h2 className="text-xl font-black text-white leading-tight">
            {step === 1 ? labels.welcome : labels.stepLabel.replace("{step}", step.toString())}
          </h2>
          <p className="text-xs text-zinc-400">
            {step === 1 ? labels.subtitle : ""}
          </p>
        </div>

        {/* Progress horizontal steps indicators */}
        <div className="flex gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-brand-primary" : "bg-brand-line-dark"
              }`}
            />
          ))}
        </div>

        {/* STEP 1: GENDER */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-bold text-[#F5F5F7] block">
                {labels.genderTitle}
              </label>
              <p className="text-[11px] text-zinc-400 block leading-tight">
                {labels.genderSubtitle}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`py-5 px-4 rounded-2xl text-sm font-mono font-bold border transition-all flex flex-col items-center justify-center gap-2 ${
                  gender === "male"
                    ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                    : "bg-[#070707] text-[#888] border-brand-border hover:border-zinc-500"
                }`}
              >
                <span className="text-2xl">👨</span>
                {labels.male}
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`py-5 px-4 rounded-2xl text-sm font-mono font-bold border transition-all flex flex-col items-center justify-center gap-2 ${
                  gender === "female"
                    ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                    : "bg-[#070707] text-[#888] border-brand-border hover:border-zinc-500"
                }`}
              >
                <span className="text-2xl">👩</span>
                {labels.female}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BIRTHDATE & HEIGHT */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            {/* Birthdate */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#F5F5F7] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-blue" />
                {labels.birthdateTitle}
              </label>
              <p className="text-[11px] text-zinc-400 leading-tight">
                {labels.birthdateSubtitle}
              </p>
              <input
                type="date"
                value={birthdate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full bg-[#070707] border border-brand-border rounded-xl py-3 px-4 text-sm text-[#F5F5F7] focus:outline-none focus:border-brand-primary cursor-pointer font-mono"
              />
              <div className="text-[10px] text-brand-primary font-mono mt-0.5">
                {labels.birthdateSubtitle.split(" ")[0]} age: <span className="font-bold">{calculateAge(birthdate)} yrs</span>
              </div>
            </div>

            {/* Height */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-[#F5F5F7] block">
                {labels.heightTitle}
              </label>
              <p className="text-[11px] text-[#888] leading-tight">
                {labels.heightSubtitle}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="100"
                  max="230"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="flex-1 accent-brand-primary h-1 bg-[#0A0A0A] rounded-lg cursor-pointer"
                />
                <div className="bg-[#070707] px-4 py-2.5 rounded-xl border border-brand-border text-sm font-bold text-white font-mono w-24 text-center">
                  {height} {labels.cm}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INITIAL WEIGHT & GOALS */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            {/* Weight */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#F5F5F7] block">
                {labels.weightTitle}
              </label>
              <p className="text-[11px] text-zinc-400 leading-tight">
                {labels.weightSubtitle}
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="35"
                  max="160"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="flex-1 accent-brand-primary h-1 bg-[#0A0A0A] rounded-lg cursor-pointer"
                />
                <div className="bg-[#070707] px-4 py-2.5 rounded-xl border border-brand-border text-sm font-bold text-white font-mono w-24 text-center">
                  {weight} {labels.kg}
                </div>
              </div>
            </div>

            {/* Goal Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-[#F5F5F7] block mb-1">
                {labels.goalTitle}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGoal("lose")}
                  className={`py-3 px-1 rounded-xl text-center text-[11px] font-bold border transition-all flex flex-col items-center gap-1.5 ${
                    goal === "lose"
                      ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                      : "bg-[#070707] text-[#888] border-brand-border hover:border-zinc-500"
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  {labels.goalLose}
                </button>
                <button
                  type="button"
                  onClick={() => setGoal("maintain")}
                  className={`py-3 px-1 rounded-xl text-center text-[11px] font-bold border transition-all flex flex-col items-center gap-1.5 ${
                    goal === "maintain"
                      ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                      : "bg-[#070707] text-[#888] border-brand-border hover:border-zinc-500"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  {labels.goalMaintain}
                </button>
                <button
                  type="button"
                  onClick={() => setGoal("gain")}
                  className={`py-3 px-1 rounded-xl text-center text-[11px] font-bold border transition-all flex flex-col items-center gap-1.5 ${
                    goal === "gain"
                      ? "bg-brand-primary/10 text-brand-primary border-brand-primary"
                      : "bg-[#070707] text-[#888] border-brand-border hover:border-zinc-500"
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  {labels.goalGain}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: HEALTH CONDITIONS / ALLERGIES */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#F5F5F7] block">
                {labels.conditionsLabel}
              </label>
              <textarea
                rows={3}
                placeholder={labels.conditionsPlaceholder}
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                className="w-full bg-[#070707] border border-brand-border rounded-xl p-3.5 text-xs text-[#F5F5F7] placeholder-[#444] focus:outline-none focus:border-brand-primary resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="pt-2 flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="bg-brand-panel hover:bg-brand-border-light border border-brand-border text-[#888] hover:text-white px-5 rounded-xl text-xs font-bold transition-all uppercase"
            >
              ←
            </button>
          )}

          <button
            onClick={step < 4 ? handleNext : handleComplete}
            className="flex-1 bg-brand-primary hover:bg-[#00E577] text-black font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest font-mono flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {step < 4 ? (
              <>
                <span>{labels.next}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span>{labels.start}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
