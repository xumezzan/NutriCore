import React, { useState, useRef, useMemo } from "react";
import { UserProfile, AnalysisResult, MealLog, AppLanguage } from "../types";
import { apiFetch } from "../telegram";
import {
  Scan,
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
  ClipboardList
} from "lucide-react";

interface ScannerProps {
  profile: UserProfile;
  language: AppLanguage;
  onAddMealLog: (log: Omit<MealLog, "id" | "timestamp">) => void;
}

export default function Scanner({ profile, language, onAddMealLog }: ScannerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [useUploadMethod, setUseUploadMethod] = useState<"camera" | "voice">("voice");
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
    <div className="space-y-6" id="scanning_frame">
      {/* Visual scanning decoration */}
      <div className="bg-gradient-to-r from-brand-sidebar via-brand-card to-brand-sidebar p-5 rounded-2xl border border-brand-border text-left">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20 text-brand-primary shrink-0">
            <Scan className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">{labels.headerTitle}</h2>
            <p className="text-xs text-[#888] mt-0.5 leading-normal">{labels.headerSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Nav toggle tabs */}
      {!scanResult && !isScanning && (
        <div className="grid grid-cols-2 gap-1.5 bg-brand-panel p-1 rounded-xl border border-brand-border-light">
          <button
            onClick={() => { setUseUploadMethod("voice"); setErrorMsg(null); }}
            className={`py-2 px-2.5 text-[10px] sm:text-xs font-extrabold rounded-lg transition-all uppercase tracking-wide ${
              useUploadMethod === "voice"
                ? "bg-brand-border-light text-brand-primary shadow-sm"
                : "text-[#888] hover:text-[#F5F5F7]"
            }`}
          >
            🎤 {labels.tabVoice}
          </button>
          <button
            onClick={() => { setUseUploadMethod("camera"); setErrorMsg(null); }}
            className={`py-2 px-2.5 text-[10px] sm:text-xs font-extrabold rounded-lg transition-all uppercase tracking-wide ${
              useUploadMethod === "camera"
                ? "bg-brand-border-light text-brand-primary shadow-sm"
                : "text-[#888] hover:text-[#F5F5F7]"
            }`}
          >
            📸 {labels.tabCamera}
          </button>
        </div>
      )}

      {/* Primary Scanner View Render */}
      {!scanResult && (
        <div className="space-y-4">
          {useUploadMethod === "voice" ? (
            /* Voice and Whole Day text parsing layout */
            <div className="space-y-4">
              <div className="bg-brand-card border border-brand-border p-5 rounded-2xl text-left space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-brand-primary" />
                    AI Dictation Assistant
                  </span>
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-[10px] text-brand-primary font-mono font-bold animate-pulse">
                      <span className="w-2 h-2 bg-brand-primary rounded-full" />
                      {labels.voiceListening}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={voiceText}
                    onChange={(e) => setVoiceText(e.target.value)}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                    placeholder={labels.voicePlaceholder}
                    className="w-full bg-[#070707] text-xs text-[#F5F5F7] p-3.5 pb-14 rounded-xl border border-brand-border focus:border-brand-primary focus:outline-none placeholder-[#555] resize-none transition-all leading-relaxed"
                  />
                  
                  {/* Microphone dictation button */}
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className={`absolute bottom-3 right-3 p-2.5 rounded-xl border transition-all ${
                      isListening
                        ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse scale-105"
                        : "bg-brand-panel hover:bg-brand-border-light border-brand-border text-zinc-400 hover:text-brand-primary"
                    }`}
                    title="Запись голоса (Speech to Text)"
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Suggestions Pills */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] text-[#555] font-mono uppercase tracking-wider font-extrabold">
                      {labels.suggestedPillLabel}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPillsSeed((s) => s + 1)}
                      className="text-[9px] text-[#555] hover:text-brand-primary font-mono uppercase tracking-wider transition-colors px-1.5 py-0.5 rounded"
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
                        className="text-[10px] bg-[#0d0d0d] hover:bg-brand-panel border border-brand-border-light/60 text-[#888] hover:text-brand-primary py-1.5 px-3 rounded-lg transition-all text-left truncate font-medium animate-fade-in"
                      >
                        ⚡ "{pill}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Parse Action */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleParseVoiceText}
                    disabled={isParsingVoice || !voiceText.trim()}
                    className="flex-1 bg-brand-primary hover:bg-[#00E577] disabled:bg-[#111] disabled:text-zinc-650 disabled:border-transparent cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] text-black font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest font-mono flex items-center justify-center gap-2"
                  >
                    {isParsingVoice ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>{labels.voiceParsingState}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
                        <span>{labels.voiceParseBtn}</span>
                      </>
                    )}
                  </button>

                  {voiceText && (
                    <button
                      onClick={resetVoiceParser}
                      className="bg-[#0A0A0A] hover:bg-brand-panel border border-brand-border text-[#a55] hover:text-[#faa] px-4 rounded-xl text-xs font-bold transition-all uppercase"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>

              {/* Parsed Result from Voice Organizer */}
              {isParsingVoice && (
                <div className="p-10 text-center bg-brand-card rounded-2xl border border-brand-border space-y-4 animate-pulse shadow-2xl">
                  <div className="relative w-16 h-16 mx-auto">
                    <Scan className="w-16 h-16 text-brand-primary animate-spin stroke-[1.5]" />
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-brand-blue animate-bounce" />
                  </div>
                  <p className="text-sm text-[#F5F5F7] font-bold">{labels.voiceParsingState}</p>
                </div>
              )}

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
                    <h5 className="text-[10px] font-mono text-brand-primary uppercase tracking-widest text-left font-bold pl-1 flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-brand-blue" />
                      {labels.parsedItemsTitle} ({voiceResult.items.length})
                    </h5>

                    <div className="space-y-2.5">
                      {voiceResult.items.map((item, index) => {
                        const isAdded = addedItemsIndices.includes(index);
                        const itemScoreColor = item.healthScore >= 75
                          ? "text-brand-primary border-brand-primary/30 bg-brand-primary/10"
                          : item.healthScore >= 50
                          ? "text-brand-blue border-brand-blue/30 bg-brand-blue/10"
                          : "text-red-400 border-red-500/30 bg-red-500/10";

                        return (
                          <div
                            key={index}
                            className="bg-brand-card border border-brand-border p-4 rounded-xl text-left space-y-3 shadow-md"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <h6 className="text-sm font-bold text-white leading-tight">
                                  {item.productName}
                                </h6>
                                <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                                  {item.weightGrams} {labels.gramsUnit}
                                </span>
                              </div>

                              <div className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${itemScoreColor}`}>
                                {item.healthScore}
                              </div>
                            </div>

                            {/* Macro values panel */}
                            <div className="grid grid-cols-4 gap-1.5 bg-[#070707] p-2 rounded-lg border border-brand-border-light/40 text-center">
                              <div>
                                <div className="text-[8px] text-zinc-500 font-mono uppercase">Kcal</div>
                                <div className="text-xs font-bold font-mono text-white mt-0.5">{item.calories}</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-brand-primary font-mono uppercase">Prot</div>
                                <div className="text-xs font-bold font-mono text-brand-primary mt-0.5">{item.protein}g</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-brand-blue font-mono uppercase">Fat</div>
                                <div className="text-xs font-bold font-mono text-brand-blue mt-0.5">{item.fat}g</div>
                              </div>
                              <div>
                                <div className="text-[8px] text-zinc-500 font-mono uppercase">Carb</div>
                                <div className="text-xs font-bold font-mono text-[#AAA] mt-0.5">{item.carbs}g</div>
                              </div>
                            </div>

                            {/* Cooking Method / Способ приготовления advice */}
                            {item.cookingMethod && (
                              <div className="p-3 bg-[#0A0A0C] border-l-2 border-brand-blue rounded text-[11px] text-zinc-450 leading-relaxed font-sans">
                                <span className="font-bold text-brand-blue uppercase font-mono tracking-wider block text-[9px] mb-0.5">
                                  🍳 {labels.cookingMethodLabel}:
                                </span>
                                {item.cookingMethod}
                              </div>
                            )}

                            {/* Single log action callback */}
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleAddSingleVoiceItem(item, index)}
                                disabled={isAdded}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase transition-all ${
                                  isAdded
                                    ? "bg-[#09150F] text-brand-primary border border-brand-primary/20"
                                    : "bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/30 active:scale-95 cursor-pointer"
                                }`}
                              >
                                {isAdded ? labels.addedSingleSuccess : labels.addSingleBtn}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grand Add All items at once button */}
                    {voiceResult.items.length > 0 && (
                      <div className="pt-2">
                        <button
                          onClick={handleAddAllVoiceItems}
                          className="w-full bg-brand-primary hover:bg-[#00E577] text-black font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest font-mono flex items-center justify-center gap-2 cursor-pointer"
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
                className="w-full aspect-[4/3] bg-brand-card hover:bg-brand-panel border-2 border-dashed border-brand-border-light rounded-3xl flex flex-col items-center justify-center p-8 transition-all group active:scale-[0.99] shadow-xl"
              >
                <div className="p-4 bg-[#0A0A0A]/80 rounded-2xl border border-brand-border mb-4 group-hover:border-brand-primary transition-colors">
                  <Camera className="w-8 h-8 text-[#888] group-hover:text-brand-primary transition-colors" />
                </div>
                <div className="text-sm font-bold text-[#F5F5F7]">{labels.uploadPlaceholder}</div>
                <div className="text-[10px] text-[#555] mt-1 font-mono uppercase tracking-wider flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  Max Limit: 15MB
                </div>
              </button>
            </div>
          )}

          {isScanning && (
            <div className="p-10 text-center bg-brand-card rounded-2xl border border-brand-border space-y-4 animate-pulse shadow-2xl">
              <div className="relative w-16 h-16 mx-auto">
                <Scan className="w-16 h-16 text-brand-primary animate-spin stroke-[1.5]" />
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-brand-blue animate-bounce" />
              </div>
              <p className="text-sm text-[#F5F5F7] font-bold">{labels.analyzingState}</p>
            </div>
          )}

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
          
          {/* Main Scoring Bento Card */}
          <div className="bg-brand-card border border-brand-border p-6 rounded-3xl relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-36 h-36 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <span className="text-[10px] text-[#555] uppercase tracking-wider font-bold block">{labels.scoreLabel} card</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{scanResult.productName}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border border-brand-border text-[#888] font-mono capitalize`}>
                    {scanResult.category.replace("_", " ")}
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border border-dashed ${getNovaBadge(scanResult.novaCategory).class}`}>
                    {getNovaBadge(scanResult.novaCategory).label}
                  </span>
                </div>
              </div>
              
              <div className="text-center shrink-0">
                <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 ${getScoreData(scanResult.healthScore).border} ${getScoreData(scanResult.healthScore).bg}`}>
                  <span id="final_product_score" className={`text-xl font-black font-mono leading-none ${getScoreData(scanResult.healthScore).color}`}>
                    {scanResult.healthScore}
                  </span>
                  <span className="text-[9px] text-[#555] font-bold uppercase mt-0.5">/100</span>
                </div>
                <div className={`text-[9px] font-bold mt-1.5 ${getScoreData(scanResult.healthScore).color}`}>
                  {getScoreData(scanResult.healthScore).label}
                </div>
              </div>
            </div>

            {/* Verdict statement */}
            <div className="p-4 bg-[#0A0A0A]/70 rounded-2xl border border-brand-border text-xs text-zinc-350 leading-relaxed flex gap-2.5 items-start shadow-inner">
              <Coffee className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">AI Coach Says: </span>
                {scanResult.verdict}
              </div>
            </div>
          </div>

          {/* Caloric details grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 bg-[#111111] border border-brand-border rounded-xl text-center space-y-1">
              <div className="text-[10px] text-[#888] uppercase font-mono">Calories</div>
              <div id="result_calories_val" className="text-sm font-bold text-white font-mono">{scanResult.macros.calories}</div>
              <div className="text-[9px] text-[#555]">kcal / 100g</div>
            </div>
            <div className="p-3 bg-[#111111] border border-brand-border rounded-xl text-center space-y-1">
              <div className="text-[10px] text-brand-primary uppercase font-mono font-bold">Protein</div>
              <div id="result_protein_val" className="text-sm font-bold text-brand-primary font-mono">{scanResult.macros.protein}g</div>
              <div className="text-[9px] text-[#555]">{Math.round(scanResult.macros.protein * 4)} kcal</div>
            </div>
            <div className="p-3 bg-[#111111] border border-brand-border rounded-xl text-center space-y-1">
              <div className="text-[10px] text-brand-blue uppercase font-mono font-bold">Fats</div>
              <div id="result_fat_val" className="text-sm font-bold text-brand-blue font-mono">{scanResult.macros.fat}g</div>
              <div className="text-[9px] text-[#555]">{Math.round(scanResult.macros.fat * 9)} kcal</div>
            </div>
            <div className="p-3 bg-[#111111] border border-brand-border rounded-xl text-center space-y-1">
              <div className="text-[10px] text-[#888] uppercase font-mono">Carbs</div>
              <div id="result_carbs_val" className="text-sm font-bold text-[#AAA] font-mono">{scanResult.macros.carbs}g</div>
              <div className="text-[9px] text-[#555]">{Math.round(scanResult.macros.carbs * 4)} kcal</div>
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
                className="w-full bg-brand-primary hover:bg-[#00E577] active:scale-[0.98] text-black font-extrabold py-4 px-4 rounded-xl shadow-lg transition-all text-sm uppercase flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                {labels.logMealBtn}
              </button>
            ) : (
              <div className="w-full bg-brand-primary/10 border border-brand-primary/35 p-3 rounded-xl text-center text-xs font-semibold text-brand-primary flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {labels.addedSuccess}
              </div>
            )}

            <button
              onClick={resetScanner}
              id="btn_scanner_reset"
              className="w-full bg-[#0A0A0A] hover:bg-brand-panel text-[#888] hover:text-[#F5F5F7] border border-brand-border-light py-3 px-4 rounded-xl text-xs font-semibold transition-all uppercase font-mono"
            >
              {labels.reScanBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
