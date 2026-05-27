import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Layers, 
  Database, 
  Cpu, 
  Code, 
  Smartphone, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Info,
  Server,
  Workflow,
  Zap
} from "lucide-react";
import { SYSTEM_SPECS } from "../architectureDoc";

export default function SystemSpecs() {
  const [expandedSection, setExpandedSection] = useState<string | null>("architecture");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Layers": return <Layers className="w-5 h-5 text-brand-primary" />;
      case "Database": return <Database className="w-5 h-5 text-brand-blue" />;
      case "Cpu": return <Cpu className="w-5 h-5 text-brand-primary" />;
      case "Code": return <Code className="w-5 h-5 text-brand-blue" />;
      case "Smartphone": return <Smartphone className="w-5 h-5 text-brand-primary" />;
      case "TrendingUp": return <TrendingUp className="w-5 h-5 text-brand-blue" />;
      default: return <Server className="w-5 h-5 text-[#888]" />;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6" id="cto_architect_inspector">
      <div className="bg-gradient-to-r from-brand-sidebar via-brand-card to-brand-sidebar p-6 rounded-2xl border border-brand-border shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
            <Workflow className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">CTO Architecture & Specifications</h2>
            <p className="text-xs text-[#888]">Silicon Valley Startup Architecture & MVP Specification Manual</p>
          </div>
        </div>
        <p className="text-sm text-zinc-350 mt-4 leading-relaxed">
          Этот раздел содержит полную архитектурную спецификацию, разработанную на уровне 
          <span className="text-brand-primary font-bold"> Startup Unicorn</span>. Здесь спроектированы высокомасштабируемая база данных, конвейеры искусственного интеллекта (AI OCR) и механизмы монетизации для Узбекистана и СНГ.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {SYSTEM_SPECS.map((section) => {
          const isExpanded = expandedSection === section.id;
          return (
            <div 
              key={section.id} 
              id={`spec_${section.id}`}
              className="bg-brand-card rounded-2xl border border-brand-border overflow-hidden hover:border-brand-primary-dim/30 transition-all shadow-lg"
            >
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center justify-between p-5 text-left font-medium text-white hover:bg-[#111]/40 transition-colors"
               id={`btn_toggle_spec_${section.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-brand-panel rounded-xl border border-brand-border-light">
                    {getIcon(section.icon)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">{section.title}</h3>
                    <p className="text-xs text-[#888] font-normal mt-0.5 line-clamp-1">{section.content}</p>
                  </div>
                </div>
                <div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#555]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#555]" />
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-brand-border bg-[#050505]"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 mb-2 text-xs text-[#888] uppercase tracking-widest font-semibold font-mono">
                        <Zap className="w-3.5 h-3.5 text-brand-primary" />
                        Технические детали / Спецификации
                      </div>
                      
                      {Array.isArray(section.details) && typeof section.details[0] === "string" ? (
                        // Database Tables or Pipeline steps array of strings
                        <div className="space-y-3 font-mono text-xs">
                          {(section.details as string[]).map((detail, idx) => (
                            <div 
                              key={idx} 
                              className="p-3 bg-brand-panel rounded-xl border border-brand-border-light hover:border-brand-primary/20 relative group transition-all"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <span className="text-zinc-300 leading-relaxed text-left break-all select-all">{detail}</span>
                                <button
                                  onClick={() => handleCopy(detail)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#1C1C1E] rounded text-[#888] hover:text-white transition-opacity shrink-0"
                                  title="Скопировать"
                                >
                                  {copiedText === detail ? (
                                    <Check className="w-3.5 h-3.5 text-brand-primary" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Standard key value config array of objects
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {(section.details as { label: string; value: string }[]).map((detail, idx) => (
                            <div 
                              key={idx} 
                              className="p-3.5 bg-brand-panel rounded-xl border border-brand-border-light space-y-1"
                            >
                              <div className="text-xs text-[#888] font-bold">{detail.label}</div>
                              <div className="text-sm text-zinc-200 font-medium leading-normal break-words">{detail.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="p-5 bg-brand-panel rounded-2xl border border-dashed border-brand-border-light flex items-start gap-3.5 shadow-md">
        <Info className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div className="text-xs text-[#888] leading-relaxed">
          <span className="font-bold text-white">Паттерн Векторного Кэширования ингредиентов: </span>
          Так как в супермаркетах Узбекистана (Korzinka, Makro) порядка 90% продуктов повторяются у разных пользователей, мы внедряем хэширование raw_ocr_hash. Это исключает повторные платные вызовы OCR/Vision LLM в 90% случаев, снижая затраты на инфраструктуру на $1,800/мес при нагрузке в 10,000 MAU.
        </div>
      </div>
    </div>
  );
}
