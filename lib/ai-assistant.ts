import { Bill, Product, DEFAULT_PRODUCTS } from "./billing";
import { Context } from "./domain";
import {
  LiveWeatherData,
  WEATHER_PRESETS,
  getWeatherAndTimeAdvice,
} from "./weather";

export type DayReportSummary = {
  date: string;
  revenue: number;
  billsCount: number;
  topItem: string;
};

export type TimeWindowDip = {
  windowLabel: string; // e.g. "11:00 - 15:00 (மதிய மந்தமான வேளை)"
  windowLabelEn: string;
  windowLabelTa: string;
  windowLabelHi: string;
  startHour: number;
  endHour: number;
  todayCount: number;
  todayRevenue: number;
  historicalMedianCount: number;
  dipPercent: number; // e.g. 50%
  isFlagged: boolean; // dipPercent >= 25% AND isOpen AND hasCoverage
  isOpen: boolean;
  hasCoverage: boolean;
  state: "eligible" | "closed" | "unknown";
  statusTa: string;
  statusHi: string;
  statusEn: string;
  recommendationTa: string;
  recommendationHi: string;
  recommendationEn: string;
};

export type SarvamDecision = {
  id: string;
  category: "dead_hour" | "weather" | "inventory" | "pricing" | "combo";
  priority: "high" | "medium" | "opportunity";
  icon: string;
  titleEn: string;
  titleTa: string;
  titleHi: string;
  badgeEn: string;
  badgeTa: string;
  badgeHi: string;
  contextEn: string;
  contextTa: string;
  contextHi: string;
  recommendationEn: string;
  recommendationTa: string;
  recommendationHi: string;
  projectedImpactEn: string;
  projectedImpactTa: string;
  projectedImpactHi: string;
  actionLabelEn: string;
  actionLabelTa: string;
  actionLabelHi: string;
  voiceTextEn: string;
  voiceTextTa: string;
  voiceTextHi: string;
};

export type StoreAIAnalysis = {
  todayDate: string;
  yesterdayDate: string;
  todayRevenue: number;
  todayBillsCount: number;
  todayUnitsSold: number;
  yesterdayRevenue: number;
  yesterdayBillsCount: number;
  dayOverDayDeltaRevenue: number; // today - yesterday
  dayOverDayDipPercent: number; // e.g. -35%
  isDayDip: boolean;

  // Products
  topProduct: { name: string; nameTa: string; nameHi?: string; units: number; revenue: number } | null;
  lowestProduct: { name: string; nameTa: string; nameHi?: string; units: number; revenue: number } | null;
  productSalesList: { name: string; nameTa: string; nameHi?: string; units: number; revenue: number }[];

  // Time window dips (DukaanPulse signature feature)
  timeWindows: TimeWindowDip[];
  flaggedDipWindows: TimeWindowDip[];

  // 6 Sales Reports Breakdown (Multi-day performance)
  sixDayReports: DayReportSummary[];
  total6DayRevenue: number;
  avg6DayDailyRevenue: number;

  // Live Weather & Climate Integration
  activeWeather: LiveWeatherData;
  weatherAdvice: ReturnType<typeof getWeatherAndTimeAdvice>;
  weatherReportTa: string;
  weatherReportHi: string;
  weatherReportEn: string;
  sixDaySummaryTa: string;
  sixDaySummaryHi: string;
  sixDaySummaryEn: string;

  // Sarvam AI Decision Engine
  decisions: SarvamDecision[];

  // Spoken briefings (Multilingual: ta-IN, hi-IN, en-IN)
  fullReportTa: string;
  fullReportHi: string;
  fullReportEn: string;
  dipSummaryTa: string;
  productSummaryTa: string;
  offerAdviceTa: string;
};

export const STANDARD_WINDOWS = [
  {
    label: "07:00 - 11:00 (காலை வேளை)",
    labelEn: "07:00 - 11:00 (Morning Rush)",
    labelTa: "07:00 - 11:00 (காலை வேளை)",
    labelHi: "07:00 - 11:00 (सुबह की भीड़)",
    start: 7,
    end: 11,
  },
  {
    label: "11:00 - 15:00 (மதிய மந்தமான வேளை)",
    labelEn: "11:00 - 15:00 (Afternoon Slump)",
    labelTa: "11:00 - 15:00 (மதிய மந்தமான வேளை)",
    labelHi: "11:00 - 15:00 (दोपहर की सुस्ती)",
    start: 11,
    end: 15,
  },
  {
    label: "15:00 - 19:00 (மாலை பீக் வேளை)",
    labelEn: "15:00 - 19:00 (Evening Peak)",
    labelTa: "15:00 - 19:00 (மாலை பீக் வேளை)",
    labelHi: "15:00 - 19:00 (शाम का पीक समय)",
    start: 15,
    end: 19,
  },
  {
    label: "19:00 - 22:00 (இரவு வேளை)",
    labelEn: "19:00 - 22:00 (Night Closing)",
    labelTa: "19:00 - 22:00 (இரவு வேளை)",
    labelHi: "19:00 - 22:00 (रात का समय)",
    start: 19,
    end: 22,
  },
];

/**
 * Calculates complete AI analysis for the store:
 * 1. Day sales and dip vs previous days
 * 2. Time-window dip (DukaanPulse sound-to-time dip detection)
 * 3. Item-wise sales and ranking
 */
export function analyzeStoreBills(
  bills: Bill[],
  todayDate = "2026-11-15",
  products: Product[] = DEFAULT_PRODUCTS,
  weather?: LiveWeatherData,
  currentHour?: number,
  context?: Context,
): StoreAIAnalysis {
  const dates = [...new Set(bills.map((b) => b.date))].sort().reverse();
  const actualToday = dates.includes(todayDate) ? todayDate : dates[0] || "2026-11-15";
  const yesterdayIndex = dates.indexOf(actualToday) + 1;
  const yesterdayDate = dates[yesterdayIndex] || "2026-11-14";

  const todayBills = bills.filter((b) => b.date === actualToday);
  const yesterdayBills = bills.filter((b) => b.date === yesterdayDate);
  const historicalDays = dates.filter((d) => d !== actualToday);

  // Today metrics
  const todayRevenue = todayBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const todayBillsCount = todayBills.length;
  const todayUnitsSold = todayBills.reduce((acc, b) => acc + b.totalItems, 0);

  // Yesterday metrics
  const yesterdayRevenue = yesterdayBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const yesterdayBillsCount = yesterdayBills.length;

  // Day-over-day dip
  const deltaRevenue = todayRevenue - yesterdayRevenue;
  const isDayDip = deltaRevenue < 0;
  const dayOverDayDipPercent =
    yesterdayRevenue > 0
      ? Math.round(Math.abs(deltaRevenue / yesterdayRevenue) * 100)
      : 0;

  // Product sales breakdown
  const prodMap = new Map<string, { units: number; revenue: number }>();
  todayBills.forEach((b) => {
    b.items.forEach((it) => {
      const cur = prodMap.get(it.productId) || { units: 0, revenue: 0 };
      prodMap.set(it.productId, {
        units: cur.units + it.quantity,
        revenue: cur.revenue + it.itemTotal,
      });
    });
  });

  const productSalesList = products
    .map((p) => {
      const s = prodMap.get(p.id) || { units: 0, revenue: 0 };
      return {
        name: p.name,
        nameTa: p.nameTa,
        nameHi: p.nameHi || p.name,
        units: s.units,
        revenue: s.revenue,
      };
    })
    .filter((p) => p.units > 0)
    .sort((a, b) => b.units - a.units);

  const topProduct = productSalesList.length > 0 ? productSalesList[0] : null;
  const lowestProduct =
    productSalesList.length > 0 ? productSalesList[productSalesList.length - 1] : null;

  // Opening hours and coverage validation from context
  const ex = context?.exceptions?.[actualToday];
  const isShopClosedDay = ex?.closed === true;
  const shopOpenMin = ex ? ex.open : (context?.open ?? 420); // default 07:00 (420 min)
  const shopCloseMin = ex ? ex.close : (context?.close ?? 1320); // default 22:00 (1320 min)
  const cov = context?.coverage?.[actualToday];

  // Time Window Dips (DukaanPulse Signature Feature with strict Store Hours & Coverage verification)
  const timeWindows: TimeWindowDip[] = STANDARD_WINDOWS.map((win) => {
    const winStartMin = win.start * 60;
    const winEndMin = win.end * 60;

    let isOpen = true;
    let hasCoverage = true;
    let state: "eligible" | "closed" | "unknown" = "eligible";

    if (isShopClosedDay || shopCloseMin <= winStartMin || shopOpenMin >= winEndMin) {
      isOpen = false;
      state = "closed";
    } else if (cov && (cov.state !== "confirmed" || cov.start > winStartMin || cov.end < winEndMin)) {
      hasCoverage = false;
      state = "unknown";
    }

    const todayWindowBills = todayBills.filter(
      (b) => b.hour >= win.start && b.hour < win.end,
    );
    const todayCount = todayWindowBills.length;
    const todayWindowRevenue = todayWindowBills.reduce(
      (acc, b) => acc + b.totalAmount,
      0,
    );

    // Compute historical median count for this specific window across past days
    const pastCounts = historicalDays.map((d) => {
      return bills.filter(
        (b) => b.date === d && b.hour >= win.start && b.hour < win.end,
      ).length;
    });

    pastCounts.sort((a, b) => a - b);
    const mid = Math.floor(pastCounts.length / 2);
    const historicalMedianCount =
      pastCounts.length === 0
        ? 0
        : pastCounts.length % 2 === 0
          ? Math.round((pastCounts[mid - 1] + pastCounts[mid]) / 2)
          : pastCounts[mid];

    const diff = historicalMedianCount - todayCount;
    const dipPercent =
      historicalMedianCount > 0 && diff > 0
        ? Math.round((diff / historicalMedianCount) * 100)
        : 0;

    // Strict guard: ONLY flag a dip if the store is OPEN and payment coverage is CONFIRMED!
    const isFlagged = isOpen && hasCoverage && dipPercent >= 25 && todayCount < historicalMedianCount;

    let statusTa = "விற்பனை சீராக உள்ளது";
    let statusHi = "बिक्री स्थिर और सामान्य है";
    let statusEn = "Sales are steady and normal";
    let recommendationTa = "வழக்கமான விற்பனையைத் தொடரவும்.";
    let recommendationHi = "सामान्य बिक्री जारी रखें।";
    let recommendationEn = "Maintain normal store operations.";

    if (state === "closed") {
      statusTa = "கடை திறக்கப்படாத நேரம் (Shop Closed)";
      statusHi = "दुकान बंद रहने का समय (Shop Closed)";
      statusEn = "Store closed during this window";
      recommendationTa = "இந்த நேரத்தில் கடை திறக்கப்படவில்லை. அமைதியான நேரச் சலுகை பரிந்துரை பாதுகாப்பாக திரும்பப் பெறப்பட்டது.";
      recommendationHi = "दुकान इस समय बंद रहती है। शांत-समय का ऑफ़र परामर्श सुरक्षित रूप से वापस लिया गया।";
      recommendationEn = "Store is closed during this window. Quiet-hour offer advice safely withdrawn.";
    } else if (state === "unknown") {
      statusTa = "விற்பனைத் தரவு உறுதிப்படுத்தப்படவில்லை (Coverage Unconfirmed)";
      statusHi = "बिक्री डेटा अपुष्ट है (Coverage Unconfirmed)";
      statusEn = "Payment coverage unconfirmed";
      recommendationTa = "பில்லிங் தரவுக் கவரேஜ் உறுதிப்படுத்தப்படாததால், தவறான தள்ளுபடி சலுகைகளைத் தவிர்க்க பரிந்துரை நிறுத்திவைக்கப்பட்டுள்ளது.";
      recommendationHi = "बिलिंग डेटा कवरेज अपुष्ट होने के कारण ग़लत छूट से बचने हेतु ऑफ़र परामर्श रोक दिया गया है।";
      recommendationEn = "Payment coverage unconfirmed for this window. Offer advice safely withheld to prevent unsafe discounts.";
    } else if (isFlagged) {
      statusTa = `⚠️ ${dipPercent}% விற்பனை சரிவு! (முந்தைய சராசரி ${historicalMedianCount} பில்கள், இன்று ${todayCount} மட்டுமே)`;
      statusHi = `⚠️ ${dipPercent}% बिक्री गिरावट! (पिछला औसत ${historicalMedianCount} बिल, आज केवल ${todayCount})`;
      statusEn = `⚠️ ${dipPercent}% Sales Slump! (Past median ${historicalMedianCount} bills, today only ${todayCount})`;
      recommendationTa = `இந்த ${win.labelTa} நேரத்தில் 'டீ + சமோசா ₹25 காம்போ' அல்லது ₹5 சிறப்பு சலுகை மூலம் சரிவை ஈடுசெய்யலாம்!`;
      recommendationHi = `इस ${win.labelHi} में 'चाय + समोसा ₹25 कॉम्बो' चलाकर मंदी को दूर करें!`;
      recommendationEn = `Launch a ₹25 Chai + Samosa combo during ${win.labelEn} to recover sales!`;
    } else if (todayCount > historicalMedianCount && todayCount > 0) {
      statusTa = `🔥 அதிக விற்பனை! முந்தைய சராசரியை விட அதிகம்.`;
      statusHi = `🔥 उच्च बिक्री! पिछले औसत से अधिक बिल।`;
      statusEn = `🔥 High Sales Velocity! Beating past average.`;
      recommendationTa = `முக்கிய பொருட்களின் இருப்பு குறையாமல் பார்த்துக் கொள்ளவும்.`;
      recommendationHi = `आवश्यक उत्पादों का पर्याप्त स्टॉक बनाए रखें।`;
      recommendationEn = `Ensure critical items remain well-stocked.`;
    }

    return {
      windowLabel: win.label,
      windowLabelEn: win.labelEn,
      windowLabelTa: win.labelTa,
      windowLabelHi: win.labelHi,
      startHour: win.start,
      endHour: win.end,
      todayCount,
      todayRevenue: todayWindowRevenue,
      historicalMedianCount,
      dipPercent,
      isFlagged,
      isOpen,
      hasCoverage,
      state,
      statusTa,
      statusHi,
      statusEn,
      recommendationTa,
      recommendationHi,
      recommendationEn,
    };
  });

  const flaggedDipWindows = timeWindows.filter((w) => w.isFlagged);

  // Spoken Tamil briefing texts
  const dipPhrase = isDayDip
    ? `நேற்றைய விற்பனையை விட இன்று ரூபாய் ${Math.abs(deltaRevenue)} (${dayOverDayDipPercent}%) குறைவாக உள்ளது.`
    : `நேற்றைய விற்பனையை விட இன்று ரூபாய் ${deltaRevenue} அதிகமாக விற்பனையாகியுள்ளது!`;

  const windowDipPhrase =
    flaggedDipWindows.length > 0
      ? `குறிப்பாக ${flaggedDipWindows.map((w) => w.windowLabel).join(", ")} நேரத்தில் விற்பனை கணிசமாக சரிந்துள்ளது.`
      : `அனைத்து நேரங்களிலும் விற்பனை சுமாராக நடந்துள்ளது.`;

  const topProdPhrase = topProduct
    ? `இன்று அதிகம் விற்ற பொருள் ${topProduct.nameTa}, மொத்தம் ${topProduct.units} விற்று ரூபாய் ${topProduct.revenue} வசூலானது.`
    : `விற்பனை விவரம் பதிவு செய்யப்படுகிறது.`;

  const fullReportTa = `வணக்கம்! உங்கள் கடையின் AI ஆய்வு அறிக்கை: இன்று ${actualToday} அன்று மொத்தம் ${todayRevenue} ரூபாய் வசூலாகியுள்ளது, ${todayBillsCount} பில்கள் போடப்பட்டுள்ளன. ${dipPhrase} ${topProdPhrase} ${windowDipPhrase}`;

  const dipSummaryTa = isDayDip
    ? `விற்பனை சரிவு ஆய்வு: இன்று நேற்றை விட ரூபாய் ${Math.abs(deltaRevenue)} குறைவு (${dayOverDayDipPercent}% சரிவு). ${windowDipPhrase}`
    : `இன்று சரிவு எதுவும் இல்லை! நேற்றை விட ரூபாய் ${deltaRevenue} கூடுதலாக விற்பனை ஆகியுள்ளது.`;

  const productSummaryTa = topProduct
    ? `பொருட்கள் விற்பனை நிலவரம்: முதலிடத்தில் ${topProduct.nameTa} (${topProduct.units} எண்ணிக்கை, ₹${topProduct.revenue}). ${lowestProduct && lowestProduct.name !== topProduct.name ? `குறைந்த விற்பனையில் ${lowestProduct.nameTa} (${lowestProduct.units} எண்ணிக்கை).` : ""}`
    : `பொருட்கள் விற்பனை விவரம் பதிவு செய்யப்படுகிறது.`;

  let offerAdviceTa = "";
  if (isShopClosedDay) {
    offerAdviceTa = "இன்று கடை முழுமையாக விடுமுறை / மூடப்பட்டுள்ளது. அமைதியான நேரச் சலுகை திரும்பப் பெறப்பட்டுள்ளது.";
  } else if (flaggedDipWindows.length > 0) {
    offerAdviceTa = `DukaanPulse AI பரிந்துரை: திறந்திருக்கும் நேரத்தில் சரிவு கண்டறியப்பட்ட ${flaggedDipWindows[0].windowLabel} வேளையில் 'டீ + சமோசா ₹25 காம்போ' அறிவித்து ₹150 முதல் ₹300 வரை கூடுதல் வருவாய் ஈட்டலாம். முடிவை நீங்களே அங்கீகரித்து சுவரொட்டி தயார் செய்யலாம்.`;
  } else if (timeWindows.some((w) => w.state !== "eligible")) {
    offerAdviceTa = "திறக்கப்படாத அல்லது தரவுக் கவரேஜ் உறுதிப்படுத்தப்படாத நேரங்களைத் தவிர்த்து, வணிகம் நடைபெற்ற மற்ற நேரங்களில் விற்பனை சீராக உள்ளது. அமைதியான நேரச் சலுகை திரும்பப் பெறப்பட்டுள்ளது.";
  } else {
    offerAdviceTa = "தற்போதைய விற்பனை போக்கு சீராக உள்ளது. புதிய காம்போ சலுகைகள் மூலம் வாடிக்கையாளர் வருகையை மேலும் 15% வரை உயர்த்தலாம்.";
  }

  // 6 Sales Reports Breakdown (Multi-day performance)
  const sixDates = dates.slice(0, 6);
  const sixDayReports: DayReportSummary[] = sixDates.map((d) => {
    const dBills = bills.filter((b) => b.date === d);
    const dRev = dBills.reduce((acc, b) => acc + b.totalAmount, 0);
    const dCount = dBills.length;
    const dProdCounts: Record<string, number> = {};
    dBills.forEach((b) => {
      b.items.forEach((it) => {
        dProdCounts[it.name] = (dProdCounts[it.name] || 0) + it.quantity;
      });
    });
    const topEntry = Object.entries(dProdCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      date: d,
      revenue: dRev,
      billsCount: dCount,
      topItem: topEntry ? topEntry[0] : "Masala Tea",
    };
  });
  const total6DayRevenue = sixDayReports.reduce((acc, r) => acc + r.revenue, 0);
  const avg6DayDailyRevenue = Math.round(
    total6DayRevenue / (sixDayReports.length || 1),
  );
  const bestDay = [...sixDayReports].sort((a, b) => b.revenue - a.revenue)[0];
  const sixDaySummaryTa = `கடந்த 6 நாட்களின் விற்பனை அறிக்கை: மொத்தம் ₹${total6DayRevenue} வசூல், தினசரி சராசரி ₹${avg6DayDailyRevenue}. அதிகபட்ச விற்பனை நாள் ${bestDay?.date || actualToday} (₹${bestDay?.revenue || todayRevenue}). இன்று ₹${todayRevenue} வசூலாகியுள்ளது.`;
  const sixDaySummaryHi = `पिछले 6 दिनों की बिक्री रिपोर्ट: कुल राजस्व ₹${total6DayRevenue}, दैनिक औसत ₹${avg6DayDailyRevenue}। सर्वाधिक बिक्री वाला दिन ${bestDay?.date || actualToday} (₹${bestDay?.revenue || todayRevenue}) रहा। आज ₹${todayRevenue} दर्ज हुआ।`;
  const sixDaySummaryEn = `6-Day Sales Report: Total revenue ₹${total6DayRevenue}, daily average ₹${avg6DayDailyRevenue}. Peak revenue day was ${bestDay?.date || actualToday} (₹${bestDay?.revenue || todayRevenue}). Today recorded ₹${todayRevenue}.`;

  // Live Weather & Climate Integration
  const activeWeather = weather || WEATHER_PRESETS.cloudy;
  const activeHour = currentHour ?? new Date().getHours();
  const weatherAdvice = getWeatherAndTimeAdvice(activeWeather, activeHour, true);
  const weatherReportTa = `தற்போதைய வானிலை: ${activeWeather.emoji} ${activeWeather.conditionLabelTa} (${activeWeather.tempC}°C, ஈரப்பதம் ${activeWeather.humidity}%). ${weatherAdvice.adviceText} பரிந்துரைக்கப்படும் பொருட்கள்: ${weatherAdvice.recommendedItems.join(", ")}.`;
  const weatherReportHi = `वर्तमान मौसम: ${activeWeather.emoji} ${activeWeather.conditionLabelEn} (${activeWeather.tempC}°C, नमी ${activeWeather.humidity}%)। ${weatherAdvice.adviceText} अनुशंसित वस्तुएं: ${weatherAdvice.recommendedItems.join(", ")}।`;
  const weatherReportEn = `Current Weather: ${activeWeather.emoji} ${activeWeather.conditionLabelEn} (${activeWeather.tempC}°C, humidity ${activeWeather.humidity}%). ${weatherAdvice.adviceText} Recommended items: ${weatherAdvice.recommendedItems.join(", ")}.`;

  const fullReportHi = `नमस्ते! आपकी दुकान की AI रिपोर्ट: आज ${actualToday} को कुल ₹${todayRevenue} की बिक्री हुई है, ${todayBillsCount} बिल बने हैं। ${isDayDip ? `कल की तुलना में ₹${Math.abs(deltaRevenue)} (${dayOverDayDipPercent}%) की मंदी रही।` : `कल की तुलना में ₹${deltaRevenue} अधिक बिक्री हुई है!`} सबसे अधिक बिकने वाला उत्पाद ${topProduct ? topProduct.name : "मसाला चाय"} (${topProduct?.units || 0} पीस) रहा।`;
  const fullReportEn = `Store AI Summary: Today (${actualToday}) recorded ₹${todayRevenue} across ${todayBillsCount} completed bills. ${isDayDip ? `Down by ₹${Math.abs(deltaRevenue)} (${dayOverDayDipPercent}%) vs yesterday.` : `Grew by ₹${deltaRevenue} vs yesterday.`} Best seller was ${topProduct ? topProduct.name : "N/A"} (${topProduct?.units || 0} units sold).`;

  // Sarvam AI Decision Engine
  const decisions: SarvamDecision[] = [];

  // Decision 1: Dead Hour / Time Window Combo
  if (flaggedDipWindows.length > 0) {
    const primarySlump = flaggedDipWindows[0];
    decisions.push({
      id: "dec-dead-hour-combo",
      category: "dead_hour",
      priority: "high",
      icon: "⚡",
      titleEn: `Launch ${primarySlump.windowLabel} Chai + Samosa Combo`,
      titleTa: `மந்தமான ${primarySlump.windowLabel} நேரத்தில் டீ + சமோசா காம்போ`,
      titleHi: `मंदी के समय ${primarySlump.windowLabel} चाय + समोसा कॉम्बो`,
      badgeEn: `Slump Alert: ${primarySlump.dipPercent}% Drop`,
      badgeTa: `சரிவு எச்சரிக்கை: ${primarySlump.dipPercent}% குறைவு`,
      badgeHi: `मंदी चेतावनी: ${primarySlump.dipPercent}% गिरावट`,
      contextEn: `Historical median was ${primarySlump.historicalMedianCount} bills, but today only ${primarySlump.todayCount} bills recorded during this window.`,
      contextTa: `வழக்கமான சராசரி ${primarySlump.historicalMedianCount} பில்கள், ஆனால் இன்று இந்த நேரத்தில் ${primarySlump.todayCount} மட்டுமே பதிவாகியுள்ளது.`,
      contextHi: `सामान्य औसत ${primarySlump.historicalMedianCount} बिल था, लेकिन आज इस समय केवल ${primarySlump.todayCount} बिल ही दर्ज हुए।`,
      recommendationEn: `Offer Masala Chai + Hot Samosa for ₹25 (regular ₹27). Display counter standee and broadcast Paytm Soundbox voice alert to passersby.`,
      recommendationTa: `மசாலா டீ + சமோசாவை ₹25 காம்போவாக வழங்கி, கவுண்டர் சுவரொட்டி மற்றும் Paytm சவுண்ட்பாக்ஸ் குரல் மூலம் வாடிக்கையாளர்களை ஈர்க்கவும்.`,
      recommendationHi: `मसाला चाय + समोसा ₹25 में कॉम्बो के रूप में पेश करें और ग्राहकों को आकर्षित करने के लिए Paytm साउंडबॉक्स से उद्घोषणा करें।`,
      projectedImpactEn: "+₹1,200 to ₹1,500 Daily Revenue",
      projectedImpactTa: "+₹1,200 முதல் ₹1,500 வரை தினசரி கூடுதல் வருவாய்",
      projectedImpactHi: "+₹1,200 से ₹1,500 तक अतिरिक्त दैनिक कमाई",
      actionLabelEn: "Activate 4-6 PM Combo",
      actionLabelTa: "காம்போ சலுகையைத் தொடங்குக",
      actionLabelHi: "कॉम्बो ऑफर सक्रिय करें",
      voiceTextEn: `Sarvam AI Decision: Sales dipped by ${primarySlump.dipPercent}% during ${primarySlump.windowLabel}. Launching the ₹25 Chai and Samosa combo can recover ₹1,200 today.`,
      voiceTextTa: `சர்வம் AI முடிவு: ${primarySlump.windowLabel} நேரத்தில் விற்பனை ${primarySlump.dipPercent}% சரிந்துள்ளது. டீ மற்றும் சமோசா ₹25 காம்போ மூலம் ₹1,200 கூடுதல் வருவாய் ஈட்டலாம்.`,
      voiceTextHi: `सर्वम AI निर्णय: ${primarySlump.windowLabel} के दौरान बिक्री ${primarySlump.dipPercent}% कम रही। ₹25 चाय और समोसा कॉम्बो से ₹1,200 की अतिरिक्त कमाई संभव है।`,
    });
  } else {
    decisions.push({
      id: "dec-steady-combo",
      category: "combo",
      priority: "medium",
      icon: isShopClosedDay ? "🏪" : "🎉",
      titleEn: isShopClosedDay ? "Store Closed - Quiet-Hour Advice Withheld" : "Teatime Popular Combo (Coffee + Medu Vada @ ₹22)",
      titleTa: isShopClosedDay ? "கடை விடுமுறை - சலுகை பரிந்துரை திரும்பப் பெறப்பட்டது" : "பிரபலமான மாலை காம்போ (காபி + மெது வடை ₹22)",
      titleHi: isShopClosedDay ? "दुकान अवकाश - शांत-घंटे का ऑफ़र परामर्श वापस लिया गया" : "लोकप्रिय टी-टाइम कॉम्बो (कॉफ़ी + मेदु वड़ा ₹22)",
      badgeEn: isShopClosedDay ? "Store Closed" : "Customer Favorite",
      badgeTa: isShopClosedDay ? "கடை விடுமுறை" : "வாடிக்கையாளர் விருப்பம்",
      badgeHi: isShopClosedDay ? "दुकान अवकाश" : "ग्राहकों की पहली पसंद",
      contextEn: isShopClosedDay
        ? "Shop is marked closed. Quiet-hour slump discounts are safely withheld."
        : "Consistent order velocity detected across operating hours; closed or unconfirmed windows safely excluded.",
      contextTa: isShopClosedDay
        ? "கடை மூடப்பட்டதாகப் பதிவு செய்யப்பட்டுள்ளது. அமைதியான நேரச் சரிவுத் தள்ளுபடிகள் பாதுகாப்பாக திரும்பப் பெறப்பட்டுள்ளன."
        : "கடை திறந்திருக்கும் நேரங்களில் சீரான வாடிக்கையாளர் வருகை உள்ளது; மூடப்பட்ட/உறுதிப்படுத்தப்படாத நேரங்கள் விலக்கப்பட்டுள்ளன.",
      contextHi: isShopClosedDay
        ? "दुकान बंद दर्ज है। शांत समय की मंदी वाली छूट सुरक्षित रूप से रोक दी गई है।"
        : "कामकाजी घंटों में ग्राहकों की आवाजाही सामान्य है; बंद व अपुष्ट घंटे सुरक्षित रूप से हटा दिए गए हैं।",
      recommendationEn: "Promote Filter Coffee with freshly fried Medu Vada to increase average bill size from ₹35 to ₹50.",
      recommendationTa: "ஃபில்டர் காபியுடன் மெது வடையை இணைத்து வழங்கி, சராசரி பில் மதிப்பை ₹35-லிருந்து ₹50-ஆக உயர்த்தலாம்.",
      recommendationHi: "फ़िल्टर कॉफ़ी के साथ गरमा-गरम मेदु वड़ा पेश करें ताकि औसत बिल ₹35 से बढ़कर ₹50 हो सके।",
      projectedImpactEn: "+₹800 Daily Upsell",
      projectedImpactTa: "+₹800 கூடுதல் விற்பனை",
      projectedImpactHi: "+₹800 अतिरिक्त दैनिक बिक्री",
      actionLabelEn: "Promote Coffee Combo",
      actionLabelTa: "காபி காம்போவை விளம்பரப்படுத்து",
      actionLabelHi: "कॉफ़ी कॉम्बो प्रचारित करें",
      voiceTextEn: "Sarvam AI recommends bundling Filter Coffee and Medu Vada for ₹22 to increase average order value.",
      voiceTextTa: "சர்வம் AI பரிந்துரை: சராசரி பில் மதிப்பை உயர்த்த ஃபில்டர் காபி மற்றும் மெது வடையை ₹22-க்கு காம்போவாக வழங்கவும்.",
      voiceTextHi: "सर्वम AI अनुशंसा: औसत बिल मूल्य बढ़ाने के लिए फ़िल्टर कॉफ़ी और मेदु वड़ा ₹22 में कॉम्बो बनाएं।",
    });
  }

  // Decision 2: Weather & Climate Strategy
  decisions.push({
    id: "dec-weather-strategy",
    category: "weather",
    priority: activeWeather.condition === "rain" || activeWeather.tempC > 32 ? "high" : "medium",
    icon: activeWeather.emoji,
    titleEn: `Weather Decision: ${activeWeather.conditionLabelEn} Demand Prep`,
    titleTa: `வானிலை முடிவு: ${activeWeather.conditionLabelTa} சிறப்பு இருப்பு ஏற்பாடு`,
    titleHi: `मौसम निर्णय: ${activeWeather.conditionLabelEn} विशेष तैयारी`,
    badgeEn: `Live Weather: ${activeWeather.tempC}°C`,
    badgeTa: `நேரடி வானிலை: ${activeWeather.tempC}°C`,
    badgeHi: `लाइव मौसम: ${activeWeather.tempC}°C`,
    contextEn: `Live conditions show ${activeWeather.conditionLabelEn} with ${activeWeather.humidity}% humidity.`,
    contextTa: `தற்போதைய வானிலை: ${activeWeather.conditionLabelTa}, ஈரப்பதம் ${activeWeather.humidity}%.`,
    contextHi: `वर्तमान स्थिति: ${activeWeather.conditionLabelEn}, नमी ${activeWeather.humidity}%।`,
    recommendationEn: `${weatherAdvice.adviceText} Stock up and prioritize: ${weatherAdvice.recommendedItems.join(", ")}.`,
    recommendationTa: `${weatherAdvice.adviceText} முக்கியமாக தயார் செய்து வைக்க வேண்டியவை: ${weatherAdvice.recommendedItems.join(", ")}.`,
    recommendationHi: `${weatherAdvice.adviceText} अनुशंसित वस्तुएं: ${weatherAdvice.recommendedItems.join(", ")}।`,
    projectedImpactEn: "+25% Demand Surge Captured",
    projectedImpactTa: "+25% கூடுதல் விற்பனை & வீணாவதைத் தடுத்தல்",
    projectedImpactHi: "+25% अतिरिक्त बिक्री और बर्बादी शून्य",
    actionLabelEn: "Adjust Kitchen Prep",
    actionLabelTa: "தயாரிப்பு அளவை மாற்று",
    actionLabelHi: "रसोई तैयारी अपडेट करें",
    voiceTextEn: `Weather alert: ${weatherAdvice.adviceText} Ensure high inventory of ${weatherAdvice.recommendedItems.join(" and ")}.`,
    voiceTextTa: `வானிலை ஆலோசனை: ${weatherAdvice.adviceText} ${weatherAdvice.recommendedItems.join(", ")} இருப்பை தயார் செய்து கொள்ளவும்.`,
    voiceTextHi: `मौसम सलाह: ${weatherAdvice.adviceText} ${weatherAdvice.recommendedItems.join(" और ")} की पर्याप्त तैयारी रखें।`,
  });

  // Decision 3: Inventory Velocity
  decisions.push({
    id: "dec-inventory-prep",
    category: "inventory",
    priority: "medium",
    icon: "📦",
    titleEn: `Inventory Decision: Replenish ${topProduct?.name || "Masala Tea"}`,
    titleTa: `இருப்பு முடிவு: ${topProduct?.nameTa || "மசாலா டீ"} இருப்பு அதிகரிப்பு`,
    titleHi: `इन्वेंट्री निर्णय: ${topProduct?.name || "मसाला चाय"} का पुनः स्टॉक`,
    badgeEn: "Stock Optimization",
    badgeTa: "இருப்பு மேலாண்மை",
    badgeHi: "स्टॉक प्रबंधन",
    contextEn: `${topProduct?.name || "Masala Tea"} is running at highest sales velocity (${topProduct?.units || 0} units sold).`,
    contextTa: `${topProduct?.nameTa || "மசாலா டீ"} அதிவேகமாக விற்றுத் தீர்ந்து வருகிறது (மொத்தம் ${topProduct?.units || 0} எண்ணிக்கை).`,
    contextHi: `${topProduct?.name || "मसाला चाय"} सबसे तेज़ी से बिक रही है (कुल ${topProduct?.units || 0} पीस)।`,
    recommendationEn: "Replenish tea powder, milk, and ginger before evening peak. Pair slower items like Badam Milk with teatime snacks.",
    recommendationTa: "மாலை நேரத்திற்கு முன்பாக பால், டீ தூள் இருப்பை உறுதி செய்யவும். குறைவாக விற்கும் பாதாம் பாலை சிறப்பு சலுகையில் விற்கலாம்.",
    recommendationHi: "शाम की भीड़ से पहले दूध और चाय पत्ती का स्टॉक सुनिश्चित करें। बादाम दूध जैसी धीमी वस्तुओं को चाय के साथ बंडल करें।",
    projectedImpactEn: "Prevents Stockout Loss (₹800+)",
    projectedImpactTa: "பொருட்கள் தீர்ந்துவிடும் இழப்பைத் தடுத்தல் (₹800+)",
    projectedImpactHi: "स्टॉक समाप्त होने से होने वाले नुकसान से बचाव (₹800+)",
    actionLabelEn: "Restock Key Items",
    actionLabelTa: "முக்கிய பொருட்களை சேர்க்க",
    actionLabelHi: "मुख्य वस्तुएं पुनः स्टॉक करें",
    voiceTextEn: `Inventory optimization: Restock milk and tea powder immediately to prevent stockouts during peak evening traffic.`,
    voiceTextTa: `இருப்பு மேலாண்மை: மாலை பீக் நேரத்திற்கு முன்பாக பால் மற்றும் டீ தூள் இருப்பை உறுதி செய்து கொள்ளவும்.`,
    voiceTextHi: `इन्वेंट्री प्रबंधन: शाम की भीड़ से पहले दूध और चाय सामग्री का स्टॉक सुनिश्चित करें।`,
  });

  // Decision 4: Fast-Track Paytm QR
  decisions.push({
    id: "dec-paytm-rush",
    category: "pricing",
    priority: "opportunity",
    icon: "📲",
    titleEn: "Fast-Track Paytm QR Counter for Morning Rush",
    titleTa: "காலை நெரிசலுக்கு Paytm QR விரைவு கவுண்டர்",
    titleHi: "सुबह की भीड़ के लिए Paytm QR एक्सप्रेस काउंटर",
    badgeEn: "Speed & Retention",
    badgeTa: "வேகம் & வாடிக்கையாளர் திருப்தி",
    badgeHi: "तेज़ सेवा और ग्राहक संतुष्टि",
    contextEn: "Morning peak (8:00 - 11:00) experiences maximum counter queues.",
    contextTa: "காலை 8:00 - 11:00 மணி நேரத்தில் கவுண்டரில் அதிக வாடிக்கையாளர் நெரிசல் ஏற்படுகிறது.",
    contextHi: "सुबह 8:00 - 11:00 बजे काउंटर पर सबसे अधिक कतार लगती है।",
    recommendationEn: "Pre-pack Filter Coffee and Medu Vada on a dedicated Paytm Soundbox UPI counter for instant 10-second scan-and-go payment.",
    recommendationTa: "காலை நேரத்தில் ஃபில்டர் காபி மற்றும் வடையை பார்சலாகத் தயார் செய்து, Paytm QR சவுண்ட்பாக்ஸ் கவுண்டரில் 10 நொடி பரிவர்த்தனையாக மாற்றவும்.",
    recommendationHi: "फ़िल्टर कॉफ़ी और मेदु वड़ा तैयार रखें और Paytm साउंडबॉक्स QR के माध्यम से 10 सेकंड में भुगतान पूरा करें।",
    projectedImpactEn: "+35% Faster Order Clearance",
    projectedImpactTa: "+35% கூடுதல் விற்பனை வேகம்",
    projectedImpactHi: "+35% अधिक तेज़ ऑर्डर निपटान",
    actionLabelEn: "Enable Soundbox Priority",
    actionLabelTa: "சவுண்ட்பாக்ஸ் முன்னுரிமை",
    actionLabelHi: "साउंडबॉक्स प्राथमिकता सक्षम करें",
    voiceTextEn: "Paytm Soundbox recommendation: Set up a dedicated express scan counter during morning rush to clear queues 35% faster.",
    voiceTextTa: "Paytm சவுண்ட்பாக்ஸ் யோசனை: காலை நெரிசல் நேரத்தில் விரைவு QR கவுண்டர் அமைத்து விற்பனை வேகத்தை 35% உயர்த்தலாம்.",
    voiceTextHi: "Paytm साउंडबॉक्स सुझाव: सुबह की भीड़ में तेज़ क्यूआर काउंटर से 35% तेजी से ऑर्डर निपटाएं।",
  });

  return {
    todayDate: actualToday,
    yesterdayDate,
    todayRevenue,
    todayBillsCount,
    todayUnitsSold,
    yesterdayRevenue,
    yesterdayBillsCount,
    dayOverDayDeltaRevenue: deltaRevenue,
    dayOverDayDipPercent,
    isDayDip,
    topProduct,
    lowestProduct,
    productSalesList,
    timeWindows,
    flaggedDipWindows,
    sixDayReports,
    total6DayRevenue,
    avg6DayDailyRevenue,
    activeWeather,
    weatherAdvice,
    weatherReportTa,
    weatherReportHi,
    weatherReportEn,
    sixDaySummaryTa,
    sixDaySummaryHi,
    sixDaySummaryEn,
    decisions,
    fullReportTa,
    fullReportHi,
    fullReportEn,
    dipSummaryTa,
    productSummaryTa,
    offerAdviceTa,
  };
}

/**
 * Intelligent Multilingual (Tamil, Hindi, English) conversational question answering based on store bills
 */
export function answerStoreAIQuestion(
  question: string,
  bills: Bill[],
  todayDate = "2026-11-15",
  products: Product[] = DEFAULT_PRODUCTS,
  weather?: LiveWeatherData,
  currentHour?: number,
  lang: "en-IN" | "hi-IN" | "ta-IN" = "ta-IN",
): {
  title: string;
  answerTa: string;
  answerHi: string;
  answerEn: string;
  topic: string;
  activeAnswer: string;
} {
  const analysis = analyzeStoreBills(bills, todayDate, products, weather, currentHour);
  const q = question.toLowerCase();

  // 1. Weather / Climate question ("வானிலை", "climate", "weather", "மழை", "rain", "வெயில்", "குளிர்", "मौसम")
  if (
    q.includes("வானிலை") ||
    q.includes("weather") ||
    q.includes("climate") ||
    q.includes("மழை") ||
    q.includes("rain") ||
    q.includes("வெயில்") ||
    q.includes("சூடு") ||
    q.includes("குளிர்") ||
    q.includes("मौसम") ||
    q.includes("बारिश") ||
    q.includes("धूप")
  ) {
    const title =
      lang === "ta-IN"
        ? "🌤️ நேரடி வானிலை & தேவை வழிகாட்டுதல்"
        : lang === "hi-IN"
        ? "🌤️ लाइव मौसम और मांग पूर्वानुमान"
        : "🌤️ Live Weather & Demand Forecast";
    const answerTa = analysis.weatherReportTa;
    const answerHi = analysis.weatherReportHi;
    const answerEn = analysis.weatherReportEn;
    return {
      title,
      answerTa,
      answerHi,
      answerEn,
      topic: "weather",
      activeAnswer: lang === "ta-IN" ? answerTa : lang === "hi-IN" ? answerHi : answerEn,
    };
  }

  // 2. 6 Sales Reports Breakdown question ("6 நாள்", "6 sale", "ஆறு நாள்", "six day", "வரலாறு", "trend", "6 दिन", "छह दिन")
  if (
    q.includes("6 நாள்") ||
    q.includes("6 sale") ||
    q.includes("ஆறு நாள்") ||
    q.includes("six") ||
    q.includes("வரலாறு") ||
    q.includes("trend") ||
    q.includes("history") ||
    q.includes("6 दिन") ||
    q.includes("छह दिन") ||
    q.includes("इतिहास")
  ) {
    const title =
      lang === "ta-IN"
        ? "📊 6 நாள் விற்பனை அறிக்கை & போக்கு"
        : lang === "hi-IN"
        ? "📊 6-दिवसीय बिक्री रिपोर्ट और रुझान"
        : "📊 6-Day Sales Trend & Performance Report";
    const answerTa = analysis.sixDaySummaryTa;
    const answerHi = analysis.sixDaySummaryHi;
    const answerEn = analysis.sixDaySummaryEn;
    return {
      title,
      answerTa,
      answerHi,
      answerEn,
      topic: "six_day_report",
      activeAnswer: lang === "ta-IN" ? answerTa : lang === "hi-IN" ? answerHi : answerEn,
    };
  }

  // 3. Decisions & Recommendations question ("முடிவு", "decision", "sarvam", "ஆலோசனை", "பரிந்துரை", "निर्णय", "सलाह")
  if (
    q.includes("முடிவு") ||
    q.includes("decision") ||
    q.includes("sarvam") ||
    q.includes("ஆலோசனை") ||
    q.includes("பரிந்துரை") ||
    q.includes("निर्णय") ||
    q.includes("सलाह") ||
    q.includes("सुझाव") ||
    q.includes("recommend")
  ) {
    const d = analysis.decisions[0];
    const title =
      lang === "ta-IN"
        ? "💡 சர்வம் AI வணிக முடிவெடுக்கும் பரிந்துரை"
        : lang === "hi-IN"
        ? "💡 सर्वम AI व्यावसायिक निर्णय और रणनीति"
        : "💡 Sarvam AI Store Strategic Decision";
    const answerTa = `சர்வம் AI வணிக முடிவு: ${d.titleTa}. ${d.recommendationTa} எதிர்பார்க்கப்படும் லாபம்: ${d.projectedImpactTa}.`;
    const answerHi = `सर्वम AI व्यावसायिक निर्णय: ${d.titleHi}। ${d.recommendationHi} अनुमानित लाभ: ${d.projectedImpactHi}।`;
    const answerEn = `Sarvam AI Decision: ${d.titleEn}. ${d.recommendationEn} Projected Impact: ${d.projectedImpactEn}.`;
    return {
      title,
      answerTa,
      answerHi,
      answerEn,
      topic: "decision",
      activeAnswer: lang === "ta-IN" ? answerTa : lang === "hi-IN" ? answerHi : answerEn,
    };
  }

  // 4. Smart Store Guide question ("வழிகாட்டி", "guide", "assist", "உதவி", "गाइड", "सहायक")
  if (
    q.includes("வழிகாட்டி") ||
    q.includes("guide") ||
    q.includes("assist") ||
    q.includes("உதவி") ||
    q.includes("गाइड") ||
    q.includes("सहायक")
  ) {
    const fullGuideTa = `DukaanPulse Sarvam AI நேரடி வழிகாட்டி: ${analysis.weatherAdvice.adviceText} கடந்த 6 நாட்களில் தினசரி சராசரி ₹${analysis.avg6DayDailyRevenue} வசூலாகியுள்ளது. ${analysis.flaggedDipWindows.length > 0 ? `கண்டறியப்பட்ட சரிவு நேரம்: ${analysis.flaggedDipWindows[0].windowLabel}.` : "விற்பனை சீராக உள்ளது."} சிறந்த பரிந்துரை: ${analysis.weatherAdvice.recommendedItems.join(", ")} காம்போ சலுகை தயார் செய்யவும்.`;
    const fullGuideHi = `DukaanPulse सर्वम AI स्मार्ट गाइड: ${analysis.weatherAdvice.adviceText} पिछले 6 दिनों का दैनिक औसत ₹${analysis.avg6DayDailyRevenue} रहा। ${analysis.flaggedDipWindows.length > 0 ? `मंदी का समय: ${analysis.flaggedDipWindows[0].windowLabel}।` : "बिक्री स्थिर है।"} सुझाव: ${analysis.weatherAdvice.recommendedItems.join(", ")} कॉम्बो तैयार करें।`;
    const fullGuideEn = `DukaanPulse Sarvam AI Store Guide: ${analysis.weatherAdvice.adviceText} 6-Day daily average is ₹${analysis.avg6DayDailyRevenue}. Focus on ${analysis.weatherAdvice.recommendedItems.join(", ")} combo offer.`;
    const title =
      lang === "ta-IN"
        ? "🤖 Sarvam AI நேரடி வணிக வழிகாட்டி"
        : lang === "hi-IN"
        ? "🤖 सर्वम AI स्मार्ट स्टोर गाइड"
        : "🤖 Sarvam AI Smart Store Guide";
    return {
      title,
      answerTa: fullGuideTa,
      answerHi: fullGuideHi,
      answerEn: fullGuideEn,
      topic: "guide",
      activeAnswer: lang === "ta-IN" ? fullGuideTa : lang === "hi-IN" ? fullGuideHi : fullGuideEn,
    };
  }

  // 5. Time-Window Dip question ("நேரம்", "time", "hour", "மந்த", "मंदी", "घंटे")
  if (
    q.includes("நேர") ||
    q.includes("time") ||
    q.includes("மணி") ||
    q.includes("hour") ||
    q.includes("மந்த") ||
    q.includes("मंदी") ||
    q.includes("समय")
  ) {
    const flagged = analysis.flaggedDipWindows;
    const windowTextTa =
      flagged.length > 0
        ? `கண்டறியப்பட்ட மந்தமான நேரம்: ${flagged.map((w) => `${w.windowLabel} (${w.dipPercent}% சரிவு, முந்தைய இடைநிலை ${w.historicalMedianCount} vs இன்று ${w.todayCount})`).join("; ")}. ${flagged[0].recommendationTa}`
        : `இன்று குறிப்பிடத்தக்க நேரச் சரிவு எதுவும் இல்லை. விற்பனை சீராகப் பதிவாகியுள்ளது.`;
    const windowTextHi =
      flagged.length > 0
        ? `मंदी का समय: ${flagged.map((w) => `${w.windowLabel} (${w.dipPercent}% गिरावट, सामान्य औसत ${w.historicalMedianCount} vs आज ${w.todayCount})`).join("; ")}। चाय + समोसा कॉम्बो से इसे पूरा करें।`
        : `आज किसी भी घंटे में खास मंदी नहीं रही। बिक्री स्थिर रही।`;
    const windowTextEn =
      flagged.length > 0
        ? `Specific time window dip detected: ${flagged[0].windowLabel} with ${flagged[0].dipPercent}% drop vs historical median (${flagged[0].todayCount} bills vs median ${flagged[0].historicalMedianCount}).`
        : `All hourly operational windows performed steadily today.`;

    const title =
      lang === "ta-IN"
        ? "நேரச் சாளர விற்பனை சரிவு"
        : lang === "hi-IN"
        ? "समय-खिड़की मंदी विश्लेषण"
        : "Time-Window Slump Analysis";
    return {
      title,
      answerTa: windowTextTa,
      answerHi: windowTextHi,
      answerEn: windowTextEn,
      topic: "time_window",
      activeAnswer: lang === "ta-IN" ? windowTextTa : lang === "hi-IN" ? windowTextHi : windowTextEn,
    };
  }

  // 6. Dip / Day Comparison question ("கம்மி", "சரிவு", "நேற்று", "dip", "less", "lower", "कम", "गिरावट")
  if (
    q.includes("கம்மி") ||
    q.includes("சரிவு") ||
    q.includes("நேற்று") ||
    q.includes("dip") ||
    q.includes("low") ||
    q.includes("loss") ||
    q.includes("decrease") ||
    q.includes("कम") ||
    q.includes("गिरावट") ||
    q.includes("कल")
  ) {
    const answerTa = analysis.dipSummaryTa;
    const answerHi = analysis.isDayDip
      ? `बिक्री मंदी विश्लेषण: आज कल की तुलना में ₹${Math.abs(analysis.dayOverDayDeltaRevenue)} कम (${analysis.dayOverDayDipPercent}% गिरावट) है। ${analysis.flaggedDipWindows.length > 0 ? `विशेषकर ${analysis.flaggedDipWindows[0].windowLabel} में मंदी रही।` : ""}`
      : `आज कोई मंदी नहीं है! कल की तुलना में ₹${analysis.dayOverDayDeltaRevenue} अधिक बिक्री हुई है।`;
    const answerEn = analysis.isDayDip
      ? `Today recorded ₹${analysis.todayRevenue} vs yesterday's ₹${analysis.yesterdayRevenue}, a dip of ₹${Math.abs(analysis.dayOverDayDeltaRevenue)} (${analysis.dayOverDayDipPercent}% drop). ${analysis.flaggedDipWindows.length > 0 ? `Noticeable slump during ${analysis.flaggedDipWindows[0].windowLabel}.` : ""}`
      : `No sales dip today. Revenue grew by ₹${analysis.dayOverDayDeltaRevenue} compared to yesterday.`;
    const title =
      lang === "ta-IN"
        ? "விற்பனை சரிவு & ஒப்பீடு"
        : lang === "hi-IN"
        ? "बिक्री मंदी और दिनवार तुलना"
        : "Sales Dip & Day Comparison";
    return {
      title,
      answerTa,
      answerHi,
      answerEn,
      topic: "dip",
      activeAnswer: lang === "ta-IN" ? answerTa : lang === "hi-IN" ? answerHi : answerEn,
    };
  }

  // 7. Product Sales question ("பொருள்", "டீ", "சமோசா", "product", "item", "उत्पाद", "चाय", "समोसा")
  if (
    q.includes("பொருள்") ||
    q.includes("item") ||
    q.includes("product") ||
    q.includes("டீ") ||
    q.includes("tea") ||
    q.includes("சமோசா") ||
    q.includes("samosa") ||
    q.includes("வடை") ||
    q.includes("उत्पाद") ||
    q.includes("आइटम") ||
    q.includes("चाय")
  ) {
    const answerTa = analysis.productSummaryTa;
    const answerHi = analysis.topProduct
      ? `उत्पाद बिक्री स्थिति: सबसे ज्यादा बिका ${analysis.topProduct.name} (${analysis.topProduct.units} पीस, ₹${analysis.topProduct.revenue})।`
      : `उत्पाद बिक्री दर्ज की जा रही है।`;
    const answerEn = analysis.topProduct
      ? `Best seller today is ${analysis.topProduct.name} with ${analysis.topProduct.units} units sold (₹${analysis.topProduct.revenue}).`
      : `No items sold yet.`;
    const title =
      lang === "ta-IN"
        ? "பொருள் வாரியான விற்பனை"
        : lang === "hi-IN"
        ? "उत्पादवार बिक्री प्रदर्शन"
        : "Product Sales Breakdown";
    return {
      title,
      answerTa,
      answerHi,
      answerEn,
      topic: "products",
      activeAnswer: lang === "ta-IN" ? answerTa : lang === "hi-IN" ? answerHi : answerEn,
    };
  }

  // Default: Full Daily Report
  const title =
    lang === "ta-IN"
      ? "இன்றைய முழு AI வணிக அறிக்கை"
      : lang === "hi-IN"
      ? "आज की संपूर्ण AI व्यापार रिपोर्ट"
      : "Complete Daily Store AI Report";
  const answerTa = analysis.fullReportTa;
  const answerHi = analysis.fullReportHi;
  const answerEn = analysis.fullReportEn;
  return {
    title,
    answerTa,
    answerHi,
    answerEn,
    topic: "general",
    activeAnswer: lang === "ta-IN" ? answerTa : lang === "hi-IN" ? answerHi : answerEn,
  };
}
