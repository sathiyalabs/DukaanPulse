import QRCode from "qrcode";

export type ProductCategory =
  | "tea_coffee"
  | "snacks"
  | "bakery_tiffin"
  | "drinks"
  | "other";

export type Product = {
  id: string;
  name: string; // English
  nameTa: string; // Tamil
  nameHi?: string; // Hindi
  price: number; // in Rupees
  category: ProductCategory;
  emoji: string;
};

export type BillItem = {
  productId: string;
  name: string;
  nameTa: string;
  nameHi?: string;
  price: number; // in Rupees
  quantity: number;
  itemTotal: number; // in Rupees
};

export type Bill = {
  id: string; // e.g. "DP-20261115-001"
  timestamp: string; // ISO format
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  hour: number; // 0-23
  items: BillItem[];
  totalItems: number;
  totalAmount: number; // in Rupees
  paymentMethod: "paytm_upi" | "cash";
  status: "completed";
  isSynthetic?: boolean; // Clearly separates synthetic demo data from real merchant records
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Masala Tea",
    nameTa: "மசாலா டீ",
    nameHi: "मसाला चाय",
    price: 12,
    category: "tea_coffee",
    emoji: "☕",
  },
  {
    id: "p2",
    name: "Filter Coffee",
    nameTa: "ஃபில்டர் காபி",
    nameHi: "फ़िल्टर कॉफ़ी",
    price: 15,
    category: "tea_coffee",
    emoji: "☕",
  },
  {
    id: "p3",
    name: "Ginger Tea",
    nameTa: "இஞ்சி டீ",
    nameHi: "अदरक चाय",
    price: 15,
    category: "tea_coffee",
    emoji: "🫖",
  },
  {
    id: "p4",
    name: "Medu Vada",
    nameTa: "மெது வடை",
    nameHi: "मेदु वड़ा",
    price: 10,
    category: "snacks",
    emoji: "🥯",
  },
  {
    id: "p5",
    name: "Samosa",
    nameTa: "சமோசா",
    nameHi: "समोसा",
    price: 15,
    category: "snacks",
    emoji: "🥟",
  },
  {
    id: "p6",
    name: "Veg Puffs",
    nameTa: "காய்கறி பப்ஸ்",
    nameHi: "वेज पफ़्स",
    price: 20,
    category: "bakery_tiffin",
    emoji: "🥐",
  },
  {
    id: "p7",
    name: "Egg Puffs",
    nameTa: "முட்டை பப்ஸ்",
    nameHi: "अंडा पफ़्स",
    price: 25,
    category: "bakery_tiffin",
    emoji: "🥐",
  },
  {
    id: "p8",
    name: "Bun Butter Jam",
    nameTa: "பன் பட்டர் ஜாம்",
    nameHi: "बन बटर जैम",
    price: 25,
    category: "bakery_tiffin",
    emoji: "🍞",
  },
  {
    id: "p9",
    name: "Badam Milk",
    nameTa: "பாதாம் பால்",
    nameHi: "बादाम दूध",
    price: 25,
    category: "drinks",
    emoji: "🥛",
  },
  {
    id: "p10",
    name: "Banana Bonda",
    nameTa: "வாழைக்காய் போண்டா",
    nameHi: "केला बोंडा",
    price: 10,
    category: "snacks",
    emoji: "🍘",
  },
  {
    id: "p11",
    name: "Idli (2 pcs)",
    nameTa: "இட்லி (2)",
    nameHi: "इडली (2 पीस)",
    price: 30,
    category: "bakery_tiffin",
    emoji: "🥟",
  },
  {
    id: "p12",
    name: "Mineral Water",
    nameTa: "தண்ணீர் பாட்டில்",
    nameHi: "मिनरल वाटर",
    price: 20,
    category: "drinks",
    emoji: "💧",
  },
];

export const CATEGORY_LABELS: Record<
  ProductCategory,
  { en: string; ta: string; hi: string }
> = {
  tea_coffee: { en: "Tea & Coffee", ta: "டீ & காபி", hi: "चाय और कॉफ़ी" },
  snacks: { en: "Hot Snacks", ta: "சூடான சிற்றுண்டி", hi: "गरम नाश्ता" },
  bakery_tiffin: {
    en: "Bakery & Tiffin",
    ta: "பேக்கரி & டிபன்",
    hi: "बेकरी और टिफिन",
  },
  drinks: {
    en: "Cool Drinks & Milk",
    ta: "குளிர் பானங்கள் & பால்",
    hi: "शीतल पेय और दूध",
  },
  other: { en: "Other Items", ta: "மற்ற பொருட்கள்", hi: "अन्य वस्तुएं" },
};

export function getProductName(
  product: { name: string; nameTa?: string; nameHi?: string },
  lang: "en-IN" | "hi-IN" | "ta-IN",
): string {
  if (lang === "ta-IN" && product.nameTa) return product.nameTa;
  if (lang === "hi-IN" && product.nameHi) return product.nameHi;
  return product.name;
}

export function getCategoryLabel(
  category: ProductCategory,
  lang: "en-IN" | "hi-IN" | "ta-IN",
): string {
  const c = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
  if (lang === "ta-IN") return c.ta;
  if (lang === "hi-IN") return c.hi;
  return c.en;
}

export const PAYTM_DEFAULT_CONFIG = {
  upiId: "paytmqr2810050501011@paytm",
  merchantName: "DukaanPulse Store",
  merchantNameTa: "துக்கான்பல்ஸ் அங்காடி",
};

/**
 * Builds the official UPI dynamic QR format accepted by Paytm and all Indian UPI apps.
 */
export function buildPaytmUPIUrl(params: {
  upiId?: string;
  merchantName?: string;
  amount: number;
  billId: string;
  note?: string;
}): string {
  const upiId = params.upiId || PAYTM_DEFAULT_CONFIG.upiId;
  const merchantName = encodeURIComponent(
    params.merchantName || PAYTM_DEFAULT_CONFIG.merchantName,
  );
  const amountStr = params.amount.toFixed(2);
  const note = encodeURIComponent(params.note || `Bill ${params.billId}`);
  return `upi://pay?pa=${upiId}&pn=${merchantName}&am=${amountStr}&cu=INR&tn=${note}`;
}

/**
 * Generates base64 data URL for QR Code
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 280,
      margin: 1,
      color: {
        dark: "#042b48", // deep navy for high scannability
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("QR Code generation failed:", err);
    return "";
  }
}

/**
 * Seed realistic multi-day sales data so that analytics (product sales, inactive/dead hours, daily breakdown)
 * have rich, meaningful data out-of-the-box, simulating a real neighbourhood tea shop.
 */
export function generateSeedBills(): Bill[] {
  const bills: Bill[] = [];
  const dates = [
    "2026-11-15",
    "2026-11-14",
    "2026-11-13",
    "2026-11-12",
    "2026-11-11",
    "2026-11-10",
  ];

  // Helper to create a bill
  const createBill = (
    date: string,
    hour: number,
    minute: number,
    itemsList: { id: string; qty: number }[],
    seq: number,
  ): Bill => {
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const timestamp = `${date}T${timeStr}:00+05:30`;
    const billItems: BillItem[] = itemsList.map((it) => {
      const prod =
        DEFAULT_PRODUCTS.find((p) => p.id === it.id) || DEFAULT_PRODUCTS[0];
      return {
        productId: prod.id,
        name: prod.name,
        nameTa: prod.nameTa,
        price: prod.price,
        quantity: it.qty,
        itemTotal: prod.price * it.qty,
      };
    });
    const totalAmount = billItems.reduce((acc, i) => acc + i.itemTotal, 0);
    const totalItems = billItems.reduce((acc, i) => acc + i.quantity, 0);

    return {
      id: `DP-${date.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`,
      timestamp,
      date,
      time: timeStr,
      hour,
      items: billItems,
      totalItems,
      totalAmount,
      paymentMethod: seq % 3 === 0 ? "cash" : "paytm_upi",
      status: "completed",
      isSynthetic: true,
    };
  };

  dates.forEach((date, dIndex) => {
    let billSeq = 1;
    // Morning rush (7:00 AM - 10:00 AM) - High activity
    const morningRounds = 9 - (dIndex % 4);
    for (let i = 0; i < morningRounds; i++) {
      const h = 7 + (i % 3);
      const m = (i * 17) % 60;
      bills.push(
        createBill(
          date,
          h,
          m,
          [
            { id: i % 2 === 0 ? "p1" : "p2", qty: (i % 3) + 1 }, // Tea or Coffee
            { id: i % 3 === 0 ? "p4" : "p11", qty: (i % 2) + 1 }, // Vada or Idli
          ],
          billSeq++,
        ),
      );
    }

    // Mid-day slump / DEAD HOURS (12:00 PM - 3:00 PM)
    // On previous days, 2-3 bills happened (tea, mineral water, snacks), but TODAY has zero sales!
    if (dIndex > 0) {
      bills.push(
        createBill(date, 12, 15, [{ id: "p12", qty: 1 }, { id: "p1", qty: 2 }], billSeq++),
      );
      bills.push(
        createBill(date, 13, 45, [{ id: "p5", qty: 2 }], billSeq++),
      );
      bills.push(
        createBill(date, 14, 30, [{ id: "p2", qty: 1 }], billSeq++),
      );
    }

    // Evening peak (4:00 PM - 6:30 PM) - Huge tea & snack surge
    const eveningRounds = 11 - (dIndex % 2);
    for (let i = 0; i < eveningRounds; i++) {
      const h = 16 + (i % 3);
      const m = (i * 13) % 60;
      bills.push(
        createBill(
          date,
          h,
          m,
          [
            { id: i % 3 === 0 ? "p1" : i % 3 === 1 ? "p3" : "p2", qty: (i % 2) + 1 }, // Tea, Ginger Tea, Coffee
            { id: i % 2 === 0 ? "p5" : "p6", qty: (i % 2) + 1 }, // Samosa, Puff
          ],
          billSeq++,
        ),
      );
    }

    // Night wind-down (8:00 PM - 9:30 PM)
    bills.push(
      createBill(
        date,
        20,
        15,
        [
          { id: "p9", qty: 2 }, // Badam milk
          { id: "p8", qty: 1 }, // Bun butter jam
        ],
        billSeq++,
      ),
    );
    bills.push(
      createBill(date, 21, 10, [{ id: "p1", qty: 2 }], billSeq++),
    );
  });

  return bills;
}

export type ProductSalesStat = {
  productId: string;
  name: string;
  nameTa: string;
  category: ProductCategory;
  emoji: string;
  unitPrice: number;
  unitsSold: number;
  totalRevenue: number;
  revenuePercent: number;
};

export type HourlySalesStat = {
  hour: number;
  hourLabel: string; // e.g. "07:00 - 08:00"
  billsCount: number;
  unitsSold: number;
  totalRevenue: number;
  isPeak: boolean;
  isDead: boolean; // sales did not happen or extremely low
};

export type DayWiseSalesStat = {
  date: string;
  dayLabel: string; // e.g. "Today (15 Nov)"
  billsCount: number;
  totalRevenue: number;
  totalUnits: number;
  products: {
    productId: string;
    name: string;
    nameTa: string;
    unitsSold: number;
    revenue: number;
  }[];
};

export type SalesAnalytics = {
  filterDate: string; // "all" or specific "YYYY-MM-DD"
  totalRevenue: number;
  totalBills: number;
  totalUnitsSold: number;
  averageBillValue: number;
  paytmUpiSharePercent: number;

  // 1. Product sales
  productStats: ProductSalesStat[];
  topSellingProduct: ProductSalesStat | null;
  leastSellingProduct: ProductSalesStat | null;

  // 2. Time-of-day & Dead hours
  hourlyStats: HourlySalesStat[];
  deadHours: HourlySalesStat[]; // "entha time sale akala"
  peakHours: HourlySalesStat[]; // peak active hours

  // 3. Day-wise breakdown
  dayWiseStats: DayWiseSalesStat[];

  // 4. Tamil Voice briefing & Insights
  voiceBriefingTa: string;
  voiceBriefingEn: string;
  deadHoursWarningTa: string;
  actionRecommendationTa: string;
};

/**
 * Comprehensive calculation of Product Sales, Hourly Dead/Peak times, and Daily metrics.
 */
export function computeSalesAnalytics(
  bills: Bill[],
  filterDate: string = "2026-11-15",
  products: Product[] = DEFAULT_PRODUCTS,
): SalesAnalytics {
  const relevantBills =
    filterDate === "all"
      ? bills
      : bills.filter((b) => b.date === filterDate);

  const totalBills = relevantBills.length;
  const totalRevenue = relevantBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalUnitsSold = relevantBills.reduce(
    (acc, b) => acc + b.totalItems,
    0,
  );
  const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

  const upiBills = relevantBills.filter((b) => b.paymentMethod === "paytm_upi");
  const upiRevenue = upiBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const paytmUpiSharePercent =
    totalRevenue > 0 ? Math.round((upiRevenue / totalRevenue) * 100) : 0;

  // 1. Product Sales Breakdown
  const prodMap = new Map<
    string,
    { units: number; revenue: number }
  >();

  relevantBills.forEach((b) => {
    b.items.forEach((item) => {
      const cur = prodMap.get(item.productId) || { units: 0, revenue: 0 };
      prodMap.set(item.productId, {
        units: cur.units + item.quantity,
        revenue: cur.revenue + item.itemTotal,
      });
    });
  });

  const productStats: ProductSalesStat[] = products
    .map((p) => {
      const stat = prodMap.get(p.id) || { units: 0, revenue: 0 };
      const revenuePercent =
        totalRevenue > 0 ? Math.round((stat.revenue / totalRevenue) * 100) : 0;
      return {
        productId: p.id,
        name: p.name,
        nameTa: p.nameTa,
        category: p.category,
        emoji: p.emoji,
        unitPrice: p.price,
        unitsSold: stat.units,
        totalRevenue: stat.revenue,
        revenuePercent,
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const topSellingProduct =
    productStats.length > 0 && productStats[0].unitsSold > 0
      ? productStats[0]
      : null;
  const activeProducts = productStats.filter((p) => p.unitsSold > 0);
  const leastSellingProduct =
    activeProducts.length > 0
      ? activeProducts[activeProducts.length - 1]
      : null;

  // 2. Hourly Sales & Dead Hours (from 06:00 to 22:00)
  const hourlyMap = new Map<
    number,
    { bills: number; units: number; revenue: number }
  >();
  for (let h = 6; h <= 22; h++) {
    hourlyMap.set(h, { bills: 0, units: 0, revenue: 0 });
  }

  relevantBills.forEach((b) => {
    if (hourlyMap.has(b.hour)) {
      const cur = hourlyMap.get(b.hour)!;
      hourlyMap.set(b.hour, {
        bills: cur.bills + 1,
        units: cur.units + b.totalItems,
        revenue: cur.revenue + b.totalAmount,
      });
    }
  });

  const hourlyStats: HourlySalesStat[] = [];
  let maxRevenue = 0;
  hourlyMap.forEach((v) => {
    if (v.revenue > maxRevenue) maxRevenue = v.revenue;
  });

  const peakThreshold = Math.max(80, maxRevenue * 0.6);

  hourlyMap.forEach((val, h) => {
    const nextH = (h + 1) % 24;
    const hourLabel = `${String(h).padStart(2, "0")}:00 - ${String(nextH).padStart(2, "0")}:00`;
    const isPeak = val.revenue >= peakThreshold && val.revenue > 0;
    // Dead hour: inside shop operation hours (9 AM - 8 PM), having 0 or <= 1 bill
    const isDead = h >= 10 && h <= 20 && val.bills <= 1;

    hourlyStats.push({
      hour: h,
      hourLabel,
      billsCount: val.bills,
      unitsSold: val.units,
      totalRevenue: val.revenue,
      isPeak,
      isDead,
    });
  });

  const deadHours = hourlyStats.filter((h) => h.isDead);
  const peakHours = hourlyStats.filter((h) => h.isPeak);

  // 3. Day-wise Stats (All available days in bills)
  const dayMap = new Map<string, Bill[]>();
  bills.forEach((b) => {
    const list = dayMap.get(b.date) || [];
    list.push(b);
    dayMap.set(b.date, list);
  });

  const dayWiseStats: DayWiseSalesStat[] = Array.from(dayMap.entries())
    .map(([date, dBills]) => {
      const dRevenue = dBills.reduce((acc, b) => acc + b.totalAmount, 0);
      const dUnits = dBills.reduce((acc, b) => acc + b.totalItems, 0);

      // Product sales for this day
      const dProdMap = new Map<string, { units: number; revenue: number }>();
      dBills.forEach((b) => {
        b.items.forEach((it) => {
          const cur = dProdMap.get(it.productId) || { units: 0, revenue: 0 };
          dProdMap.set(it.productId, {
            units: cur.units + it.quantity,
            revenue: cur.revenue + it.itemTotal,
          });
        });
      });

      const dayProducts = products
        .map((p) => {
          const st = dProdMap.get(p.id) || { units: 0, revenue: 0 };
          return {
            productId: p.id,
            name: p.name,
            nameTa: p.nameTa,
            unitsSold: st.units,
            revenue: st.revenue,
          };
        })
        .filter((p) => p.unitsSold > 0)
        .sort((a, b) => b.unitsSold - a.unitsSold);

      const isToday = date === "2026-11-15";
      const isYesterday = date === "2026-11-14";
      const dayLabel = isToday
        ? `இன்று (${date})`
        : isYesterday
          ? `நேற்று (${date})`
          : date;

      return {
        date,
        dayLabel,
        billsCount: dBills.length,
        totalRevenue: dRevenue,
        totalUnits: dUnits,
        products: dayProducts,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // 4. Tamil Voice Briefing generation
  const deadHoursText =
    deadHours.length > 0
      ? `மதியம் ${deadHours.map((d) => `${d.hour}:00`).join(", ")} மணி நேரங்களில் விற்பனை மந்தமாக இருந்தது அல்லது நடக்கவில்லை.`
      : `இன்று அனைத்து நேரங்களிலும் சுமாரான விற்பனை நடந்துள்ளது.`;

  const topProdText = topSellingProduct
    ? `இன்று அதிகம் விற்ற பொருள் ${topSellingProduct.nameTa}, மொத்தம் ${topSellingProduct.unitsSold} எண்ணிக்கையில் விற்று, ரூபாய் ${topSellingProduct.totalRevenue} வசூலானது.`
    : `விற்பனை விவரம் சேகரிக்கப்படுகிறது.`;

  const voiceBriefingTa = `வணக்கம்! உங்கள் கடையின் இன்றைய விற்பனை அறிக்கை: மொத்தம் ${totalRevenue} ரூபாய் வசூல், ${totalBills} பில்கள் போடப்பட்டுள்ளன. ${topProdText} ${deadHoursText} மாலை வேளையில் அதிக விற்பனை காணப்பட்டது.`;

  const voiceBriefingEn = `Hello! Today's sales summary: Total collection is ₹${totalRevenue} across ${totalBills} bills. Top selling item is ${topSellingProduct ? topSellingProduct.name : "N/A"} with ${topSellingProduct ? topSellingProduct.unitsSold : 0} units sold. Slow hours detected around ${deadHours.map((d) => `${d.hour}:00`).join(", ")}. Evening had the highest rush.`;

  const deadHoursWarningTa =
    deadHours.length > 0
      ? `எச்சரிக்கை: ${deadHours.map((d) => d.hourLabel).join(", ")} நேரங்களில் விற்பனை நடக்கவில்லை/மந்தமாக இருந்தது.`
      : `மந்தமான நேரம் எதுவும் இல்லை.`;

  const actionRecommendationTa =
    deadHours.length > 0
      ? `பரிந்துரை: மந்தமான இந்த ${deadHours[0].hourLabel} நேரத்தில் 'டீ + சமோசா ₹25 காம்போ' அல்லது ₹5 சிறப்பு தள்ளுபடி சலுகை அறிவித்து வாடிக்கையாளர்களை ஈர்க்கலாம்!`
      : `விற்பனை சீராக உள்ளது; தொடர்ந்து பராமரியுங்கள்!`;

  return {
    filterDate,
    totalRevenue,
    totalBills,
    totalUnitsSold,
    averageBillValue: Math.round(averageBillValue),
    paytmUpiSharePercent,
    productStats,
    topSellingProduct,
    leastSellingProduct,
    hourlyStats,
    deadHours,
    peakHours,
    dayWiseStats,
    voiceBriefingTa,
    voiceBriefingEn,
    deadHoursWarningTa,
    actionRecommendationTa,
  };
}

/**
 * Storage key constants
 */
export const STORAGE_PRODUCTS_KEY = "dukaanpulse_products_v1";
export const STORAGE_BILLS_KEY = "dukaanpulse_bills_v1";

/**
 * Retrieve products from localStorage or fallback to defaults
 */
export function getSavedProducts(): Product[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(
        STORAGE_PRODUCTS_KEY,
        JSON.stringify(DEFAULT_PRODUCTS),
      );
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

/**
 * Save products to localStorage
 */
export function saveProducts(products: Product[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {
    console.error("Failed to save products:", e);
  }
}

/**
 * Retrieve bills from localStorage or initialize with seed bills.
 * Clearly separates real merchant records from synthetic demonstration data.
 */
export function getSavedBills(filter: "all" | "real" | "synthetic" = "all"): Bill[] {
  if (typeof window === "undefined") {
    const seed = generateSeedBills();
    if (filter === "real") return [];
    if (filter === "synthetic") return seed;
    return seed;
  }
  try {
    const raw = localStorage.getItem(STORAGE_BILLS_KEY);
    let allBills: Bill[];
    if (!raw) {
      allBills = generateSeedBills();
      localStorage.setItem(STORAGE_BILLS_KEY, JSON.stringify(allBills));
    } else {
      allBills = JSON.parse(raw);
      if (!Array.isArray(allBills)) {
        allBills = generateSeedBills();
        localStorage.setItem(STORAGE_BILLS_KEY, JSON.stringify(allBills));
      }
    }

    if (filter === "real") return allBills.filter((b) => b.isSynthetic !== true);
    if (filter === "synthetic") return allBills.filter((b) => b.isSynthetic === true);
    return allBills;
  } catch {
    const seed = generateSeedBills();
    if (filter === "real") return [];
    if (filter === "synthetic") return seed;
    return seed;
  }
}

/**
 * Returns only genuine merchant bills recorded via POS or manual billing.
 */
export function getRealBills(): Bill[] {
  return getSavedBills("real");
}

/**
 * Returns only synthetic benchmark bills used for demo initialization.
 */
export function getSyntheticBills(): Bill[] {
  return getSavedBills("synthetic");
}

/**
 * Save bills to localStorage with error recovery
 */
export function saveBills(bills: Bill[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_BILLS_KEY, JSON.stringify(bills));
  } catch (e) {
    console.error("Failed to save bills to localStorage:", e);
  }
}

/**
 * Records a real merchant bill, marked explicitly as non-synthetic.
 */
export function addRealBill(bill: Bill): Bill[] {
  const current = getSavedBills("all");
  const realBill: Bill = { ...bill, isSynthetic: false };
  const updated = [realBill, ...current];
  saveBills(updated);
  return updated;
}

/**
 * Clears synthetic demo bills, keeping only real merchant records.
 */
export function clearSyntheticBills(): Bill[] {
  const realOnly = getSavedBills("real");
  saveBills(realOnly);
  return realOnly;
}

/**
 * Restores the standard synthetic demo benchmark bills while preserving any real merchant bills.
 */
export function resetDemoBills(): Bill[] {
  const realOnly = getSavedBills("real");
  const freshSeed = generateSeedBills();
  const merged = [...realOnly, ...freshSeed];
  saveBills(merged);
  return merged;
}

/**
 * Clears all bills from local storage.
 */
export function clearAllBills(): void {
  saveBills([]);
}

/**
 * Plays an authentic recreation of the Paytm Soundbox payment confirmation
 * chime using Web Audio API. Uses harmonic-rich tones with ADSR envelopes
 * and a subtle convolution reverb to emulate the characteristic metallic ring
 * of the real Soundbox speaker.
 *
 * Two ascending notes: C6 (1046 Hz) → E6 (1318 Hz)
 */
export function playPaytmChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // --- Reverb via short impulse response ---
    const sampleRate = ctx.sampleRate;
    const reverbLen = Math.floor(sampleRate * 0.6); // 600ms tail
    const impulseBuffer = ctx.createBuffer(2, reverbLen, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulseBuffer.getChannelData(ch);
      for (let i = 0; i < reverbLen; i++) {
        // Exponential decay with a bit of stereo randomness
        data[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 3);
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulseBuffer;

    // Mix dry / wet
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0.75;
    wetGain.gain.value = 0.25;
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);
    dryGain.connect(ctx.destination);

    /**
     * Play a single harmonic-rich tone with a proper ADSR envelope.
     *
     * @param freq      Fundamental frequency (Hz)
     * @param startSec  When the note begins (relative to ctx.currentTime)
     * @param attack    Attack time (s)
     * @param decay     Decay time (s)
     * @param sustain   Sustain level (0-1)
     * @param sustainT  Sustain hold time (s)
     * @param release   Release time (s)
     * @param peakGain  Peak amplitude
     */
    const playTone = (
      freq: number,
      startSec: number,
      attack: number,
      decay: number,
      sustain: number,
      sustainT: number,
      release: number,
      peakGain: number,
    ) => {
      const t0 = ctx.currentTime + startSec;
      const totalDuration = attack + decay + sustainT + release;

      // Harmonics: fundamental + 2nd (octave) + 3rd (fifth above octave)
      const harmonics: Array<{ ratio: number; amp: number; type: OscillatorType }> = [
        { ratio: 1, amp: 1.0, type: "sine" },       // fundamental
        { ratio: 2, amp: 0.25, type: "sine" },       // 2nd harmonic
        { ratio: 3, amp: 0.12, type: "sine" },       // 3rd harmonic
        { ratio: 1, amp: 0.06, type: "triangle" },   // body warmth
      ];

      for (const h of harmonics) {
        const osc = ctx.createOscillator();
        const envGain = ctx.createGain();

        osc.type = h.type;
        osc.frequency.setValueAtTime(freq * h.ratio, t0);

        // ---- ADSR Envelope ----
        const amp = peakGain * h.amp;
        envGain.gain.setValueAtTime(0.0001, t0);
        // A – Attack
        envGain.gain.linearRampToValueAtTime(amp, t0 + attack);
        // D – Decay
        envGain.gain.linearRampToValueAtTime(
          amp * sustain,
          t0 + attack + decay,
        );
        // S – Sustain (hold)
        envGain.gain.setValueAtTime(
          amp * sustain,
          t0 + attack + decay + sustainT,
        );
        // R – Release
        envGain.gain.exponentialRampToValueAtTime(
          0.0001,
          t0 + totalDuration,
        );

        osc.connect(envGain);
        // Route to both dry and reverb paths
        envGain.connect(dryGain);
        envGain.connect(convolver);

        osc.start(t0);
        osc.stop(t0 + totalDuration + 0.05);
      }
    };

    // ---- Paytm Soundbox iconic ascending two-note chime ----
    // Note 1: C6 (1046 Hz) – short, bright tap
    playTone(
      1046,   // freq
      0.0,    // start
      0.008,  // attack  – snappy onset
      0.05,   // decay
      0.6,    // sustain level
      0.12,   // sustain hold
      0.15,   // release – gentle fade
      0.28,   // peak gain
    );

    // Note 2: E6 (1318 Hz) – longer, ringing confirmation
    playTone(
      1318,   // freq
      0.18,   // start – begins as first note decays
      0.008,  // attack
      0.06,   // decay
      0.55,   // sustain level
      0.25,   // sustain hold – longer ring
      0.35,   // release – extended tail
      0.30,   // peak gain – slightly louder
    );
  } catch (e) {
    console.warn("AudioContext not supported or blocked by user gesture:", e);
  }
}

let activeAudioPlayer: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (activeAudioPlayer) {
    activeAudioPlayer.pause();
    activeAudioPlayer.currentTime = 0;
    activeAudioPlayer = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speaks an utterance in Tamil, Hindi, or English using Sarvam AI neural TTS (bulbul:v3)
 * with graceful fallback to browser Web Speech Synthesis.
 */
export async function speakTamil(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  lang: "en-IN" | "hi-IN" | "ta-IN" = "ta-IN",
): Promise<void> {
  stopSpeaking();

  // 1. Try Sarvam AI neural voice (bulbul:v3) first
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/ai-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          success?: boolean;
          audio?: string;
          mime?: string;
        };
        if (data.success && data.audio) {
          const audio = new Audio(`data:${data.mime || "audio/mpeg"};base64,${data.audio}`);
          activeAudioPlayer = audio;
          if (onStart) audio.onplay = () => onStart();
          audio.onended = () => {
            activeAudioPlayer = null;
            if (onEnd) onEnd();
          };
          audio.onerror = () => {
            activeAudioPlayer = null;
            fallbackWebSpeech(text, onStart, onEnd, lang);
          };
          await audio.play();
          return;
        }
      }
    } catch {
      // Network or sandbox error, proceed to fallback
    }
  }

  // 2. Fallback to browser Web Speech Synthesis
  fallbackWebSpeech(text, onStart, onEnd, lang);
}

function fallbackWebSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  lang: "en-IN" | "hi-IN" | "ta-IN" = "ta-IN",
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const voices = window.speechSynthesis.getVoices();
  const langPrefix = lang === "hi-IN" ? "hi" : lang === "en-IN" ? "en" : "ta";
  const matchedVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
    voices.find((v) => v.lang.includes("IN")) ||
    null;

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  utterance.lang = lang;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}
