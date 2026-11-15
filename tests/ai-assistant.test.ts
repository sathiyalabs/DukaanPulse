import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSeedBills, DEFAULT_PRODUCTS } from "../lib/billing";
import { analyzeStoreBills, answerStoreAIQuestion } from "../lib/ai-assistant";

test("analyzeStoreBills accurately calculates today sales, yesterday dip, and time window dips", () => {
  const seedBills = generateSeedBills();
  const analysis = analyzeStoreBills(seedBills, "2026-11-15", DEFAULT_PRODUCTS);

  assert.equal(analysis.todayDate, "2026-11-15");
  assert.ok(analysis.todayRevenue > 0);
  assert.ok(analysis.todayBillsCount > 0);
  assert.ok(analysis.yesterdayRevenue > 0);

  // Time window dip detection (DukaanPulse feature)
  assert.equal(analysis.timeWindows.length, 4);
  // Afternoon window 11:00 - 15:00 has deliberate slump in seed data
  const afternoonWindow = analysis.timeWindows.find((w) => w.startHour === 11);
  assert.ok(afternoonWindow);
  assert.ok(afternoonWindow.isFlagged, "Afternoon 11-15 should be flagged as dip");
  assert.ok(afternoonWindow.dipPercent >= 25);
  assert.ok(analysis.flaggedDipWindows.length > 0);

  // Spoken Tamil briefing
  assert.ok(analysis.fullReportTa.includes("வணக்கம்"));
  assert.ok(analysis.fullReportTa.includes("ரூபாய்"));

  // 6-Day Sales Reports
  assert.ok(analysis.sixDayReports.length >= 5);
  assert.ok(analysis.total6DayRevenue > 0);
  assert.ok(analysis.avg6DayDailyRevenue > 0);

  // Weather & Climate Integration
  assert.ok(analysis.weatherReportTa.includes("வானிலை"));
  assert.ok(analysis.weatherAdvice.recommendedItems.length > 0);

  // Sarvam AI Decision Engine
  assert.ok(analysis.decisions.length >= 3, "Should generate Sarvam AI actionable decisions");
  const deadHourDec = analysis.decisions.find((d) => d.category === "dead_hour");
  assert.ok(deadHourDec, "Should include a dead-hour recovery decision");
  assert.ok(deadHourDec.titleTa.length > 0);
  assert.ok(deadHourDec.titleHi.length > 0);
  assert.ok(deadHourDec.titleEn.length > 0);
  assert.ok(deadHourDec.projectedImpactTa.length > 0);
});

test("answerStoreAIQuestion handles Tamil, Hindi, and English multilingual questions", () => {
  const seedBills = generateSeedBills();

  // Test weather query in Tamil
  const weatherReply = answerStoreAIQuestion("இன்றைய வானிலைக்கு என்ன விற்கலாம்?", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "ta-IN");
  assert.equal(weatherReply.topic, "weather");
  assert.ok(weatherReply.activeAnswer.includes("வானிலை"));

  // Test weather query in Hindi
  const weatherReplyHi = answerStoreAIQuestion("आज के मौसम के अनुसार क्या बेचना चाहिए?", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "hi-IN");
  assert.equal(weatherReplyHi.topic, "weather");
  assert.ok(weatherReplyHi.activeAnswer.includes("मौसम"));

  // Test Sarvam decisions query in Hindi
  const decReplyHi = answerStoreAIQuestion("दुकान के लिए सर्वम AI के रणनीतिक निर्णय क्या हैं?", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "hi-IN");
  assert.equal(decReplyHi.topic, "decision");
  assert.ok(decReplyHi.activeAnswer.includes("सर्वम AI"));

  // Test 6-day sales report query
  const sixDayReply = answerStoreAIQuestion("6 நாள் விற்பனை அறிக்கை விவரம் கொடுங்கள்", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "ta-IN");
  assert.equal(sixDayReply.topic, "six_day_report");
  assert.ok(sixDayReply.activeAnswer.includes("6 நாட்"));

  // Test Smart Store Guide query
  const guideReply = answerStoreAIQuestion("இன்றைய நேரடி வழிகாட்டி உதவி சொல்லுங்கள்", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "ta-IN");
  assert.equal(guideReply.topic, "guide");
  assert.ok(guideReply.activeAnswer.includes("வழிகாட்டி"));

  // Test dip query
  const dipReply = answerStoreAIQuestion("நேற்றை விட இன்று எவ்வளவு கம்மியா இருக்கு?", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "ta-IN");
  assert.equal(dipReply.topic, "dip");
  assert.ok(dipReply.activeAnswer.includes("சரிவு") || dipReply.activeAnswer.includes("குறைவு"));

  // Test time window query
  const timeReply = answerStoreAIQuestion("எந்த நேரத்துல சேல்ஸ் ரொம்ப கம்மியா ஆச்சு?", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "ta-IN");
  assert.equal(timeReply.topic, "time_window");
  assert.ok(timeReply.activeAnswer.includes("மந்தமான") || timeReply.activeAnswer.includes("சரிவு"));

  // Test product query
  const prodReply = answerStoreAIQuestion("டீ எவ்வளவு விற்றது?", seedBills, "2026-11-15", DEFAULT_PRODUCTS, undefined, undefined, "ta-IN");
  assert.equal(prodReply.topic, "products");
  assert.ok(prodReply.activeAnswer.includes("மசாலா டீ") || prodReply.activeAnswer.includes("பொருட்கள்"));
});

test("analyzeStoreBills respects store operating hours, exceptions, and coverage checks", () => {
  const seedBills = generateSeedBills();

  // 1. When store is closed for the day via date exception
  const closedContext = {
    shop: "Marina Tea & Snacks",
    date: "2026-11-15",
    open: 420,
    close: 1320,
    goal: "count" as const,
    threshold: 25,
    coverage: {},
    exceptions: {
      "2026-11-15": {
        closed: true,
        open: 0,
        close: 0,
        exclude: false,
        reason: "Store closed for holiday",
      },
    },
    testDate: "2026-11-22",
    reviewDate: "2026-11-23",
    offer: {
      name: { "en-IN": "Combo", "hi-IN": "कॉम्बो", "ta-IN": "காம்போ" },
      available: true,
      price: 4000,
      cost: 2800,
      discount: 500,
      additional: 0,
      quantity: 40,
      limit: 20,
      budget: 10000,
      floor: 0,
      referenceVolume: 14,
    },
  };

  const closedAnalysis = analyzeStoreBills(
    seedBills,
    "2026-11-15",
    DEFAULT_PRODUCTS,
    undefined,
    undefined,
    closedContext,
  );

  // All windows must be marked closed with NO slumps flagged and quiet-hour advice safely withdrawn!
  assert.equal(closedAnalysis.flaggedDipWindows.length, 0);
  for (const win of closedAnalysis.timeWindows) {
    assert.equal(win.isOpen, false);
    assert.equal(win.isFlagged, false);
    assert.equal(win.state, "closed");
    assert.ok(win.recommendationTa.includes("திரும்பப் பெறப்பட்டது"));
  }
  assert.ok(closedAnalysis.offerAdviceTa.includes("திரும்பப் பெறப்பட்டுள்ளது"));

  // 2. When store opens late (12:00 PM = 720 min)
  const lateOpenContext = {
    ...closedContext,
    open: 720, // 12:00 PM
    close: 1320,
    exceptions: {},
  };

  const lateAnalysis = analyzeStoreBills(
    seedBills,
    "2026-11-15",
    DEFAULT_PRODUCTS,
    undefined,
    undefined,
    lateOpenContext,
  );

  // Morning window (07:00 - 11:00) is before 12:00 PM, must be marked closed!
  const morningWin = lateAnalysis.timeWindows.find((w) => w.startHour === 7);
  assert.ok(morningWin);
  assert.equal(morningWin.isOpen, false);
  assert.equal(morningWin.isFlagged, false);
  assert.equal(morningWin.state, "closed");

  // 3. When coverage is unconfirmed
  const unconfirmedCovContext = {
    ...closedContext,
    open: 420,
    close: 1320,
    exceptions: {},
    coverage: {
      "2026-11-15": {
        state: "unknown" as const,
        start: 420,
        end: 1320,
      },
    },
  };

  const covAnalysis = analyzeStoreBills(
    seedBills,
    "2026-11-15",
    DEFAULT_PRODUCTS,
    undefined,
    undefined,
    unconfirmedCovContext,
  );

  // All windows have unconfirmed coverage, none can be flagged as slumps!
  assert.equal(covAnalysis.flaggedDipWindows.length, 0);
  for (const win of covAnalysis.timeWindows) {
    assert.equal(win.hasCoverage, false);
    assert.equal(win.isFlagged, false);
    assert.equal(win.state, "unknown");
  }
});
