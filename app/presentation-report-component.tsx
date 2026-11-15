"use client";

import { useMemo } from "react";
import {
  Bill,
  Product,
  getSavedBills,
  getSavedProducts,
} from "@/lib/billing";
import {
  analyzeStoreBills,
} from "@/lib/ai-assistant";
import {
  Printer,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Store,
} from "lucide-react";

export function PresentationReportScreen({
  lang,
  onGoToBilling,
  onGoToActions,
}: {
  lang: "en-IN" | "hi-IN" | "ta-IN";
  onGoToBilling: () => void;
  onGoToActions: () => void;
}) {
  const isTamil = lang === "ta-IN";
  const isHindi = lang === "hi-IN";
  const bills: Bill[] = useMemo(() => getSavedBills(), []);
  const products: Product[] = useMemo(() => getSavedProducts(), []);

  const analysis = useMemo(() => {
    return analyzeStoreBills(bills, "2026-11-15", products);
  }, [bills, products]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadHTML = () => {
    if (typeof window === "undefined") return;
    const reportElem = document.getElementById("presentation-report-paper");
    if (!reportElem) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DukaanPulse - Executive Presentation Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #102c40; background: #fff; }
    .report-paper { max-width: 900px; margin: 0 auto; padding: 30px; border: 1px solid #cbd5e1; border-radius: 12px; }
    h1, h2, h3 { margin-top: 0; color: #002970; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; text-align: center; }
    .kpi-box strong { font-size: 22px; color: #007b94; display: block; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-size: 12px; }
    .alert-banner { background: #fff7ed; border: 1px solid #fdba74; padding: 14px; border-radius: 8px; margin: 16px 0; color: #9a3412; }
    .terms-box { background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 8px; margin: 16px 0; }
    @media print {
      body { margin: 0; }
      .report-paper { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-paper">
    ${reportElem.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DukaanPulse-Executive-Presentation-Report-${analysis.todayDate}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="presentation-report-container">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="report-top-actions no-print">
        <div>
          <h1 className="report-main-title">
            {isTamil
              ? "விளக்கக் காட்சி அறிக்கை & முன்மொழிவு (Presentation PDF)"
              : isHindi
                ? "कार्यकारी प्रस्तुति रिपोर्ट और पायलट प्रस्ताव (Presentation PDF)"
                : "Executive Presentation Report & Pilot Proposal"}
          </h1>
          <p className="report-subtitle">
            {isTamil
              ? "நீதிபதிகள், வழிகாட்டிகள் மற்றும் கூட்டாளர்களுக்கான அதிகாரப்பூர்வ ஆய்வு அறிக்கை."
              : isHindi
                ? "निर्णायकों, मेंटर्स और व्यापारिक साझेदारों के लिए आधिकारिक प्रस्तुति रिपोर्ट।"
                : "Official presentation-grade report for jury, mentors, and merchant partners."}
          </p>
        </div>

        <div className="action-buttons-group">
          <button className="download-btn" onClick={onGoToBilling}>
            <Store size={16} />
            <span>{isTamil ? "பில்லிங் POS" : isHindi ? "बिलिंग POS" : "Billing POS"}</span>
          </button>
          <button className="download-btn" onClick={onGoToActions}>
            <span>{isTamil ? "முடிவு நடவடிக்கைகள்" : isHindi ? "निर्णय कार्रवाइयाँ" : "Actions"}</span>
            <ArrowRight size={14} />
          </button>
          <button className="download-btn" onClick={handleDownloadHTML}>
            <Download size={16} />
            <span>{isTamil ? "HTML சேமி" : isHindi ? "HTML डाउनलोड" : "Download HTML"}</span>
          </button>
          <button className="print-report-btn" onClick={handlePrint}>
            <Printer size={18} />
            <span>
              {isTamil
                ? "அறிக்கையை அச்சிடு / PDF சேமி"
                : isHindi
                  ? "रिपोर्ट प्रिंट करें / PDF सहेजें"
                  : "Print / Save PDF Report"}
            </span>
          </button>
        </div>
      </div>

      {/* Printable Report Paper */}
      <div id="presentation-report-paper" className="report-paper">
        {/* Header Strip */}
        <header className="report-header">
          <div className="header-left">
            <div className="report-logo">
              <span className="logo-icon">DP</span>
              <div>
                <h2>DukaanPulse</h2>
                <small>PAYTM MERCHANT GROWTH AI · TRACK 1</small>
              </div>
            </div>
            <p className="hackathon-tag">
              Paytm Build for India AI Hackathon · Chennai · Team Trio
            </p>
          </div>

          <div className="header-right">
            <div className="store-badge">
              <Store size={15} />
              <strong>Marina Tea & Snacks</strong>
            </div>
            <span className="report-meta">
              Date: <strong>{analysis.todayDate}</strong> | Asia/Kolkata
            </span>
            <span className="report-status-badge verified">
              <CheckCircle2 size={12} /> Independent Pilot Proposal
            </span>
          </div>
        </header>

        <hr className="report-divider" />

        {/* 1. Executive Summary */}
        <section className="report-section">
          <h3 className="section-title">
            <FileText size={17} />
            {isTamil
              ? "1. நிர்வாகச் சுருக்கம் & மதிப்பு முன்மொழிவு"
              : isHindi
                ? "1. कार्यकारी सारांश और मूल्य प्रस्ताव"
                : "1. Executive Summary & Value Proposition"}
          </h3>
          <p className="report-text">
            {isTamil
              ? "சிறு சிற்றுண்டிக் கடைகள் மற்றும் டீ ஸ்டால்கள் மதிய மந்தமான நேரங்களில் (12:00 PM – 3:00 PM) தெளிவான அளவீடுகள் அல்லது சந்தைப்படுத்தல் கருவிகள் இன்றி அமைதியான விற்பனைச் சரிவை எதிர்கொள்கின்றன. DukaanPulse தினசரி கட்டண சமிக்ஞைகளை சரிபார்க்கப்பட்ட நேர சாளர ஆய்வுகளாக மாற்றுகிறது, விரைவான பில்லிங்கிற்கு உடனடி Paytm UPI QR குறியீடுகளை உருவாக்குகிறது, மற்றும் சர்வம் AI (Sarvam AI) மூலம் குரல் வழிகாட்டுதலுடன் வணிகர் அங்கீகரித்த காம்போ சோதனைகளை வழங்குகிறது."
              : isHindi
                ? "छोटे स्नैक और चाय की दुकानें दोपहर के समय (12:00 PM – 3:00 PM) बिना किसी स्पष्ट मीट्रिक के मंदी का सामना करती हैं। DukaanPulse दैनिक भुगतान सिग्नलों को समय-अवधि विश्लेषण में बदलता है, त्वरित बिलिंग के लिए तत्काल Paytm UPI QR कोड उत्पन्न करता है, और सर्वम AI के माध्यम से बहुभाषी वॉयस मार्गदर्शन के साथ सुरक्षित कॉम्बो परीक्षण प्रदान करता है।"
                : "Small neighborhood snack shops and tea stalls frequently face silent demand dips during off-peak hours (such as the 12:00 PM – 3:00 PM slump or mid-afternoon windows) without clear metrics or actionable marketing tools. DukaanPulse transforms everyday payment signals into verified time-window diagnostics, generates instant dynamic Paytm UPI QR codes for streamlined billing, and provides owner-approved, margin-guarded combo experiments with full Indic voice briefings via Sarvam AI."}
          </p>
        </section>

        {/* 2. Store Key Performance Indicators */}
        <section className="report-section">
          <h3 className="section-title">
            <Award size={17} />
            {isTamil
              ? `2. சரிபார்க்கப்பட்ட தினசரி கடை செயல்பாடு (${analysis.todayDate})`
              : isHindi
                ? `2. सत्यापित दैनिक दुकान प्रदर्शन (${analysis.todayDate})`
                : `2. Verified Daily Store Performance (Today: ${analysis.todayDate})`}
          </h3>

          <div className="report-kpi-grid">
            <div className="report-kpi-box">
              <span className="kpi-title">
                {isTamil
                  ? "இன்றைய மொத்த வசூல்"
                  : isHindi
                    ? "कुल बिक्री राजस्व"
                    : "Total Revenue"}
              </span>
              <strong className="kpi-num text-cyan">₹{analysis.todayRevenue}</strong>
              <small className="kpi-sub">
                {analysis.todayBillsCount}{" "}
                {isTamil
                  ? "நிறைவுற்ற பில்கள்"
                  : isHindi
                    ? "सफल बिल"
                    : "completed bills"}
              </small>
            </div>

            <div className="report-kpi-box">
              <span className="kpi-title">
                {isTamil
                  ? "விற்பனையான பொருட்கள்"
                  : isHindi
                    ? "बिक्री यूनिट"
                    : "Units Sold"}
              </span>
              <strong className="kpi-num">{analysis.todayUnitsSold}</strong>
              <small className="kpi-sub">
                {isTamil
                  ? "பொருட்கள் விநியோகம்"
                  : isHindi
                    ? "आइटम वितरित"
                    : "items dispensed"}
              </small>
            </div>

            <div className="report-kpi-box">
              <span className="kpi-title">
                {isTamil
                  ? "சராசரி பில் மதிப்பு"
                  : isHindi
                    ? "औसत बिल मूल्य"
                    : "Avg Ticket Size"}
              </span>
              <strong className="kpi-num">
                ₹{analysis.todayBillsCount > 0 ? Math.round(analysis.todayRevenue / analysis.todayBillsCount) : 0}
              </strong>
              <small className="kpi-sub">
                {isTamil
                  ? "வாடிக்கையாளர் பரிவர்த்தனை"
                  : isHindi
                    ? "प्रति ग्राहक लेनदेन"
                    : "per customer transaction"}
              </small>
            </div>

            <div className="report-kpi-box">
              <span className="kpi-title">
                {isTamil
                  ? "நேற்றுடன் ஒப்பீடு"
                  : isHindi
                    ? "कल से तुलना"
                    : "Day-over-Day Dip"}
              </span>
              <strong className={`kpi-num ${analysis.isDayDip ? "text-amber" : "text-green"}`}>
                {analysis.isDayDip
                  ? `-${analysis.dayOverDayDipPercent}%`
                  : `+${analysis.dayOverDayDeltaRevenue}`}
              </strong>
              <small className="kpi-sub">
                vs yesterday (₹{analysis.yesterdayRevenue})
              </small>
            </div>
          </div>
        </section>

        {/* 3. Time-Window Sales Dip Diagnostics */}
        <section className="report-section">
          <h3 className="section-title">
            <TrendingDown size={17} />
            {isTamil
              ? "3. நேரச் சாளர சரிவு ஆய்வு & மூல காரணப் பகுப்பாய்வு"
              : isHindi
                ? "3. समय-अवधि मंदी विश्लेषण और मूल कारण निदान"
                : "3. Time-Window Dip Diagnostics & Root Cause Analysis"}
          </h3>
          <p className="report-text">
            {isTamil
              ? "முந்தைய நாட்களின் சராசரி பில்களுடன் இன்றைய நேர சாளரங்கள் ஒப்பிடப்பட்டு சரிவு கண்டறியப்பட்டுள்ளது:"
              : isHindi
                ? "पिछले दिनों के औसत बिलों के साथ आज की समय-अवधि की तुलना करके मंदी का विश्लेषण:"
                : "Comparing today's transaction volume against matching historical weekday medians across operational windows:"}
          </p>

          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{isTamil ? "நேரச் சாளரம்" : isHindi ? "समय-अवधि" : "Time Window"}</th>
                  <th>{isTamil ? "இன்றைய பில்கள்" : isHindi ? "आज के बिल" : "Today's Bills"}</th>
                  <th>{isTamil ? "இன்றைய வசூல்" : isHindi ? "आज का राजस्व" : "Today's Revenue"}</th>
                  <th>{isTamil ? "முந்தைய சராசரி" : isHindi ? "पिछला औसत" : "Historical Median"}</th>
                  <th>{isTamil ? "செயல்பாட்டு நிலை" : isHindi ? "प्रदर्शन स्थिति" : "Performance Status"}</th>
                  <th>{isTamil ? "AI ஆய்வு குறிப்பு" : isHindi ? "AI निदान टिप्पणी" : "AI Diagnostic Note"}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.timeWindows.map((win, idx) => (
                  <tr key={idx} className={win.isFlagged ? "flagged-row" : ""}>
                    <td>
                      <strong>
                        {isTamil
                          ? win.windowLabelTa || win.windowLabel
                          : isHindi
                            ? win.windowLabelHi || win.windowLabel
                            : win.windowLabelEn || win.windowLabel}
                      </strong>
                    </td>
                    <td>{win.todayCount}</td>
                    <td>₹{win.todayRevenue}</td>
                    <td>
                      {win.historicalMedianCount}{" "}
                      {isTamil ? "பில்கள்" : isHindi ? "बिल" : "bills"}
                    </td>
                    <td>
                      {win.isFlagged ? (
                        <span className="table-badge badge-alert">
                          ⚠️ {win.dipPercent}%{" "}
                          {isTamil
                            ? "சரிவு!"
                            : isHindi
                              ? "मंदी दर्ज"
                              : "Dip Flagged"}
                        </span>
                      ) : (
                        <span className="table-badge badge-normal">
                          ✓{" "}
                          {isTamil
                            ? "சீரான விற்பனை"
                            : isHindi
                              ? "सामान्य / स्थिर"
                              : "Steady / Peak"}
                        </span>
                      )}
                    </td>
                    <td>
                      <small>
                        {isTamil
                          ? win.statusTa
                          : isHindi
                            ? win.statusHi
                            : win.statusEn}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {analysis.flaggedDipWindows.length > 0 && (
            <div className="report-callout alert-callout">
              <div className="callout-head">
                <AlertTriangle size={18} />
                <strong>
                  {isTamil
                    ? "முக்கிய விற்பனை சரிவு சமிக்ஞை கண்டறியப்பட்டது"
                    : isHindi
                      ? "महत्वपूर्ण बिक्री गिरावट का संकेत मिला"
                      : "Primary Evidence Signal Detected"}
                </strong>
              </div>
              <p>
                <strong>
                  {isTamil
                    ? analysis.flaggedDipWindows[0].windowLabelTa || analysis.flaggedDipWindows[0].windowLabel
                    : isHindi
                      ? analysis.flaggedDipWindows[0].windowLabelHi || analysis.flaggedDipWindows[0].windowLabel
                      : analysis.flaggedDipWindows[0].windowLabelEn || analysis.flaggedDipWindows[0].windowLabel}
                </strong>{" "}
                {isTamil
                  ? `நேரத்தில் முந்தைய சராசரியை விட ${analysis.flaggedDipWindows[0].dipPercent}% சரிவு ஏற்பட்டுள்ளது. சலுகை மூலம் இந்த சரிவை எளிதாக மீட்டெடுக்கலாம்.`
                  : isHindi
                    ? `के समय पिछले औसत से ${analysis.flaggedDipWindows[0].dipPercent}% की मंदी दर्ज हुई। कॉम्बो ऑफर द्वारा इसकी भरपाई की जा सकती है।`
                    : `recorded a significant drop of ${analysis.flaggedDipWindows[0].dipPercent}% compared to the historical baseline. DukaanPulse activates bounded, owner-approved merchant offers.`}
              </p>
            </div>
          )}
        </section>

        {/* 4. Owner-Approved Experiment */}
        <section className="report-section">
          <h3 className="section-title">
            <ShieldCheck size={17} />
            {isTamil
              ? "4. முடிவு ரசீது: லாப வரம்புடன் பாதுகாக்கப்பட்ட காம்போ சோதனை"
              : isHindi
                ? "4. निर्णय रसीद: लाभ-संरक्षित कॉम्बो प्रयोग"
                : "4. The Decision Receipt: Margin-Guarded Combo Experiment"}
          </h3>

          <div className="economics-card">
            <div className="combo-header">
              <div>
                <h4>
                  {isTamil
                    ? "தேநீர் + சூடான சமோசா காம்போ (Tea + Hot Snack Combo)"
                    : isHindi
                      ? "चाय + गरम समोसा कॉम्बो (Tea + Hot Snack Combo)"
                      : "Tea + Hot Snack Combo (தேநீர் + சிற்றுண்டி காம்போ)"}
                </h4>
                <p>
                  {isTamil
                    ? "மந்தமான நேர சாளரத்தில் வாடிக்கையாளர் வருகையை அதிகரிக்க வடிவமைக்கப்பட்டுள்ளது."
                    : isHindi
                      ? "मंदी के समय ग्राहकों की संख्या बढ़ाने के लिए डिज़ाइन किया गया।"
                      : "Designed for the flagged slump window to stimulate incremental tea stall footfall."}
                </p>
              </div>
              <span className="approved-pill">
                ✓{" "}
                {isTamil
                  ? "வணிகர் அங்கீகரித்த விதிமுறைகள்"
                  : isHindi
                    ? "दुकानदार स्वीकृत शर्तें"
                    : "Owner Approved Terms"}
              </span>
            </div>

            <div className="economics-grid">
              <div className="eco-item">
                <span>{isTamil ? "வழக்கமான விலை" : isHindi ? "सामान्य मूल्य" : "Standard Price"}</span>
                <strong>₹40.00</strong>
              </div>
              <div className="eco-item">
                <span>{isTamil ? "விளம்பரத் தள்ளுபடி" : isHindi ? "प्रचार छूट" : "Promotional Discount"}</span>
                <strong className="text-amber">-₹5.00</strong>
              </div>
              <div className="eco-item">
                <span>{isTamil ? "வாடிக்கையாளர் நிகர விலை" : isHindi ? "ग्राहक शुद्ध मूल्य" : "Net Customer Price"}</span>
                <strong className="text-cyan">₹35.00</strong>
              </div>
              <div className="eco-item">
                <span>{isTamil ? "உற்பத்தி அடக்க விலை" : isHindi ? "लागत मूल्य (COGS)" : "Unit Cost (COGS)"}</span>
                <strong>₹28.00</strong>
              </div>
              <div className="eco-item highlight">
                <span>{isTamil ? "நிகர லாபப் பங்களிப்பு" : isHindi ? "शुद्ध लाभ योगदान" : "Net Contribution / Redemption"}</span>
                <strong className="text-green">+₹7.00</strong>
              </div>
            </div>

            <div className="guardrails-row">
              <div className="guard-item">
                <small>{isTamil ? "லாப வரம்பு பாதுகாப்பு:" : isHindi ? "मार्जिन सुरक्षा:" : "Floor Protection:"}</small>
                <span>{isTamil ? "நிகர லாபம் ₹0 க்கு கீழே குறையாமல் உத்தரவாதம்" : isHindi ? "शुद्ध लाभ ₹0 से नीचे न जाने की गारंटी" : "Contribution margin strictly guarded above ₹0 floor"}</span>
              </div>
              <div className="guard-item">
                <small>{isTamil ? "அதிகபட்ச வரம்பு:" : isHindi ? "अधिकतम सीमा:" : "Capped Exposure:"}</small>
                <span>{isTamil ? "அதிகபட்சம் 20 பயன்பாடுகள் (ரூ. 100 வரவு-செலவு வரம்பு)" : isHindi ? "अधिकतम 20 रिडेम्पशन (₹100 बजट सीमा)" : "Max 20 redemptions (Hard budget cap ₹100 max promo expense)"}</span>
              </div>
              <div className="guard-item">
                <small>{isTamil ? "குறிப்பிட்ட நேரம்:" : isHindi ? "लक्षित समय:" : "Target Window:"}</small>
                <span>12:00 – 16:00 (Asia/Kolkata) | Single day verification</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Menu Profitability & Product Sales Breakdown */}
        <section className="report-section">
          <h3 className="section-title">
            <Layers size={17} />
            {isTamil
              ? "5. பொருட்கள் விற்பனை & மெனு செயல்திறன்"
              : isHindi
                ? "5. उत्पाद मिश्रण और मेनू प्रदर्शन"
                : "5. Product Mix & Menu Performance"}
          </h3>

          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{isTamil ? "பொருள் பெயர்" : isHindi ? "उत्पाद का नाम" : "Item Name"}</th>
                  <th>{isTamil ? "விலை" : isHindi ? "मूल्य" : "Price"}</th>
                  <th>{isTamil ? "இன்று விற்ற எண்ணிக்கை" : isHindi ? "आज बिकीं यूनिट" : "Units Sold Today"}</th>
                  <th>{isTamil ? "மொத்த வசூல்" : isHindi ? "कुल राजस्व" : "Total Revenue"}</th>
                  <th>{isTamil ? "வருவாய் பங்கு" : isHindi ? "राजस्व हिस्सा" : "Revenue Share"}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.productSalesList.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>
                        {isTamil
                          ? p.nameTa
                          : isHindi
                            ? p.nameHi || p.name
                            : p.name}
                      </strong>{" "}
                      <small>({p.name})</small>
                    </td>
                    <td>₹{p.units > 0 ? Math.round(p.revenue / p.units) : "—"}</td>
                    <td><strong>{p.units}</strong></td>
                    <td>₹{p.revenue}</td>
                    <td>
                      {analysis.todayRevenue > 0
                        ? Math.round((p.revenue / analysis.todayRevenue) * 100)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Indic Voice & Sarvam AI Integration */}
        <section className="report-section">
          <h3 className="section-title">
            <Sparkles size={17} />
            {isTamil
              ? "6. இந்திய மொழிகள் & சர்வம் AI கட்டமைப்பு"
              : isHindi
                ? "6. भारतीय भाषाएँ और सर्वम AI आर्किटेक्चर"
                : "6. Indic Multilingual & Sarvam AI Architecture"}
          </h3>

          <div className="sarvam-integration-box">
            <div className="sarvam-feature-grid">
              <div className="sarvam-feature">
                <strong>Sarvam Bulbul:v3 (Text-to-Speech)</strong>
                <p>
                  {isTamil
                    ? "இயற்கையான தமிழ் மற்றும் இந்தி குரலில் தினசரி விற்பனை சுருக்கம் மற்றும் Paytm சவுண்ட்பாக்ஸ் ஒலி அறிவிப்புகளை வழங்குகிறது."
                    : isHindi
                      ? "स्वाभाविक हिंदी और तमिल आवाज़ में दैनिक बिक्री सारांश और Paytm साउंडबॉक्स ध्वनि अलर्ट प्रदान करता है।"
                      : "Delivers natural colloquial Tamil & Hindi voice briefings of receipts, daily numbers, and Paytm Soundbox chime alerts."}
                </p>
              </div>
              <div className="sarvam-feature">
                <strong>Sarvam Saaras:v3 (Speech-to-Text)</strong>
                <p>
                  {isTamil
                    ? "வணிகர்கள் பில்லிங் செய்யும்போதே கைகள் பயன்படுத்தாமல் தமிழில் குரல் மூலம் கேள்விகள் கேட்க அனுமதிக்கிறது."
                    : isHindi
                      ? "दुकानदारों को हैंड्स-फ्री बोलकर बिक्री व मंदी संबंधी प्रश्न पूछने की सुविधा देता है।"
                      : "Enables hands-free spoken Indic questions for busy merchants during fast checkout."}
                </p>
              </div>
              <div className="sarvam-feature">
                <strong>Sarvam-105b (Reasoning & Focus)</strong>
                <p>
                  {isTamil
                    ? "வணிகக் கேள்விகளை சரிபார்க்கப்பட்ட நிதித் தரவுகளுடன் இணைத்து, தவறான AI எண்களைத் தவிர்த்து துல்லியமான முடிவுகளை எடுக்கிறது."
                    : isHindi
                      ? "व्यापारिक प्रश्नों को सत्यापित वित्तीय डेटा से जोड़कर सटीक रणनीतिक निर्णय सुनिश्चित करता है।"
                      : "Grounds merchant questions into validated financial parameters, preventing LLM numeric hallucinations."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="report-footer">
          <div className="footer-left">
            <strong>DukaanPulse Team Trio</strong> · Track 1: Paytm Merchant Growth AI · Chennai
            <p>
              {isTamil
                ? "ஹேக்கத்தான் முன்மாதிரி விளக்கம். நேரடி Paytm உற்பத்தி இணைப்பு கோரப்படவில்லை."
                : isHindi
                  ? "हैकाथॉन प्रोटोटाइप प्रदर्शन। प्रत्यक्ष Paytm उत्पादन कनेक्शन का दावा नहीं है।"
                  : "Independent hackathon demonstration. No production Paytm connection or endorsement claimed."}
            </p>
          </div>
          <div className="footer-right">
            <span>Generated: {new Date().toISOString().slice(0, 19).replace("T", " ")} IST</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
