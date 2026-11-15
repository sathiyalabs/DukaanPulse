"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Bill,
  Product,
  getSavedBills,
  getSavedProducts,
  speakTamil,
  stopSpeaking,
} from "@/lib/billing";
import {
  analyzeStoreBills,
  answerStoreAIQuestion,
  StoreAIAnalysis,
} from "@/lib/ai-assistant";
import {
  LiveWeatherData,
  WEATHER_PRESETS,
  fetchLiveOnlineWeather,
} from "@/lib/weather";
import {
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  Clock3,
  AlertTriangle,
  ArrowRight,
  Send,
  Bot,
  User,
  CheckCircle2,
  SlidersHorizontal,
  Zap,
  CloudSun,
  Layers,
  RefreshCw,
} from "lucide-react";

type Message = {
  id: string;
  sender: "user" | "ai";
  title?: string;
  text: string;
  timestamp: string;
  topic?: string;
  model?: string;
  source?: string;
};

export function AIAssistantScreen({
  lang,
  onGoToActions,
}: {
  lang: "en-IN" | "hi-IN" | "ta-IN";
  onGoToBilling?: () => void;
  onGoToActions: () => void;
}) {
  const isTamil = lang === "ta-IN";
  const isHindi = lang === "hi-IN";
  const [bills] = useState<Bill[]>(() => getSavedBills());
  const [products] = useState<Product[]>(() => getSavedProducts());
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Live Weather & Climate State (Online Open-Meteo Integration)
  const [weather, setWeather] = useState<LiveWeatherData>(WEATHER_PRESETS.cloudy);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherPreset, setWeatherPreset] = useState<string>("online");
  const [aiVerifiedState, setAiVerifiedState] = useState<"verified" | "configured" | "local">("local");

  useEffect(() => {
    let active = true;
    fetchLiveOnlineWeather()
      .then((w) => {
        if (active) {
          setWeather(w);
          setWeatherLoading(false);
        }
      })
      .catch(() => {
        if (active) setWeatherLoading(false);
      });

    fetch("/api/health")
      .then((r) => r.json())
      .then((raw) => {
        const d = (raw || {}) as { configured?: boolean; liveVerified?: boolean };
        if (active) {
          if (d.liveVerified) setAiVerifiedState("verified");
          else if (d.configured) setAiVerifiedState("configured");
          else setAiVerifiedState("local");
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleSelectWeather = (key: string) => {
    setWeatherPreset(key);
    if (key === "online") {
      setWeatherLoading(true);
      fetchLiveOnlineWeather().then((w) => {
        setWeather(w);
        setWeatherLoading(false);
      });
    } else if (key in WEATHER_PRESETS) {
      setWeather(WEATHER_PRESETS[key as keyof typeof WEATHER_PRESETS]);
    }
  };

  const currentHour = useMemo(() => new Date().getHours(), []);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      sender: "ai",
      title:
        isTamil
          ? "வணக்கம்! DukaanPulse AI வணிக உதவியாளர் & முடிவுகள் தயார்."
          : isHindi
            ? "नमस्ते! DukaanPulse सर्वम AI व्यापार सहायक और निर्णय तैयार हैं।"
            : "Welcome! DukaanPulse Sarvam AI Store Assistant & Decisions are ready.",
      text:
        isTamil
          ? "நேரடி வானிலை, 6 நாள் விற்பனை போக்கு மற்றும் நேரத்தைக் கணித்து உங்கள் கடையின் லாபத்தை உயர்த்த நான் வழிகாட்டுகிறேன். என்ன கேட்க விரும்புகிறீர்கள்?"
          : isHindi
            ? "लाइव मौसम, 6-दिवसीय बिक्री रिपोर्ट और समय के आधार पर मैं आपकी दुकान की बिक्री बढ़ाने में मदद करूँगा। आप क्या पूछना चाहते हैं?"
            : "Powered by live weather, 6-day sales trends, and time-of-day analytics to boost your store's profit. How can I help you today?",
      timestamp: isTamil ? "இன்று" : isHindi ? "आज" : "Today",
      topic: "general",
    },
  ]);

  // Recognition ref
  const recognitionRef = useRef<unknown>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(0);

  const analysis: StoreAIAnalysis = useMemo(() => {
    return analyzeStoreBills(bills, "2026-11-15", products, weather, currentHour);
  }, [bills, products, weather, currentHour]);

  // Scroll to bottom on message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice Speech-To-Text (STT) toggle
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        (recognitionRef.current as { stop: () => void }).stop();
      }
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert(
        isTamil
          ? "உங்கள் உலாவியில் குரல் உள்ளீடு (STT) ஆதரிக்கப்படவில்லை. தயவுசெய்து தட்டச்சு செய்யவும்."
          : "Voice recognition not supported in this browser. Please type.",
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass() as {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        start: () => void;
        stop: () => void;
        onstart: () => void;
        onresult: (e: {
          results: { [key: number]: { [key: number]: { transcript: string } } };
        }) => void;
        onerror: (e: unknown) => void;
        onend: () => void;
      };

      recognition.lang = lang; // Matches active language
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          setInputText(transcript);
          handleAskAI(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  // Submit Question to AI
  const handleAskAI = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isGenerating) return;

    msgCounter.current += 1;
    const count = msgCounter.current;

    const userMsg: Message = {
      id: `user_msg_${count}`,
      sender: "user",
      text: q,
      timestamp: isTamil ? "இப்போது" : isHindi ? "अभी" : "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsGenerating(true);

    try {
      const storeContext = {
        shopName: "Marina Tea & Snacks",
        todaySales: analysis.todayRevenue,
        todayBills: analysis.todayBillsCount,
        yesterdaySales: analysis.yesterdayRevenue,
        topProducts: analysis.topProduct
          ? [
              {
                name: isTamil ? analysis.topProduct.nameTa : analysis.topProduct.name,
                quantity: analysis.topProduct.units,
                amount: analysis.topProduct.revenue,
              },
            ]
          : [],
        zeroSaleProducts: products
          .filter((p) => !bills.some((b) => b.items.some((it) => it.productId === p.id)))
          .map((p) => (isTamil ? p.nameTa : p.name))
          .slice(0, 5),
        inactiveDeadHours: analysis.timeWindows
          .filter((w) => w.isFlagged)
          .map((w) => `${w.windowLabel} (₹${w.todayRevenue})`),
        weather: {
          temp: weather.tempC,
          condition: weather.condition,
          description: isTamil ? weather.conditionLabelTa : weather.conditionLabelEn,
          timeOfDay: currentHour >= 18 ? "Evening" : currentHour >= 12 ? "Afternoon" : "Morning",
        },
        currentTime: `${currentHour}:00`,
      };

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          lang,
          storeContext,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          success?: boolean;
          title?: string;
          answer?: string;
          topic?: string;
          source?: string;
          model?: string;
        };

        if (data.success && data.answer) {
          if (data.source === "sarvam") {
            setAiVerifiedState("verified");
          }
          const aiMsg: Message = {
            id: `ai_msg_${count}`,
            sender: "ai",
            title: data.title,
            text: data.answer,
            timestamp: isTamil ? "இப்போது" : isHindi ? "अभी" : "Just now",
            topic: data.topic,
            source: data.source,
            model: data.model || "sarvam-105b",
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsGenerating(false);
          handlePlayTTS(aiMsg.text);
          return;
        }
      }
    } catch (err) {
      console.warn("AI Chat API error, using local analysis fallback:", err);
    }

    // Fallback if network or server error
    const reply = answerStoreAIQuestion(
      q,
      bills,
      "2026-11-15",
      products,
      weather,
      currentHour,
      lang,
    );

    const aiMsg: Message = {
      id: `ai_msg_${count}`,
      sender: "ai",
      title: reply.title,
      text: reply.activeAnswer,
      timestamp: isTamil ? "இப்போது" : isHindi ? "अभी" : "Just now",
      topic: reply.topic,
      source: "fallback",
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsGenerating(false);
    handlePlayTTS(aiMsg.text);
  };

  // Text-To-Speech (TTS)
  const handlePlayTTS = (textToSpeak: string) => {
    setIsSpeaking(true);
    speakTamil(
      textToSpeak,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      lang,
    );
  };

  const handleStopTTS = () => {
    stopSpeaking();
    setIsSpeaking(false);
  };

  return (
    <div className="ai-assistant-container">
      {/* Top Banner */}
      <div className="ai-topbar">
        <div className="ai-title-wrap">
          <div className="ai-symbol-badge">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="ai-title">
              {isTamil
                ? "DukaanPulse AI வணிக உதவியாளர் & முடிவுகள்"
                : isHindi
                  ? "DukaanPulse AI व्यापार सहायक और निर्णय"
                  : "DukaanPulse AI Store Assistant & Decisions"}
            </h1>
            <p className="ai-subtitle">
              {isTamil
                ? "விற்பனை சரிவு ஆய்வு, நேரச் சாளர பரிசோதனை (DukaanPulse Feature), சர்வம் AI முடிவெடுத்தல் மற்றும் குரல் உரையாடல்."
                : isHindi
                  ? "बिक्री मंदी विश्लेषण, समय-खिड़की जांच, सर्वम AI रणनीतिक निर्णय और वॉइस बातचीत।"
                  : "Real-time sales dip diagnostics, time-window dip analysis, Sarvam AI decisions, and voice conversation."}
            </p>
          </div>
        </div>

        <div className={`ai-status-pill status-${aiVerifiedState}`}>
          <span className={`live-dot ${aiVerifiedState === "verified" ? "verified" : aiVerifiedState === "configured" ? "configured" : "local"}`}></span>
          <span>
            {aiVerifiedState === "verified"
              ? isTamil
                ? "Sarvam AI சரிபார்க்கப்பட்டது (நேரடி)"
                : isHindi
                  ? "Sarvam AI सत्यापित (सक्रिय)"
                  : "Sarvam AI Verified (Active)"
              : aiVerifiedState === "configured"
                ? isTamil
                  ? "Sarvam AI அமைக்கப்பட்டுள்ளது (சரிபார்ப்பு நிலுவையில்)"
                  : isHindi
                    ? "Sarvam AI कॉन्फ़िगर (सत्यापन प्रतीक्षारत)"
                    : "Sarvam Configured (Pending Live Verification)"
                : isTamil
                  ? "விதிமுறை சார்ந்த AI இயங்குகிறது (உள்ளூர்)"
                  : isHindi
                    ? "नियम-आधारित AI इंजन सक्रिय (स्थानीय)"
                    : "Rule-Based Engine Active (Local)"}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LIVE CLIMATE, WEATHER & TIME STORE GUIDE (OPEN-METEO)   */}
      {/* ======================================================== */}
      <div className="weather-guide-card">
        <div className="weather-header">
          <div className="weather-header-left">
            <span className="weather-main-emoji">{weather.emoji}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="weather-temp-num">{weather.tempC}°C</span>
                <span className="weather-condition-label">
                  {isTamil ? weather.conditionLabelTa : weather.conditionLabelEn}
                </span>
              </div>
              <small style={{ color: "#64748b", fontSize: 11 }}>
                {weather.city} · {weather.updatedAt}
              </small>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="weather-online-badge">
              <span className="live-dot"></span>
              <span>
                {weather.source === "online"
                  ? isTamil ? "நேரடி ஆன்லைன் தகவல்" : isHindi ? "लाइव ऑनलाइन डेटा" : "Live Online Data"
                  : isTamil ? "பரிசோதனை வானிலை" : isHindi ? "सिम्युलेटेड मौसम" : "Simulated Weather"}
              </span>
            </span>
            <button
              className="weather-preset-pill"
              onClick={() => handleSelectWeather("online")}
              disabled={weatherLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <RefreshCw size={12} className={weatherLoading ? "spin" : ""} />
              <span>{isTamil ? "ஆன்லைன் புதுப்பி" : isHindi ? "लाइव सिंक करें" : "Sync Live"}</span>
            </button>
          </div>
        </div>

        {/* Climate Metrics Row */}
        <div className="weather-meta-row">
          <span>💧 {isTamil ? "ஈரப்பதம்:" : isHindi ? "नमी:" : "Humidity:"} <strong>{weather.humidity}%</strong></span>
          <span>🌧️ {isTamil ? "மழை அளவு:" : isHindi ? "वर्षा:" : "Rainfall:"} <strong>{weather.precipitationMm} mm</strong></span>
          <span>💨 {isTamil ? "காற்று வேகம்:" : isHindi ? "हवा की गति:" : "Wind:"} <strong>{weather.windSpeedKmH} km/h</strong></span>
          <span>
            ⏰ {isTamil ? "இயக்க நேரம்:" : isHindi ? "समय चक्र:" : "Time Window:"}{" "}
            <strong>
              {currentHour < 11
                ? (isTamil ? "காலை வேளை (07:00 - 11:00)" : isHindi ? "सुबह का समय (07:00 - 11:00)" : "Morning Rush (07-11)")
                : currentHour < 15
                ? (isTamil ? "மதிய மந்தமான வேளை (11:00 - 15:00)" : isHindi ? "दोपहर की मंदी (11:00 - 15:00)" : "Afternoon Slump (11-15)")
                : currentHour < 19
                ? (isTamil ? "மாலை பீக் வேளை (15:00 - 19:00)" : isHindi ? "शाम का पीक समय (15:00 - 19:00)" : "Evening Rush (15-19)")
                : (isTamil ? "இரவு வேளை (19:00 - 22:00)" : isHindi ? "रात का समय (19:00 - 22:00)" : "Night (19-22)")}
            </strong>
          </span>
        </div>

        {/* Weather Preset Selector Bar */}
        <div className="weather-presets-bar">
          <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
            {isTamil ? "வானிலை மாதிரி தேர்வு:" : isHindi ? "मौसम परीक्षण:" : "Test Weather:"}
          </span>
          {[
            { id: "online", label: isTamil ? "🌐 நேரடி ஆன்லைன்" : isHindi ? "🌐 लाइव ऑनलाइन" : "🌐 Live Online" },
            { id: "rain", label: isTamil ? "🌧️ மழை / குளிர்" : isHindi ? "🌧️ बारिश / ठंड" : "🌧️ Rainy / Cool" },
            { id: "hot", label: isTamil ? "☀️ கடும் வெயில்" : isHindi ? "☀️ भीषण गर्मी" : "☀️ Hot Summer" },
            { id: "cloudy", label: isTamil ? "⛅ மேகமூட்டம்" : isHindi ? "⛅ बादल छाए हुए" : "⛅ Overcast Cloudy" },
            { id: "pleasant", label: isTamil ? "🍃 மிதமான இதமான" : isHindi ? "🍃 सुहावना मौसम" : "🍃 Pleasant Breeze" },
          ].map((preset) => (
            <button
              key={preset.id}
              className={`weather-preset-pill ${weatherPreset === preset.id ? "active" : ""}`}
              onClick={() => handleSelectWeather(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Live Retail Advice Box */}
        <div className="weather-advice-box">
          <div className="weather-advice-title">
            <CloudSun size={17} style={{ color: "#0284c7" }} />
            <span>{analysis.weatherAdvice.title}</span>
          </div>
          <p className="weather-advice-text">{analysis.weatherAdvice.adviceText}</p>
          <div className="recommended-items-row">
            <span style={{ fontWeight: 700, color: "#166534" }}>
              {isTamil ? "பரிந்துரைக்கப்படும் பொருட்கள்:" : isHindi ? "अनुशंसित उच्च मांग वाले सामान:" : "High-Demand Items:"}
            </span>
            {analysis.weatherAdvice.recommendedItems.map((item, idx) => (
              <span key={idx} className="rec-item-badge">
                ✓ {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6 SALES REPORTS PERFORMANCE BREAKDOWN (MULTI-DAY TREND) */}
      {/* ======================================================== */}
      <div className="six-day-card">
        <div className="six-day-header">
          <h3 className="six-day-title">
            <Layers size={18} style={{ color: "var(--navy)" }} />
            <span>
              {isTamil
                ? "6 நாள் விற்பனை அறிக்கைகளின் ஒப்பீடு (6 Sales Reports Trend)"
                : isHindi
                  ? "6-दिवसीय बिक्री रिपोर्ट और रुझान"
                  : "6-Day Sales Reports Performance Trend"}
            </span>
          </h3>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {isTamil
              ? `6 நாள் மொத்த வசூல்: ₹${analysis.total6DayRevenue} | தினசரி சராசரி: ₹${analysis.avg6DayDailyRevenue}`
              : isHindi
                ? `6-दिन कुल राजस्व: ₹${analysis.total6DayRevenue} | दैनिक औसत: ₹${analysis.avg6DayDailyRevenue}`
                : `Total 6-Day Revenue: ₹${analysis.total6DayRevenue} | Daily Avg: ₹${analysis.avg6DayDailyRevenue}`}
          </div>
        </div>

        <div className="six-day-grid">
          {analysis.sixDayReports.map((r, i) => (
            <div key={i} className={`day-box ${r.date === "2026-11-15" ? "is-today" : ""}`}>
              <span className="day-date">
                {r.date === "2026-11-15"
                  ? isTamil ? "இன்று (15 Nov)" : isHindi ? "आज (15 Nov)" : "Today (15 Nov)"
                  : r.date.slice(5)}
              </span>
              <strong className="day-rev">₹{r.revenue}</strong>
              <small className="day-sub">{r.billsCount} bills</small>
              <small style={{ fontSize: 9.5, color: "#0284c7", fontWeight: 600 }}>
                {r.topItem}
              </small>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SARVAM AI STRATEGIC DECISION ENGINE                    */}
      {/* ======================================================== */}
      <div className="sarvam-decision-panel">
        <div className="sarvam-decision-header">
          <div className="decision-header-left">
            <span className="paytm-brand-tag">Paytm Merchant AI Decision Engine</span>
            <h2>
              {isTamil
                ? "💡 சர்வம் AI வணிக முடிவுகள் (Sarvam Decision Engine)"
                : isHindi
                  ? "💡 सर्वम AI रणनीतिक निर्णय (Decision Engine)"
                  : "💡 Sarvam AI Store Strategic Decisions"}
            </h2>
            <p>
              {isTamil
                ? "நேரடி வானிலை, 6 நாள் விற்பனைப் போக்கு மற்றும் மந்தமான நேரத்தைக் கணித்து உருவாக்கப்பட்ட தானியங்கி முடிவுகள்."
                : isHindi
                  ? "लाइव मौसम, 6-दिवसीय बिक्री रुझान और मंदी के समय के आधार पर स्वतः उत्पन्न रणनीतिक निर्णय।"
                  : "Actionable store strategies powered by real-time climate, 6-day sales velocity, and peak/slump intervals."}
            </p>
          </div>
        </div>

        <div className="sarvam-decision-cards-grid">
          {analysis.decisions.map((dec) => (
            <div key={dec.id} className={`sarvam-decision-card priority-${dec.priority}`}>
              <div className="decision-card-top">
                <span className="decision-icon">{dec.icon}</span>
                <span className={`decision-badge badge-${dec.priority}`}>
                  {isTamil ? dec.badgeTa : isHindi ? dec.badgeHi : dec.badgeEn}
                </span>
                <button
                  className="decision-listen-btn"
                  title="Listen via Sarvam AI"
                  onClick={() =>
                    handlePlayTTS(
                      isTamil ? dec.voiceTextTa : isHindi ? dec.voiceTextHi : dec.voiceTextEn,
                    )
                  }
                >
                  <Volume2 size={16} />
                  <span>{isTamil ? "கேட்க" : isHindi ? "सुनें" : "Listen"}</span>
                </button>
              </div>

              <h3 className="decision-title">
                {isTamil ? dec.titleTa : isHindi ? dec.titleHi : dec.titleEn}
              </h3>
              <p className="decision-context">
                {isTamil ? dec.contextTa : isHindi ? dec.contextHi : dec.contextEn}
              </p>
              <div className="decision-recommendation-box">
                <Sparkles size={16} className="text-cyan" />
                <p>{isTamil ? dec.recommendationTa : isHindi ? dec.recommendationHi : dec.recommendationEn}</p>
              </div>
              <div className="decision-footer">
                <div className="decision-impact">
                  <small>{isTamil ? "எதிர்பார்க்கப்படும் பலன்:" : isHindi ? "अनुमानित लाभ:" : "Projected Impact:"}</small>
                  <strong>{isTamil ? dec.projectedImpactTa : isHindi ? dec.projectedImpactHi : dec.projectedImpactEn}</strong>
                </div>
                <button className="decision-action-btn" onClick={onGoToActions}>
                  <span>{isTamil ? dec.actionLabelTa : isHindi ? dec.actionLabelHi : dec.actionLabelEn}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DUKAANPULSE TIME-WINDOW SALES DIP CARD (SOUND TO TIME DIP) */}
      {/* ======================================================== */}
      <div className="ai-dip-card">
        <div className="dip-card-head">
          <div className="dip-head-left">
            <Clock3 size={20} className="text-amber" />
            <div>
              <h3>
                {isTamil
                  ? "நேரச் சாளர விற்பனை சரிவு ஆய்வு (DukaanPulse Time-Window Dips)"
                  : isHindi
                    ? "समय-अवधि बिक्री गिरावट विश्लेषण (DukaanPulse Time-Window Dips)"
                    : "Time-Window Sales Dip Diagnostics"}
              </h3>
              <p>
                {isTamil
                  ? "ஒவ்வொரு நேரத்திலும் முந்தைய சராசரியை விட விற்பனை எவ்வளவு குறைந்துள்ளது (சரிவு) என்பதை AI கண்டறிந்துள்ளது."
                  : isHindi
                    ? "प्रत्येक समय-अवधि में पिछले औसत की तुलना में बिक्री में कितनी गिरावट आई है, AI ने इसका विश्लेषण किया है।"
                    : "Detects time-window transaction drops against historical medians to flag revenue leaks."}
              </p>
            </div>
          </div>
          <button className="goto-actions-pill" onClick={onGoToActions}>
            <SlidersHorizontal size={15} />
            <span>
              {isTamil
                ? "காம்போ சலுகை உருவாக்குக"
                : isHindi
                  ? "कॉम्बो ऑफर बनाएं"
                  : "Create Combo Offer"}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Windows Grid */}
        <div className="windows-grid">
          {analysis.timeWindows.map((win, idx) => (
            <div
              key={idx}
              className={`window-card ${win.isFlagged ? "flagged-window" : ""}`}
            >
              <div className="window-header">
                <strong>
                  {isTamil
                    ? win.windowLabelTa || win.windowLabel
                    : isHindi
                      ? win.windowLabelHi || win.windowLabel
                      : win.windowLabelEn || win.windowLabel}
                </strong>
                {win.isFlagged ? (
                  <span className="dip-badge">
                    <AlertTriangle size={13} />
                    {win.dipPercent}%{" "}
                    {isTamil ? "சரிவு!" : isHindi ? "गिरावट!" : "Dip!"}
                  </span>
                ) : (
                  <span className="normal-badge">
                    <CheckCircle2 size={13} />
                    {isTamil ? "சீர்" : isHindi ? "सामान्य" : "Normal"}
                  </span>
                )}
              </div>

              <div className="window-counts-row">
                <div>
                  <small>
                    {isTamil
                      ? "இன்று பில்கள்"
                      : isHindi
                        ? "आज के बिल"
                        : "Today Bills"}
                  </small>
                  <strong>{win.todayCount}</strong>
                </div>
                <div className="count-divider">vs</div>
                <div>
                  <small>
                    {isTamil
                      ? "முந்தைய சராசரி"
                      : isHindi
                        ? "पिछला औसत"
                        : "Past Median"}
                  </small>
                  <strong>{win.historicalMedianCount}</strong>
                </div>
                <div className="window-rev">
                  <small>
                    {isTamil
                      ? "இன்று வசூல்"
                      : isHindi
                        ? "आज का राजस्व"
                        : "Revenue"}
                  </small>
                  <strong>₹{win.todayRevenue}</strong>
                </div>
              </div>

              <div className="window-status-text">
                <p>
                  {isTamil
                    ? win.statusTa
                    : isHindi
                      ? win.statusHi
                      : win.statusEn}
                </p>
                {win.isFlagged && (
                  <div className="ai-rec-box">
                    <Zap size={14} className="rec-icon" />
                    <span>
                      {isTamil
                        ? win.recommendationTa
                        : isHindi
                          ? win.recommendationHi
                          : win.recommendationEn}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DAY-OVER-DAY SALES DIP KPI SUMMARY */}
      {/* ======================================================== */}
      <div className="ai-kpis-row">
        <div className="ai-kpi-card">
          <span className="kpi-tag">
            {isTamil
              ? "இன்றைய விற்பனை"
              : isHindi
                ? "आज की कुल बिक्री"
                : "Today Sales"}
          </span>
          <strong className="kpi-big text-cyan">₹{analysis.todayRevenue}</strong>
          <small>
            {analysis.todayBillsCount}{" "}
            {isTamil
              ? "பில்கள் போடப்பட்டுள்ளன"
              : isHindi
                ? "बिल दर्ज किए गए"
                : "bills recorded"}
          </small>
        </div>

        <div className={`ai-kpi-card ${analysis.isDayDip ? "kpi-alert" : "kpi-success"}`}>
          <span className="kpi-tag">
            {isTamil
              ? "நேற்றுடன் ஒப்பீடு (விற்பனை சரிவு)"
              : isHindi
                ? "कल से तुलना (बिक्री गिरावट)"
                : "Comparison vs Yesterday"}
          </span>
          <strong className="kpi-big">
            {analysis.isDayDip ? (
              <span className="text-red">
                -₹{Math.abs(analysis.dayOverDayDeltaRevenue)} (
                {analysis.dayOverDayDipPercent}%{" "}
                {isTamil ? "குறைவு" : isHindi ? "गिरावट" : "Dip"})
              </span>
            ) : (
              <span className="text-green">
                +₹{analysis.dayOverDayDeltaRevenue} (
                {isTamil ? "அதிகம்" : isHindi ? "वृद्धि" : "Growth"})
              </span>
            )}
          </strong>
          <small>
            {isTamil
              ? `நேற்றைய வசூல்: ₹${analysis.yesterdayRevenue}`
              : isHindi
                ? `कल की बिक्री: ₹${analysis.yesterdayRevenue}`
                : `Yesterday: ₹${analysis.yesterdayRevenue}`}
          </small>
        </div>

        <div className="ai-kpi-card">
          <span className="kpi-tag">
            {isTamil
              ? "அதிகம் விற்ற பொருள்"
              : isHindi
                ? "शीर्ष बिकने वाला उत्पाद"
                : "Top Item"}
          </span>
          <strong className="kpi-big text-navy">
            {analysis.topProduct
              ? isTamil
                ? analysis.topProduct.nameTa
                : isHindi
                  ? analysis.topProduct.nameHi || analysis.topProduct.name
                  : analysis.topProduct.name
              : "—"}
          </strong>
          <small>
            {analysis.topProduct
              ? `${analysis.topProduct.units} ${
                  isTamil
                    ? "எண்ணிக்கை"
                    : isHindi
                      ? "पीस"
                      : "sold"
                } (₹${analysis.topProduct.revenue})`
              : isTamil
                ? "பதிவு இல்லை"
                : isHindi
                  ? "कोई डेटा नहीं"
                  : "No record"}
          </small>
        </div>
      </div>

      {/* ======================================================== */}
      {/* INTERACTIVE CHAT & VOICE CONVERSATION SECTION */}
      {/* ======================================================== */}
      <div className="ai-chat-card">
        <div className="chat-card-header">
          <div className="chat-header-left">
            <Bot size={22} className="text-cyan" />
            <div>
              <h3>
                {isTamil
                  ? "AI வணிக உதவியாளருடன் குரல் உரையாடல்"
                  : isHindi
                    ? "AI व्यापार सहायक के साथ वॉयस बातचीत"
                    : "Conversational Store Assistant"}
              </h3>
              <p>
                {isTamil
                  ? "மைக் பட்டனை அழுத்தி தமிழில் பேசலாம்; சர்வம் AI பதில்களை குரலில் பேசிப் புரியவைக்கும்."
                  : isHindi
                    ? "माइक दबाकर हिंदी में बोलें; सर्वम AI बोलकर जवाब देगा।"
                    : "Speak using microphone; Sarvam AI understands and replies aloud."}
              </p>
            </div>
          </div>

          <div className="chat-audio-controls">
            {isSpeaking ? (
              <button className="tts-stop-btn" onClick={handleStopTTS}>
                <VolumeX size={16} />
                <span>
                  {isTamil
                    ? "குரலை நிறுத்துக"
                    : isHindi
                      ? "ध्वनि रोकें"
                      : "Stop Speech"}
                </span>
              </button>
            ) : (
              <span className="tts-hint">
                <Volume2 size={16} />
                {isTamil
                  ? "குரல் அறிவிப்பு தயார்"
                  : isHindi
                    ? "ध्वनि उद्घोषणा तैयार"
                    : "Voice Ready"}
              </span>
            )}
          </div>
        </div>

        {/* Quick Voice Question Chips */}
        <div className="quick-query-chips">
          <span className="chips-label">
            {isTamil
              ? "உடனடிக் கேள்விகள்:"
              : isHindi
                ? "त्वरित प्रश्न:"
                : "Quick Queries:"}
          </span>
          {[
            {
              label: isTamil
                ? "🌤️ வானிலைக்கேற்ப என்ன விற்கலாம்?"
                : isHindi
                  ? "🌤️ मौसम अनुसार क्या बेचें?"
                  : "🌤️ Weather Demand",
              q: isTamil
                ? "இன்றைய வானிலை மற்றும் தட்பவெப்பத்திற்கு என்ன விற்கலாம்?"
                : isHindi
                  ? "आज के मौसम और तापमान के अनुसार क्या बेचना चाहिए?"
                  : "What should we sell based on today's weather?",
            },
            {
              label: isTamil
                ? "💡 சர்வம் AI முடிவுகள் & தீர்வுகள்"
                : isHindi
                  ? "💡 सर्वम AI रणनीतिक निर्णय"
                  : "💡 Sarvam AI Decisions",
              q: isTamil
                ? "கடைக்கான சர்வம் AI முடிவுகள் மற்றும் வழிகாட்டுதல் என்ன?"
                : isHindi
                  ? "दुकान के लिए सर्वम AI के रणनीतिक निर्णय और मार्गदर्शन क्या हैं?"
                  : "What are the Sarvam AI actionable store decisions?",
            },
            {
              label: isTamil
                ? "📊 6 நாள் விற்பனை அறிக்கை"
                : isHindi
                  ? "📊 6-दिवसीय बिक्री रिपोर्ट"
                  : "📊 6-Day Sales Report",
              q: isTamil
                ? "6 நாள் விற்பனை அறிக்கை விவரம் கொடுங்கள்"
                : isHindi
                  ? "पिछले 6 दिनों की बिक्री रिपोर्ट का विवरण दें"
                  : "Provide the 6-day sales trend and breakdown",
            },
            {
              label: isTamil
                ? "⏰ எந்த நேரத்துல சேல்ஸ் சரிந்தது?"
                : isHindi
                  ? "⏰ किस समय बिक्री मंद रही?"
                  : "⏰ Time Window Dip",
              q: isTamil
                ? "எந்த நேரத்தில் விற்பனை சரிந்தது அல்லது மந்தமாக இருந்தது?"
                : isHindi
                  ? "किस समय बिक्री सबसे कम या मंद रही?"
                  : "Which time window experienced a sales dip?",
            },
            {
              label: isTamil
                ? "📉 நேற்றை விட எவ்வளவு கம்மியாச்சு?"
                : isHindi
                  ? "📉 कल से कितनी गिरावट हुई?"
                  : "📉 Sales Dip vs Yesterday",
              q: isTamil
                ? "நேற்றை விட இன்று எவ்வளவு கம்மியாகியுள்ளது?"
                : isHindi
                  ? "कल की तुलना में आज कितनी बिक्री कम हुई?"
                  : "How much did sales dip compared to yesterday?",
            },
            {
              label: isTamil
                ? "🛍️ அதிகம் விற்ற பொருள் எது?"
                : isHindi
                  ? "🛍️ सबसे अधिक बिकने वाला उत्पाद?"
                  : "🛍️ Top Items",
              q: isTamil
                ? "எந்த பொருள் அதிகம் மற்றும் குறைவாக விற்றது?"
                : isHindi
                  ? "कौन से उत्पाद सबसे अधिक और सबसे कम बिके?"
                  : "Which items had the highest and lowest sales?",
            },
          ].map((item, i) => (
            <button
              key={i}
              className="query-pill"
              onClick={() => handleAskAI(item.q)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Chat Messages Feed */}
        <div className="chat-messages-container">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`message-bubble ${m.sender === "user" ? "user-bubble" : "ai-bubble"}`}
            >
              <div className="bubble-sender">
                {m.sender === "ai" ? (
                  <span className="sender-tag ai-tag">
                    <Bot size={14} /> DukaanPulse AI
                    {m.source === "sarvam" ? (
                      <small className="ai-model-tag verified" style={{ background: "#d1fae5", color: "#065f46", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                        ✓ Sarvam AI Verified ({m.model || "sarvam-105b"})
                      </small>
                    ) : (
                      <small className="ai-model-tag" style={{ background: "var(--surface-hover)", color: "#64748b", padding: "1px 6px", borderRadius: 4 }}>
                        🛡️ Rule-based Grounded Engine
                      </small>
                    )}
                  </span>
                ) : (
                  <span className="sender-tag user-tag">
                    <User size={14} />{" "}
                    {isTamil
                      ? "வணிகர் (நீங்கள்)"
                      : isHindi
                        ? "व्यापारी (आप)"
                        : "You (Merchant)"}
                  </span>
                )}
                <span className="bubble-time">{m.timestamp}</span>
              </div>

              {m.title && <h4 className="bubble-title">{m.title}</h4>}
              <p className="bubble-text">{m.text}</p>

              {m.sender === "ai" && (
                <div className="bubble-actions">
                  <button
                    className="speak-bubble-btn"
                    onClick={() => (isSpeaking ? handleStopTTS() : handlePlayTTS(m.text))}
                  >
                    {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    <span>
                      {isSpeaking
                        ? isTamil
                          ? "நிறுத்து"
                          : isHindi
                            ? "रोकें"
                            : "Stop"
                        : isTamil
                          ? "சர்வம் குரலில் கேட்க"
                          : isHindi
                            ? "सर्वम आवाज़ में सुनें"
                            : "Sarvam Neural Voice"}
                    </span>
                  </button>
                  {m.topic === "time_window" && (
                    <button
                      className="offer-action-btn"
                      onClick={onGoToActions}
                    >
                      <SlidersHorizontal size={14} />
                      <span>
                        {isTamil
                          ? "சலுகை உருவாக்குக"
                          : isHindi
                            ? "ऑफर बनाएं"
                            : "Create Offer"}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="message-bubble ai-bubble ai-thinking-bubble">
              <div className="bubble-sender">
                <span className="sender-tag ai-tag">
                  <Bot size={14} className="spin-slow" /> DukaanPulse Sarvam AI
                </span>
                <span className="bubble-time">
                  {isTamil ? "ஆராய்கிறது..." : isHindi ? "सोच रहा है..." : "Analyzing..."}
                </span>
              </div>
              <div className="thinking-row">
                <span className="thinking-pulse"></span>
                <p className="thinking-label">
                  {isTamil
                    ? "சர்வம் AI (sarvam-105b) உங்கள் கடை நேரடித் தரவுகளைப் பரிசீலித்து பதில் தயாரிக்கிறது..."
                    : isHindi
                      ? "सर्वम AI (sarvam-105b) आपकी दुकान के लाइव डेटा का विश्लेषण कर रहा है..."
                      : "Sarvam AI (sarvam-105b) is analyzing your live store metrics & weather..."}
                </p>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar with Microphone & Text */}
        <div className="chat-input-bar">
          <button
            type="button"
            className={`mic-button ${isListening ? "mic-recording" : ""}`}
            onClick={toggleListening}
            title={
              isListening
                ? isTamil
                  ? "கேட்கிறது... பேசவும்"
                  : isHindi
                    ? "सुन रहे हैं... बोलें"
                    : "Listening... speak now"
                : isTamil
                  ? "குரல் மூலம் பேச மைக் அழுத்தவும்"
                  : isHindi
                    ? "बोलने के लिए माइक दबाएं"
                    : "Press mic to speak"
            }
          >
            {isListening ? (
              <span className="pulse-ring">
                <Mic size={22} className="mic-icon-active" />
              </span>
            ) : (
              <Mic size={20} />
            )}
          </button>

          <input
            type="text"
            className="chat-text-input"
            placeholder={
              isListening
                ? isTamil
                  ? "கேட்கிறது... தமிழில் பேசவும்..."
                  : isHindi
                    ? "सुन रहे हैं... हिंदी में बोलिए..."
                    : "Listening... speak now..."
                : isTamil
                  ? "கேள்வி கேளுங்கள் (எ.கா: நேற்றை விட எவ்வளவு கம்மியாச்சு?)..."
                  : isHindi
                    ? "AI से पूछें (उदा: कल से कितनी बिक्री कम हुई?)..."
                    : "Ask AI (e.g. How much did sales dip vs yesterday?)..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAskAI(inputText);
            }}
          />

          <button
            type="button"
            className="send-button"
            onClick={() => handleAskAI(inputText)}
            disabled={!inputText.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
