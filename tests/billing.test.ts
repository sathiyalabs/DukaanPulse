import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRODUCTS,
  generateSeedBills,
  computeSalesAnalytics,
  buildPaytmUPIUrl,
  getProductName,
  getCategoryLabel,
} from "../lib/billing";

test("DEFAULT_PRODUCTS has necessary products with Tamil and Hindi names and categories", () => {
  assert.ok(DEFAULT_PRODUCTS.length >= 10);
  const tea = DEFAULT_PRODUCTS.find((p) => p.id === "p1");
  assert.ok(tea);
  assert.equal(tea.name, "Masala Tea");
  assert.equal(tea.nameTa, "மசாலா டீ");
  assert.equal(tea.nameHi, "मसाला चाय");
  assert.equal(tea.price, 12);

  // Test multilingual helper getProductName
  assert.equal(getProductName(tea, "ta-IN"), "மசாலா டீ");
  assert.equal(getProductName(tea, "hi-IN"), "मसाला चाय");
  assert.equal(getProductName(tea, "en-IN"), "Masala Tea");

  // Test multilingual category labels
  assert.equal(getCategoryLabel("tea_coffee", "ta-IN"), "டீ & காபி");
  assert.equal(getCategoryLabel("tea_coffee", "hi-IN"), "चाय और कॉफ़ी");
  assert.equal(getCategoryLabel("tea_coffee", "en-IN"), "Tea & Coffee");
});

test("buildPaytmUPIUrl generates standard UPI payment link", () => {
  const url = buildPaytmUPIUrl({
    amount: 45,
    billId: "DP-1001",
    note: "Tea and Samosa",
  });
  assert.ok(url.startsWith("upi://pay?"));
  assert.ok(url.includes("am=45.00"));
  assert.ok(url.includes("cu=INR"));
  assert.ok(url.includes("paytmqr"));
});

test("computeSalesAnalytics computes product sales, inactive dead hours, and day-wise statistics", () => {
  const seedBills = generateSeedBills();
  assert.ok(seedBills.length > 20);

  const analytics = computeSalesAnalytics(seedBills, "2026-11-15", DEFAULT_PRODUCTS);
  assert.ok(analytics.totalRevenue > 0);
  assert.ok(analytics.totalBills > 0);
  assert.ok(analytics.totalUnitsSold > 0);

  // Check product sales ("evalo product sale")
  assert.ok(analytics.productStats.length > 0);
  assert.ok(analytics.topSellingProduct !== null);
  assert.ok(analytics.topSellingProduct.unitsSold > 0);

  // Check inactive/dead hours ("entha time sale akala")
  assert.ok(analytics.hourlyStats.length > 0);
  assert.ok(analytics.deadHours.length > 0, "Should detect dead hours with zero or low sales");
  assert.ok(analytics.deadHours.some((h) => h.hour >= 12 && h.hour <= 15));

  // Check day-wise statistics ("days ena product evalo sale")
  assert.ok(analytics.dayWiseStats.length >= 4);
  const firstDay = analytics.dayWiseStats[0];
  assert.ok(firstDay.products.length > 0);
  assert.ok(firstDay.products[0].unitsSold > 0);

  // Check Tamil Voice briefing
  assert.ok(analytics.voiceBriefingTa.includes("வணக்கம்"));
  assert.ok(analytics.voiceBriefingTa.includes("ரூபாய்"));
  assert.ok(analytics.deadHoursWarningTa.includes("நேரங்களில்"));
});
