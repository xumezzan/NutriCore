import React, { useState, useRef, useEffect } from "react";
import { UserProfile, CoachMessage, AppLanguage } from "../types";
import { Send, Sparkles, MessageSquare, Coffee, Dumbbell, ShieldAlert, ArrowDown, Mic, MicOff } from "lucide-react";

interface NutritionCoachProps {
  profile: UserProfile;
  language: AppLanguage;
  messages: CoachMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isThinking: boolean;
}

export default function NutritionCoach({
  profile,
  language,
  messages,
  onSendMessage,
  isThinking
}: NutritionCoachProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = {
    ru: {
      coachName: "AI Coach Нутрициолог",
      coachStatus: "Онлайн • Персональный советник",
      placeholder: "Задайте вопрос коучу (например: как снизить жирность плова?)...",
      pillsTitle: "Частые вопросы:",
      pill1: "Как облегчить калорийность плова? 🍛",
      pill2: "Вредна ли сомса при похудении? 🥐",
      pill3: "Полезна ли курага и сухофрукты? 🍑",
      pill4: "Какую лепешку лучше брать? 🌾",
      targetsCardTitle: "Ваши био-параметры в Ассистенте",
      gender: "Пол",
      weight: "Вес"
    },
    uz: {
      coachName: "AI Coach Nutriciolog",
      coachStatus: "Onlayn • Shaxsiy maslahatchi",
      placeholder: "Savolingizni yozing (masalan: palov yog'ini qanday kamaytirsa bo'ladi?)...",
      pillsTitle: "Tez-tez beriladigan savollar:",
      pill1: "Palovning kaloriyasini kamaytirish? 🍛",
      pill2: "Somsani ozganda yesa bo'ladimi? 🥐",
      pill3: "Turshak va quruq mevalar foydalimi? 🍑",
      pill4: "Qanday non tanlagan ma'qul? 🌾",
      targetsCardTitle: "Sizning bio-ma'lumotlaringiz:",
      gender: "Jinsi",
      weight: "Vazni"
    }
  }[language];

  const startSpeechRecognition = () => {
    const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      alert(language === "uz" ? "Ovozli kiritish ushbu brauzerda mavjud emas!" : "Голосовой ввод не поддерживается вашим браузером!");
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
        setInputText((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.onerror = (err: any) => {
        console.error("Coach chat voice input error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition for coach chat:", e);
      setIsListening(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const triggerPill = (text: string) => {
    if (isThinking) return;
    onSendMessage(text);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleInputFocus = () => {
    // Give the keyboard time to open, then scroll the input into view
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 300);
  };

  return (
    <div
      className="flex flex-col bg-brand-card/45 rounded-2xl border border-brand-border overflow-hidden shadow-2xl"
      style={{ height: "calc(var(--tg-viewport-actual) - 140px)" }}
      id="chat_coach_viewport"
    >
      
      {/* Upper header */}
      <div className="bg-brand-sidebar p-4 border-b border-brand-border-light flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-tr from-brand-blue to-brand-primary rounded-xl flex items-center justify-center text-black font-black font-sans uppercase">
              AI
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-brand-primary rounded-full border-2 border-[#000000]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">{labels.coachName}</h3>
            <p className="text-[10px] text-brand-primary font-bold">{labels.coachStatus}</p>
          </div>
        </div>

        <div className="bg-brand-panel px-3 py-1.5 rounded-xl border border-brand-border-light hidden xs:block">
          <span className="text-[10px] text-[#888] font-mono capitalize">
            Goal: {profile.goal === "lose" ? "Loss 📉" : profile.goal === "gain" ? "Gain 📈" : "Maintain ⚖️"}
          </span>
        </div>
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left scrollbar-thin scrollbar-thumb-brand-border">
        
        {/* Profile notification targets summary */}
        <div className="bg-brand-panel border border-brand-border-light p-3.5 rounded-xl flex items-center gap-3 shadow-inner">
          <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
          <div className="text-[11px] text-[#888] leading-normal font-medium">
            <span className="font-bold text-white">{labels.targetsCardTitle}</span>: Рост {profile.height} см, Вес {profile.weight} кг, Возраст {profile.age} лет. Коуч автоматически калибрует рекомендации под ваши цели.
          </div>
        </div>

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div 
              key={msg.id} 
              id={`coach_msg_item_${msg.id}`}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                  isUser 
                    ? "bg-brand-primary text-black font-bold rounded-tr-none" 
                    : "bg-brand-panel text-zinc-200 border border-brand-border-light rounded-tl-none space-y-1.5"
                }`}
              >
                {/* Paragraph spacing in coaches replies */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>
                <div className={`text-[9px] text-right font-mono mt-1 ${isUser ? "text-zinc-800" : "text-[#555]"}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Thinking loader */}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-brand-panel border border-brand-border-light rounded-2xl rounded-tl-none px-4 py-3.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Recommended Pills list */}
      {messages.length < 3 && !isThinking && (
        <div className="px-4 py-2 border-t border-brand-border-light text-left space-y-1.5 bg-brand-panel">
          <div className="text-[10px] text-[#555] font-mono uppercase tracking-wider font-bold">{labels.pillsTitle}</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-brand-border">
            <button
              onClick={() => triggerPill(labels.pill1)}
              className="bg-[#0A0A0A]/60 hover:bg-brand-card text-zinc-350 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-all hover:text-white"
            >
              {labels.pill1}
            </button>
            <button
              onClick={() => triggerPill(labels.pill2)}
              className="bg-[#0A0A0A]/60 hover:bg-brand-card text-zinc-350 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-all hover:text-white"
            >
              {labels.pill2}
            </button>
            <button
              onClick={() => triggerPill(labels.pill3)}
              className="bg-[#0A0A0A]/60 hover:bg-brand-card text-zinc-350 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-all hover:text-white"
            >
              {labels.pill3}
            </button>
            <button
              onClick={() => triggerPill(labels.pill4)}
              className="bg-[#0A0A0A]/60 hover:bg-brand-card text-zinc-350 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 transition-all hover:text-white"
            >
              {labels.pill4}
            </button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="p-3 bg-brand-sidebar border-t border-brand-border-light flex items-center gap-2">
        <button
          onClick={startSpeechRecognition}
          disabled={isThinking}
          className={`p-3 rounded-xl border transition-all shrink-0 cursor-pointer ${
            isListening
              ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse scale-105"
              : "bg-[#0A0A0A]/60 hover:bg-brand-panel border-brand-border-light text-[#888] hover:text-brand-primary"
          }`}
          title="Записать вопрос голосом"
        >
          {isListening ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        <input
          ref={inputRef}
          type="text"
          id="chat_input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          onFocus={handleInputFocus}
          placeholder={isListening ? (language === "uz" ? "Eshityapman... gapiring" : "Слушаю вас... говорите") : labels.placeholder}
          disabled={isThinking}
          className="flex-1 bg-[#0A0A0A]/60 border border-brand-border-light rounded-xl py-3 px-4 text-xs text-[#F5F5F7] placeholder-[#555] focus:outline-none focus:border-brand-primary-dim"
        />
        <button
          onClick={handleSend}
          id="chat_send_button"
          disabled={!inputText.trim() || isThinking}
          className="p-3 bg-brand-primary hover:bg-[#00E577] active:scale-[0.98] disabled:bg-brand-panel text-black disabled:text-[#444] rounded-xl transition-all shadow-md shrink-0 border border-brand-primary/10 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
