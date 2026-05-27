import React, { useState, useRef, useMemo, useEffect } from "react";
import { UserProfile, AnalysisResult, MealLog, AppLanguage } from "../types";
import { apiFetch } from "../telegram";
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  Search,
  Coffee,
  UserCheck,
  Mic,
  MicOff,
  Keyboard,
  ClipboardList,
} from "lucide-react";

type ScanMode = "camera" | "voice" | "text";

interface ScannerProps {
  profile: UserProfile;
  language: AppLanguage;
  onAddMealLog: (log: Omit<MealLog, "id" | "timestamp">) => void;
  initialMode?: ScanMode;
  initialText?: string;
}

export default function Scanner({ profile, language, onAddMealLog, initialMode, initialText }: ScannerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [useUploadMethod, setUseUploadMethod] = useState<ScanMode>(initialMode ?? "voice");

  useEffect(() => {
    if (initialMode) setUseUploadMethod(initialMode);
  }, [initialMode]);

  // Pre-fill voice/text input when arriving from chip or insight CTA
  useEffect(() => {
    if (initialText) setVoiceText(initialText);
  }, [initialText]);
  const [scanResult, setScanResult] = useState<AnalysisResult | null>(null);
  const [loggedAddedAlert, setLoggedAddedAlert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice scanning variables
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [pillsSeed, setPillsSeed] = useState(0);
  const [voiceResult, setVoiceResult] = useState<{
    items: Array<{
      productName: string;
      weightGrams: number;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
      healthScore: number;
      cookingMethod: string;
    }>;
    coachSummary: string;
  } | null>(null);
  const [addedItemsIndices, setAddedItemsIndices] = useState<number[]>([]);

  const labels = {
    ru: {
      headerTitle: "Сканер рациона & AI Голос",
      headerSubtitle: "Диктуйте рацион на весь день, узнавайте способ приготовления и КБЖУ блюд",
      tabCamera: "Камера / Фото состава",
      tabVoice: "Голос / Весь день",
      uploadPlaceholder: "Нажмите для съемки или выбора фото из галереи",
      analyzeBtn: "Запустить AI Анализ",
      analyzingState: "Идет OCR распознавание состава через Gemini...",
      scoreLabel: "Health Score",
      novaLabel: "Обработка еды",
      nova1: "Цельный продукт (NOVA 1)",
      nova2: "Кулинарный ингредиент (NOVA 2)",
      nova3: "Обработанный продукт (NOVA 3)",
      nova4: "Ультраобработанный продукт (NOVA 4)",
      prosCons: "Анализ состава и добавок",
      ingredientsFound: "Распознанные ингредиенты",
      allergens: "Аллергены и Риски",
      internetFeedback: "Отзывы и Обзоры в Сети",
      reputation: "Оценка бренда:",
      goalAdaptation: "Адаптация под вашу цель",
      logMealBtn: "Внести в дневник питания",
      addedSuccess: "Успешно добавлено в ваш рацион!",
      reScanBtn: "Сканировать другой продукт",
      unsupportedFormat: "Пожалуйста, загрузите изображение.",

      voicePlaceholder: "Нажмите на микрофон и расскажите, что вы съели (например: 'утром на завтрак плов 200 грамм, в обед яблоко и выпил молоко 3.2%') или введите текст рациона вручную...",
      voiceListening: "Слушаю вас... Говорите",
      voiceParseBtn: "Распознать AI рацион",
      voiceParsingState: "AI анализирует ваш голос и блюда...",
      parsedItemsTitle: "Распознанные блюда и КБЖУ",
      cookingMethodLabel: "Способ здорового приготовления",
      gramsUnit: "г",
      addAllBtn: "Загрузить весь день в дневник",
      addSingleBtn: "В дневник",
      addedSingleSuccess: "Внесено!",
      voiceNotSupported: "Голосовой ввод (Speech Recognition) не поддерживается вашим браузером. Пожалуйста, напишите ваш рацион в текстовом поле ниже!",
      emptyTextWarning: "Пожалуйста, продиктуйте или введите ваш рацион текстом сначала.",
      suggestedPillLabel: "Примеры быстрых фраз:"
    },
    uz: {
      headerTitle: "Ratsion skaneri va AI Ovoz",
      headerSubtitle: "Kunlik ovqatlaringizni ovozli ayting, tayyorlash usuli va KBJU ko'rsatkichlarini bilib oling",
      tabCamera: "Kamera / Tarkib rasmi",
      tabVoice: "Ovoz / Butun kun",
      uploadPlaceholder: "Kameradan suratga olish yoki galereyadan tanlash",
      analyzeBtn: "AI Tahlilni ishga tushirish",
      analyzingState: "Gemini orqali OCR tarkib tahlil qilinmoqda...",
      scoreLabel: "Salomatlik balli",
      novaLabel: "Qayta ishlash",
      nova1: "Tabiiy mahsulot (NOVA 1)",
      nova2: "Kulinariya mahsuloti (NOVA 2)",
      nova3: "Qayta ishlangan mahsulot (NOVA 3)",
      nova4: "Ultra-qayta ishlangan mahsulot (NOVA 4)",
      prosCons: "Tarkib tahlili va qo'shimchalar",
      ingredientsFound: "Aniqlangan ingredientlar",
      allergens: "Allergenlar va Xavflar",
      internetFeedback: "Internetdagi sharhlar va obro'",
      reputation: "Brend bahosi:",
      goalAdaptation: "Maqsadingizga moslik",
      logMealBtn: "Ratsionga kiritish",
      addedSuccess: "Ratsioningizga muvaffaqiyatli qo'shildi!",
      reScanBtn: "Yangi mahsulotni skanerlash",
      unsupportedFormat: "Iltimos, rasm formatidagi fayl yuklang.",

      voicePlaceholder: "Mikrofonni bosing va nimalar iste'mol qilganingizni gapiring (masalan: 'ertalab 200 gramm oshi palov va bit bitta olma yedim, kechqurun sut ichdim') yoki o'zingiz yozing...",
      voiceListening: "Eshityapman... Gapiring",
      voiceParseBtn: "AI tahlilni boshlash",
      voiceParsingState: "AI ovozingizni va taomlarni hisoblamoqda...",
      parsedItemsTitle: "Aniqlangan taomlar va KBJU",
      cookingMethodLabel: "Sog'lom pishirish usuli",
      gramsUnit: "g",
      addAllBtn: "Kunlik jami ratsionni qo'shish",
      addSingleBtn: "Qo'shish",
      addedSingleSuccess: "Qo'shildi!",
      voiceNotSupported: "Ovozli kiritish (Speech Recognition) ushbu brauzerda mavjud emas. Ratsioningizni quyidagi maydonga yozishingiz mumkin!",
      emptyTextWarning: "Iqtibos, avval nimalar iste'mol qilganingizni yozing yoki mikrofonga gapiring.",
      suggestedPillLabel: "Tezkor namunalar:"
    }
  }[language];

  // Pool of suggested meal sentences (rotated on each render seed)
  const PILL_POOL = language === "uz" ? [
    "ertalab suli bo'tqasi 150g va qora kofe, tushlikda 300g to'y oshi",
    "men bugun go'shtli somsa 2 dona yedim va yashil olma 150g",
    "bugun yarim kosa sho'rva va lula kabob 150g",
    "ertalab 2 ta tuxum omlet va 1 dona non, tushlikda mastava",
    "tushlikda lag'mon 250g va ko'k choy, kechqurun 200g tvorog",
    "non 100g, qatiq 200ml va asal 1 osh qoshiq",
    "kechki ovqat: qovurilgan tovuq 200g va guruch garniri 150g",
    "ertalab pishloqli sendvich va apelsin sharbati 250ml",
    "bugun 300g manti va salat achichuk",
    "tushlikda sho'rva mastava 250g va non 80g",
    "kechqurun baliq 180g va bug'da pishirilgan sabzavotlar 200g",
    "kun davomida 2 dona banan, bir hovuch yong'oq va yashil choy"
  ] : [
    "утром овсяная каша 200г и кофе без сахара, в обед плов 300г и салат",
    "я сегодня съел две самсы с мясом и свежее спелое яблоко",
    "выпил стакан молока 250мл и съел порцию творога 150г",
    "на завтрак омлет из 2 яиц с сыром и тост, в обед лагман 300г",
    "обед: борщ 250г с куском хлеба 60г, на ужин куриная грудка 200г",
    "перекус: горсть миндаля и зелёное яблоко 150г",
    "съел шашлык из баранины 250г и греческий салат 200г",
    "завтрак: гречка с молоком 200г, в обед манты 4 штуки",
    "выпил протеиновый коктейль 400мл после тренировки и банан",
    "ужин: запечённая рыба 200г и брокколи на пару 150г",
    "за день: 2 яблока, кефир 500мл и творожная запеканка 200г",
    "обед: суп шурпа 300г, лепёшка 100г, зелёный чай"
  ];

  // Pick 3 random distinct items based on the seed (re-rolls when user clicks refresh)
  const DUST_PILLS = useMemo(() => {
    const indices = [...PILL_POOL.keys()].sort(() => Math.random() - 0.5).slice(0, 3);
    return indices.map((i) => PILL_POOL[i]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillsSeed, language]);

  // Run the full stack API scan
  const executeScan = async (uploadedBase64?: string, textQuery?: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    setLoggedAddedAlert(false);

    try {
      const resp = await apiFetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: uploadedBase64 || null,
          text: textQuery || null,
          userProfile: profile,
          language: language
        })
      });

      const resJson = await resp.json();
      if (resJson.success) {
        setScanResult(resJson.data);
      } else {
        setErrorMsg(resJson.error || "Failed to scan. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Connection failure or Server Timeout. Please check your workspace.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg(labels.unsupportedFormat);
        return;
      }

      setErrorMsg(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        setImagePreview(base64Str);
        executeScan(base64Str, undefined);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToDiary = () => {
    if (!scanResult) return;
    onAddMealLog({
      productName: scanResult.productName,
      calories: scanResult.macros.calories,
      protein: scanResult.macros.protein,
      fat: scanResult.macros.fat,
      carbs: scanResult.macros.carbs,
      healthScore: scanResult.healthScore,
      image: imagePreview || undefined
    });
    setLoggedAddedAlert(true);
    setTimeout(() => setLoggedAddedAlert(false), 3000);
  };

  const resetScanner = () => {
    setImagePreview(null);
    setScanResult(null);
    setErrorMsg(null);
    setVoiceResult(null);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setErrorMsg(labels.voiceNotSupported);
      return;
    }

    try {
      const recognition = new SpeechRecognitionImpl();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "uz" ? "uz-UZ" : "ru-RU";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  };

  const handleParseVoiceText = async () => {
    if (!voiceText.trim()) {
      setErrorMsg(labels.emptyTextWarning);
      return;
    }

    setIsParsingVoice(true);
    setErrorMsg(null);
    setVoiceResult(null);
    setAddedItemsIndices([]);

    try {
      const response = await apiFetch("/api/voice-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceText,
          userProfile: profile,
          language: language
        })
      });

      const resJson = await response.json();
      if (resJson.success) {
        setVoiceResult(resJson.data);
      } else {
        setErrorMsg(resJson.error || "Failed to analyze diet. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Error communicating with AI parser node.");
    } finally {
      setIsParsingVoice(false);
    }
  };

  const handleAddSingleVoiceItem = (item: any, index: number) => {
    onAddMealLog({
      productName: `${item.productName} (${item.weightGrams}${labels.gramsUnit})`,
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
      healthScore: item.healthScore
    });
    setAddedItemsIndices((prev) => [...prev, index]);
  };

  const handleAddAllVoiceItems = () => {
    if (!voiceResult) return;
    
    voiceResult.items.forEach((item, index) => {
      if (!addedItemsIndices.includes(index)) {
        onAddMealLog({
          productName: `${item.productName} (${item.weightGrams}${labels.gramsUnit})`,
          calories: item.calories,
          protein: item.protein,
          fat: item.fat,
          carbs: item.carbs,
          healthScore: item.healthScore
        });
      }
    });

    const allIndices = voiceResult.items.map((_, i) => i);
    setAddedItemsIndices(allIndices);
    
    setLoggedAddedAlert(true);
    setTimeout(() => setLoggedAddedAlert(false), 3000);
  };

  const resetVoiceParser = () => {
    setVoiceText("");
    setVoiceResult(null);
    setAddedItemsIndices([]);
    setErrorMsg(null);
  };

  // Get score layout details
  const getScoreData = (score: number) => {
    if (score >= 75) return { color: "text-brand-primary", border: "border-brand-primary/30", bg: "bg-brand-primary/10", label: language === "uz" ? "Ajoyib tarkib" : "Отличный состав" };
    if (score >= 50) return { color: "text-brand-blue", border: "border-brand-blue/30", bg: "bg-brand-blue/10", label: language === "uz" ? "O'rtacha tarkib" : "Умеренное качество" };
    return { color: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10", label: language === "uz" ? "Zararli va nosog'lom" : "Низкое качество" };
  };

  // Render NOVA category explanation
  const getNovaBadge = (nova: number) => {
    switch (nova) {
      case 1: return { class: "bg-brand-primary/10 text-brand-primary border-brand-primary/25", label: labels.nova1 };
      case 2: return { class: "bg-brand-blue/10 text-brand-blue border-brand-blue/25", label: labels.nova2 };
      case 3: return { class: "bg-amber-500/10 text-amber-400 border-amber-500/25", label: labels.nova3 };
      case 4: return { class: "bg-red-500/10 text-red-400 border-red-500/25", label: labels.nova4 };
      default: return { class: "bg-brand-panel text-[#888] border-brand-border", label: "NOVA Unclassified" };
    }
  };

  return (
    <div className="space-y-5" id="scanning_frame">
      {/* Premium minimal header */}
      <div className="space-y-1 pt-2 animate-stagger-1">
        <div className="flex items-center gap-2 text-[#8E8E93] text-[13px] font-medium">
          <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
          <span>{language === "uz" ? "AI skaner" : "AI сканер"}</span>
        </div>
        <h1
          className="text-[28px] leading-[1.15] font-black text-white tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {language === "uz" ? "Nima yedingiz?" : "Что ты съел?"}
        </h1>
      </div>

      {/* Premium 3-mode pill segmented control */}
      {!scanResult && !isScanning && !isParsingVoice && (
        <div
          className="grid grid-cols-3 gap-1 p-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {([
            { id: "camera", icon: Camera, ru: "Фото", uz: "Surat" },
            { id: "voice", icon: Mic, ru: "Голос", uz: "Ovoz" },
            { id: "text", icon: Keyboard, ru: "Текст", uz: "Matn" },
          ] as const).map(({ id, icon: Icon, ru, uz }) => {
            const active = useUploadMethod === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setUseUploadMethod(id);
                  setErrorMsg(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
                  active
                    ? "bg-white/[0.06] text-white shadow-sm"
                    : "text-[#8E8E93] hover:text-white"
                }`}
                style={
                  active
                    ? { boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset" }
                    : undefined
                }
              >
                <Icon
                  className={`w-4 h-4 ${active ? "text-brand-primary" : ""}`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="text-[12px] font-semibold tracking-wide">
                  {language === "uz" ? uz : ru}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Primary Scanner View Render */}
      {!scanResult && (
        <div className="space-y-4">
          {useUploadMethod !== "camera" ? (
            /* Voice + Text unified dictation panel */
            <div className="space-y-4">
              <div
                className="rounded-3xl p-5 text-left space-y-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #15151A 0%, #101015 100%)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                }}
              >
                <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full bg-brand-primary/8 blur-3xl" />

                <div className="flex justify-between items-center relative">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold flex items-center gap-1.5">
                    <ClipboardList className="w-3 h-3 text-brand-primary" />
                    {useUploadMethod === "voice"
                      ? (language === "uz" ? "Ovozli kiritish" : "Голосовой ввод")
                      : (language === "uz" ? "Matn kiritish" : "Текстовый ввод")}
                  </span>
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-[10px] text-brand-primary font-mono font-bold">
                      <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
                      {labels.voiceListening}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    onFocus={(e) =>
                      setTimeout(
                        () => e.target.scrollIntoView({ behavior: "smooth", block: "center" }),
                        300
                      )
                    }
                    placeholder={labels.voicePlaceholder}
                    className={`w-full bg-black/40 text-[13px] text-white p-4 ${
                      useUploadMethod === "voice" ? "pb-14" : ""
                    } rounded-2xl border border-white/[0.06] focus:border-brand-primary/40 focus:outline-none placeholder-[#48484A] resize-none transition-all leading-relaxed`}
                  />

                  {useUploadMethod === "voice" && (
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={`absolute bottom-3 right-3 p-2.5 rounded-xl border transition-all ${
                        isListening
                          ? "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse scale-105"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-[#8E8E93] hover:text-brand-primary"
                      }`}
                      title={language === "uz" ? "Ovoz yozish" : "Запись голоса"}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Suggestions Pills */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-[#8E8E93] uppercase tracking-[0.18em] font-bold">
                      {labels.suggestedPillLabel}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPillsSeed((s) => s + 1)}
                      className="text-[10px] text-[#8E8E93] hover:text-brand-primary uppercase tracking-wider transition-colors px-1.5 py-0.5 rounded"
                      title={language === "uz" ? "Yangi misollar" : "Новые примеры"}
                    >
                      🎲
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {DUST_PILLS.map((pill, i) => (
                      <button
                        key={`${pillsSeed}-${i}`}
                        type="button"
                        onClick={() => setVoiceText(pill)}
                        className="text-[11px] bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.05] text-[#8E8E93] hover:text-white py-2 px-3 rounded-xl transition-all text-left truncate font-medium animate-fade-in"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary parse action */}
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={handleParseVoiceText}
                    disabled={isParsingVoice || !voiceText.trim()}
                    className="flex-1 bg-brand-primary hover:bg-[#00E577] disabled:bg-white/[0.04] disabled:text-[#48484A] active:scale-[0.98] text-black font-bold py-3.5 px-4 rounded-2xl transition-all text-[13px] tracking-wide flex items-center justify-center gap-2"
                    style={{
                      boxShadow: voiceText.trim() && !isParsingVoice
                        ? "0 8px 24px rgba(0,229,119,0.25)"
                        : undefined,
                    }}
                  >
                    {isParsingVoice ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>{labels.voiceParsingState}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                        <span>{labels.voiceParseBtn}</span>
                      </>
                    )}
                  </button>

                  {voiceText && (
                    <button
                      onClick={resetVoiceParser}
                      className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#8E8E93] hover:text-white px-4 rounded-2xl text-[12px] font-bold transition-all"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Streaming AI loading state */}
              {isParsingVoice && <StreamingThinking language={language} mode="voice" />}

              {voiceResult && !isParsingVoice && (
                <div className="space-y-4 mt-2">
                  {/* Summary commentary card */}
                  <div className="bg-[#0D0D10]/95 border border-brand-primary/20 p-5 rounded-2xl relative overflow-hidden shadow-lg text-left">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center gap-2 border-b border-brand-border-light pb-2 mt-1 mb-2.5">
                      <div className="w-2 h-2 bg-brand-primary rounded-full" />
                      <h4 className="text-xs font-mono text-brand-primary uppercase tracking-widest font-bold">
                        AI Coach Diet Analysis
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium">
                      {voiceResult.coachSummary}
                    </p>
                  </div>

                  {/* Identified items list */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <ClipboardList className="w-3 h-3 text-brand-primary" />
                      <h5 className="text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold">
                        {labels.parsedItemsTitle} ({voiceResult.items.length})
                      </h5>
                    </div>

                    <div className="space-y-2.5">
                      {voiceResult.items.map((item, index) => {
                        const isAdded = addedItemsIndices.includes(index);

                        // Confidence score — derived from healthScore as proxy:
                        // high health score = AI is more certain about the item
                        const confidence = item.healthScore >= 70
                          ? { pct: 85, label: language === "uz" ? "Yuqori ishonch" : "Высокая точность", color: "#00E577" }
                          : item.healthScore >= 45
                          ? { pct: 65, label: language === "uz" ? "O'rtacha ishonch" : "Средняя точность", color: "#00D9F6" }
                          : { pct: 40, label: language === "uz" ? "Taxminiy" : "Приблизительно", color: "#F59E0B" };

                        const scoreColor = item.healthScore >= 75
                          ? "text-brand-primary border-brand-primary/20 bg-brand-primary/8"
                          : item.healthScore >= 50
                          ? "text-[#00D9F6] border-[#00D9F6]/20 bg-[#00D9F6]/8"
                          : "text-red-400 border-red-500/20 bg-red-500/8";

                        return (
                          <div
                            key={index}
                            className="rounded-2xl p-4 text-left space-y-3"
                            style={{
                              background: isAdded
                                ? "rgba(0,229,119,0.04)"
                                : "rgba(255,255,255,0.025)",
                              border: isAdded
                                ? "1px solid rgba(0,229,119,0.15)"
                                : "1px solid rgba(255,255,255,0.05)",
                              transition: "all 0.3s ease",
                            }}
                          >
                            {/* Header row */}
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <h6 className="text-[14px] font-semibold text-white leading-tight truncate">
                                  {item.productName}
                                </h6>
                                <span className="text-[11px] text-[#8E8E93] block mt-0.5">
                                  {item.weightGrams} {labels.gramsUnit}
                                </span>
                              </div>
                              <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold tabular-nums shrink-0 ${scoreColor}`}>
                                {item.healthScore}
                              </div>
                            </div>

                            {/* Confidence bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[#8E8E93] uppercase tracking-[0.12em] font-bold">
                                  {language === "uz" ? "Ishonch" : "Точность AI"}
                                </span>
                                <span className="text-[10px] font-bold tabular-nums" style={{ color: confidence.color }}>
                                  {confidence.label}
                                </span>
                              </div>
                              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${confidence.pct}%`, background: confidence.color }}
                                />
                              </div>
                            </div>

                            {/* Inline macros */}
                            <div className="grid grid-cols-4 gap-2 rounded-xl p-3"
                              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}
                            >
                              {[
                                { l: "kcal", v: item.calories, c: "text-white" },
                                { l: language === "uz" ? "oqsil" : "белок", v: `${item.protein}g`, c: "text-brand-primary" },
                                { l: language === "uz" ? "yog'" : "жиры", v: `${item.fat}g`, c: "text-[#00D9F6]" },
                                { l: language === "uz" ? "uglevod" : "углев.", v: `${item.carbs}g`, c: "text-[#A78BFA]" },
                              ].map((m) => (
                                <div key={m.l} className="text-center">
                                  <div className="text-[9px] text-[#48484A] uppercase tracking-wide mb-0.5">{m.l}</div>
                                  <div className={`text-[12px] font-bold tabular-nums ${m.c}`}>{m.v}</div>
                                </div>
                              ))}
                            </div>

                            {/* Cooking method */}
                            {item.cookingMethod && (
                              <div className="rounded-xl p-3 flex gap-2 items-start"
                                style={{ background: "rgba(0,217,246,0.05)", border: "1px solid rgba(0,217,246,0.1)" }}
                              >
                                <span className="text-[#00D9F6] shrink-0">🍳</span>
                                <p className="text-[11px] text-[#8E8E93] leading-relaxed">{item.cookingMethod}</p>
                              </div>
                            )}

                            {/* Add to diary */}
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleAddSingleVoiceItem(item, index)}
                                disabled={isAdded}
                                className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                                  isAdded
                                    ? "text-brand-primary bg-brand-primary/8 border border-brand-primary/20"
                                    : "text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08]"
                                }`}
                              >
                                {isAdded ? (
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {labels.addedSingleSuccess}
                                  </span>
                                ) : labels.addSingleBtn}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add All button */}
                    {voiceResult.items.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={handleAddAllVoiceItems}
                          className="w-full bg-brand-primary hover:bg-[#00E577] text-black font-bold py-3.5 px-4 rounded-2xl transition-all text-[13px] flex items-center justify-center gap-2 active:scale-[0.98]"
                          style={{ boxShadow: "0 8px 24px rgba(0,229,119,0.25)" }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {labels.addAllBtn}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Upload layout */
            <div className="text-center">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="w-full aspect-[4/3] rounded-3xl flex flex-col items-center justify-center p-8 transition-all group active:scale-[0.99] relative overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #15151A 0%, #0E0E12 100%)",
                  border: "1.5px dashed rgba(255,255,255,0.1)",
                }}
              >
                <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full bg-brand-primary/8 blur-3xl" />
                <div className="relative p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-4 group-hover:border-brand-primary/40 transition-colors">
                  <Camera className="w-7 h-7 text-[#8E8E93] group-hover:text-brand-primary transition-colors" />
                </div>
                <div className="relative text-[14px] font-semibold text-white">
                  {labels.uploadPlaceholder}
                </div>
                <div className="relative text-[11px] text-[#8E8E93] mt-1.5 flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Max 15MB
                </div>
              </button>
            </div>
          )}

          {isScanning && <StreamingThinking language={language} mode="photo" />}

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-left flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-300 leading-relaxed font-semibold">{errorMsg}</div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Result Display */}
      {scanResult && (
        <div className="space-y-5 text-left" id="scanner_results_panel">
          
          {/* Hero Result — verdict + big number + score */}
          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #15151A 0%, #0E0E12 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="pointer-events-none absolute -top-20 -right-10 w-48 h-48 rounded-full bg-brand-primary/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold mb-1">
                    {language === "uz" ? "AI tahlil" : "AI разбор"}
                  </div>
                  <h3
                    className="text-[22px] font-black text-white leading-tight tracking-tight"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {scanResult.productName}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-[#8E8E93] capitalize">
                      {scanResult.category.replace("_", " ")}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${getNovaBadge(scanResult.novaCategory).class}`}
                    >
                      {getNovaBadge(scanResult.novaCategory).label}
                    </span>
                  </div>
                </div>

                <div className="text-center shrink-0">
                  <div
                    className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border ${getScoreData(scanResult.healthScore).border} ${getScoreData(scanResult.healthScore).bg}`}
                  >
                    <span
                      id="final_product_score"
                      className={`text-[22px] font-black leading-none tabular-nums ${getScoreData(scanResult.healthScore).color}`}
                    >
                      {scanResult.healthScore}
                    </span>
                    <span className="text-[9px] text-[#8E8E93] font-bold uppercase mt-1 tracking-wider">
                      /100
                    </span>
                  </div>
                  <div
                    className={`text-[10px] font-bold mt-1.5 ${getScoreData(scanResult.healthScore).color}`}
                  >
                    {getScoreData(scanResult.healthScore).label}
                  </div>
                </div>
              </div>

              {/* Big calorie number */}
              <div className="flex items-baseline gap-2 mb-5">
                <span
                  className="text-[40px] font-black text-white tracking-tight tabular-nums leading-none"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {scanResult.macros.calories}
                </span>
                <span className="text-[14px] text-[#8E8E93] font-medium">
                  {language === "uz" ? "kkal / 100g" : "ккал / 100г"}
                </span>
              </div>

              {/* Inline macro bars */}
              <div className="space-y-2.5 mb-5">
                {[
                  {
                    label: language === "uz" ? "Oqsil" : "Белки",
                    val: scanResult.macros.protein,
                    color: "#00E577",
                    pct: Math.min((scanResult.macros.protein / 50) * 100, 100),
                  },
                  {
                    label: language === "uz" ? "Yog'" : "Жиры",
                    val: scanResult.macros.fat,
                    color: "#00D9F6",
                    pct: Math.min((scanResult.macros.fat / 60) * 100, 100),
                  },
                  {
                    label: language === "uz" ? "Uglevod" : "Углеводы",
                    val: scanResult.macros.carbs,
                    color: "#A78BFA",
                    pct: Math.min((scanResult.macros.carbs / 80) * 100, 100),
                  },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#8E8E93] font-semibold w-16 shrink-0">
                      {m.label}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${m.pct}%`, background: m.color }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-white tabular-nums w-10 text-right">
                      {Math.round(m.val)}g
                    </span>
                  </div>
                ))}
              </div>

              {/* Verdict — AI insight */}
              <div
                className="rounded-2xl p-4 flex gap-3 items-start"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="p-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <p className="text-[13px] text-white/90 leading-relaxed">
                  {scanResult.verdict}
                </p>
              </div>
            </div>
          </div>

          {/* Goal evaluation card */}
          {scanResult.goalEvaluation && (
            <div className="bg-brand-card border border-brand-border p-4 rounded-2xl space-y-2 shadow-md">
              <div className="text-xs font-bold text-brand-primary uppercase tracking-widest font-mono flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-blue" />
                {labels.goalAdaptation}
              </div>
              <p className="text-xs text-zinc-300 leading-normal font-medium">{scanResult.goalEvaluation}</p>
            </div>
          )}

          {/* Pros Cons Panel */}
          <div className="bg-brand-card border border-brand-border p-4 rounded-2xl space-y-3.5 shadow-md">
            <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest font-mono">{labels.prosCons}</h4>
            
            <div className="space-y-2">
              {scanResult.pros.map((pro, index) => (
                <div key={index} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                  <span>{pro}</span>
                </div>
              ))}
              {scanResult.cons.map((con, index) => (
                <div key={index} className="flex items-start gap-2.5 text-xs text-zinc-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{con}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Allergens warning */}
          {scanResult.allergensAlerts?.length > 0 && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase font-mono">
                <AlertTriangle className="w-4 h-4" />
                {labels.allergens}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scanResult.allergensAlerts.map((all, idx) => (
                  <span key={idx} className="bg-amber-500/10 text-amber-300 border border-amber-500/10 text-[10px] px-2 py-0.5 rounded font-mono">
                    ⚠️ {all}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients Raw List */}
          {scanResult.ingredientsFound?.length > 0 && (
            <div className="p-4 bg-brand-card border border-brand-border rounded-xl space-y-2">
              <div className="text-xs font-bold text-[#888] uppercase tracking-widest font-mono">
                {labels.ingredientsFound}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                {scanResult.ingredientsFound.join(", ")}
              </p>
            </div>
          )}

          {/* Social Feedback analysis */}
          {scanResult.reviewsAnalysis && (
            <div className="bg-brand-card border border-brand-border p-4 rounded-2xl space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#888] uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-brand-blue" />
                  {labels.internetFeedback}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {labels.reputation} <span className="text-brand-primary font-bold">{scanResult.reviewsAnalysis.ratingEstimate}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {scanResult.reviewsAnalysis.summary}
              </p>
            </div>
          )}

          {/* Actions panel */}
          <div className="pt-2 space-y-2">
            {!loggedAddedAlert ? (
              <button
                onClick={handleAddToDiary}
                id="btn_log_scanned_meal"
                className="w-full bg-brand-primary hover:bg-[#00E577] active:scale-[0.98] text-black font-bold py-4 px-4 rounded-2xl transition-all text-[14px] flex items-center justify-center gap-2"
                style={{ boxShadow: "0 8px 24px rgba(0,229,119,0.25)" }}
              >
                <PlusCircle className="w-5 h-5" />
                {labels.logMealBtn}
              </button>
            ) : (
              <div
                className="w-full p-3.5 rounded-2xl text-center text-[13px] font-semibold text-brand-primary flex items-center justify-center gap-2"
                style={{
                  background: "rgba(0,229,119,0.08)",
                  border: "1px solid rgba(0,229,119,0.25)",
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {labels.addedSuccess}
              </div>
            )}

            <button
              onClick={resetScanner}
              id="btn_scanner_reset"
              className="w-full bg-white/[0.025] hover:bg-white/[0.05] text-[#8E8E93] hover:text-white border border-white/[0.06] py-3 px-4 rounded-2xl text-[12px] font-semibold transition-all"
            >
              {labels.reScanBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   Streaming AI "thinking" indicator.
   Reveals 3 stages with staggered delays — creates
   perception of AI reasoning vs a generic spinner.
   ─────────────────────────────────────────────── */
function StreamingThinking({
  language,
  mode,
}: {
  language: AppLanguage;
  mode: "photo" | "voice";
}) {
  const STEPS = {
    ru: {
      photo: [
        "Распознаю блюдо на фото...",
        "Оцениваю размер порции...",
        "Считаю калории и БЖУ...",
      ],
      voice: [
        "Слышу твой рацион...",
        "Раскладываю на блюда...",
        "Считаю КБЖУ для каждого...",
      ],
    },
    uz: {
      photo: [
        "Surat orqali taomni aniqlayapman...",
        "Porsiya hajmini baholayapman...",
        "Kaloriya va KBJUni hisoblayapman...",
      ],
      voice: [
        "Ratsioningizni eshityapman...",
        "Taomlarga ajratayapman...",
        "Har biri uchun KBJUni hisoblayapman...",
      ],
    },
  }[language][mode];

  const [visible, setVisible] = useState(1);
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(2), 700);
    const t2 = setTimeout(() => setVisible(3), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className="rounded-3xl p-6 space-y-3 animate-fade-in"
      style={{
        background: "linear-gradient(180deg, #15151A 0%, #101015 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
        <Sparkles className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] font-bold">
          {language === "uz" ? "AI tahlil qilmoqda" : "AI анализирует"}
        </span>
      </div>
      <div className="space-y-2.5">
        {STEPS.map((line, i) => {
          const shown = i < visible;
          const active = i === visible - 1;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 transition-all duration-500 ${
                shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  active ? "bg-brand-primary animate-pulse" : "bg-brand-primary/50"
                }`}
              />
              <span
                className={`text-[13px] ${
                  active ? "text-white font-medium" : "text-[#8E8E93]"
                }`}
              >
                {line}
              </span>
              {!active && shown && (
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary ml-auto" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
