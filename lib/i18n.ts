import { Lang, Analysis, Context, Experiment, money } from "./domain";
import { economics } from "./analytics";
// UI copy is reviewed as one three-language catalog. Numerals always come from the canonical state.
const catalog: Record<string, [string, string]> = {
 "Scenario threshold exceeds the redemption limit. This capped test cannot preserve the reference contribution.": ["ज़रूरी उपयोग संख्या सीमा से अधिक है। यह सीमित प्रयोग संदर्भ योगदान बनाए नहीं रख सकता।", "தேவையான பயன்பாடுகள் வரம்பை மீறுகின்றன. இந்த வரம்புள்ள முயற்சி குறிப்புப் பங்களிப்பைத் தக்கவைக்க முடியாது."],
 'Print / Save PDF':['प्रिंट / PDF सहेजें','அச்சிடு / PDF சேமி'],
  "Today’s Pulse": ["आज की झलक", "இன்றைய நிலவரம்"],
  "Quick Billing & POS": ["त्वरित बिलिंग और POS", "பில்லிங் & விற்பனை பதிவு (POS)"],
  "Sales & Time Analytics": ["बिक्री और समय विश्लेषण", "விற்பனை & நேர பகுப்பாய்வு"],
  "AI Assistant (Tamil Voice)": ["AI सहायक और निर्णय", "AI வணிக உதவியாளர் & குரல்"],
  "Executive Report (PDF)": ["कार्यकारी रिपोर्ट (PDF)", "முழுமையான வணிக அறிக்கை (PDF)"],
  "Add Product": ["उत्पाद जोड़ें", "பொருள் சேர்க்க"],
  "Sales Analytics": ["बिक्री विश्लेषण", "விற்பனை பகுப்பாய்வு"],
  "AI Decisions (Sarvam)": ["AI निर्णय (सर्वम)", "AI முடிவுகள் (சர்வம்)"],
  "AI Store Guide": ["AI स्टोर गाइड", "AI வணிக வழிகாட்டி"],
  "All": ["सभी", "அனைத்தும்"],
  "Current Order": ["वर्तमान ऑर्डर", "தற்போதைய பில்"],
  "Clear": ["साफ़ करें", "அழி"],
  "Cart is empty": ["कार्ट खाली है", "கார்ட்டில் பொருட்கள் இல்லை"],
  "Total Amount": ["कुल राशि", "மொத்த தொகை"],
  "Items": ["आइटम", "பொருட்கள்"],
  "Payment Mode": ["भुगतान का तरीका", "கட்டண முறை"],
  "Generate Paytm QR & Announce": ["Paytm QR बनाएं और उद्घोषणा करें", "Paytm QR உருவாக்கு & அறிவி"],
  "Record Cash Payment": ["नकद भुगतान दर्ज करें", "ரொக்கக் கட்டணம் பதிவு செய்க"],
  "Date:": ["तारीख:", "தேதி:"],
  "Today": ["आज", "இன்று"],
  "Yesterday": ["कल", "நேற்று"],
  "All 6 Days": ["सभी 6 दिन", "அனைத்து 6 நாட்கள்"],
  "Gross Sales Revenue": ["कुल बिक्री राजस्व", "மொத்த விற்பனை வருவாய்"],
  "Total Bills": ["कुल बिल", "மொத்த பில்கள்"],
  "Average Bill Value": ["औसत बिल मूल्य", "சராசரி பில் மதிப்பு"],
  "Inactive Sales Window": ["मंदी का समय", "மந்தமான நேர சாளரம்"],
  "Top Selling Items": ["सर्वाधिक बिकने वाले उत्पाद", "அதிகம் விற்ற பொருட்கள்"],
  "Hourly Sales Breakdown": ["घंटेवार बिक्री विवरण", "மணிநேர விற்பனை வரைபடம்"],
  "Recent Bills": ["हाल के बिल", "சமீபத்திய பில்கள்"],
  "Bill ID": ["बिल आईडी", "பில் எண்"],
  "Time": ["समय", "நேரம்"],
  "Amount": ["राशि", "தொகை"],
  "Payment": ["भुगतान", "கட்டணம்"],
  "Completed": ["सफल", "நிறைவுற்றது"],
  "Go to Billing": ["बिलिंग पर जाएं", "பில்லிங் செல்ல"],
  "Go to Analytics": ["विश्लेषण पर जाएं", "பகுப்பாய்வு செல்ல"],
  "Sarvam AI Decisions": ["सर्वम AI व्यावसायिक निर्णय", "சர்வம் AI வணிக முடிவுகள்"],
  "Live Weather Guide": ["लाइव मौसम गाइड", "நேரடி வானிலை வழிகாட்டி"],
  "Search items...": ["उत्पाद खोजें...", "பொருட்களைத் தேடுக..."],
  "Print Bill": ["बिल प्रिंट करें", "பில் அச்சிடு"],
  "Next Customer": ["अगला ग्राहक", "அடுத்த வாடிக்கையாளர்"],
  "Paytm Soundbox": ["Paytm साउंडबॉक्स", "Paytm சவுண்ட்பாக்ஸ்"],
  "Setup & upload": ["सेटअप और अपलोड", "அமைப்பு & பதிவேற்றம்"],
  "Decision Receipt": ["निर्णय रसीद", "முடிவு ரசீது"],
  "Compare actions": ["विकल्प देखें", "செயல்களை ஒப்பிடுங்கள்"],
  Experiment: ["प्रयोग", "முயற்சி"],
  "Results & history": ["नतीजे और इतिहास", "முடிவுகள் & வரலாறு"],
  "Your next move, with a reason.": [
    "अगला कदम, वजह के साथ।",
    "காரணத்துடன் அடுத்த படி.",
  ],
  "From payment patterns to a small, measurable experiment.": [
    "भुगतान के रुझान से एक छोटा, मापने योग्य प्रयोग।",
    "பரிவர்த்தனைப் போக்கிலிருந்து அளவிடக்கூடிய சிறு முயற்சி.",
  ],
  "Merchant workspace": ["दुकान का कार्यक्षेत्र", "கடை பணியிடம்"],
  "Team Trio · Track 1": ["टीम ट्रायो · ट्रैक 1", "டீம் ட்ரையோ · பிரிவு 1"],
  "Independent hackathon prototype. No Paytm connection.": [
    "स्वतंत्र हैकाथॉन प्रोटोटाइप। Paytm से जुड़ा नहीं है।",
    "தனித்த ஹேக்கத்தான் முன்மாதிரி. Paytm இணைப்பு இல்லை.",
  ],
  "Synthetic demonstration": [
    "कृत्रिम डेटा का डेमो",
    "செயற்கைத் தரவு விளக்கம்",
  ],
  "Fixed reference date": ["तय संदर्भ तारीख", "நிலையான குறிப்பு தேதி"],
  "Saved on server": ["सर्वर पर सहेजा", "சேவையகத்தில் சேமிக்கப்பட்டது"],
  "Saving…": ["सहेज रहे हैं…", "சேமிக்கிறது…"],
  "Save failed": ["सहेजा नहीं गया", "சேமிக்க முடியவில்லை"],
  "Loading your workspace…": [
    "कार्यक्षेत्र खुल रहा है…",
    "பணியிடம் திறக்கிறது…",
  ],
  "Load synthetic shop": [
    "कृत्रिम दुकान लोड करें",
    "மாதிரிக் கடையைத் திறக்கவும்",
  ],
  "Start with your records": [
    "अपने रिकॉर्ड से शुरू करें",
    "உங்கள் பதிவுகளுடன் தொடங்குங்கள்",
  ],
  "No records yet": ["अभी कोई रिकॉर्ड नहीं", "பதிவுகள் இன்னும் இல்லை"],
  "Upload a CSV or explore the labelled synthetic shop.": [
    "CSV अपलोड करें या कृत्रिम दुकान का डेमो देखें।",
    "CSV பதிவேற்றவும் அல்லது செயற்கை மாதிரிக் கடையைப் பார்க்கவும்.",
  ],
  "View evidence": ["सबूत देखें", "ஆதாரத்தைப் பார்க்கவும்"],
  "Correct context": ["जानकारी सुधारें", "சூழலைத் திருத்தவும்"],
  "Review experiment": ["प्रयोग की समीक्षा", "முயற்சியை மதிப்பிடவும்"],
  "Recorded completed value": ["दर्ज सफल भुगतान राशि", "பதிவான நிறைவுற்ற தொகை"],
  "Completed payments": ["सफल भुगतान", "நிறைவுற்ற பரிவர்த்தனைகள்"],
  "Average completed value": ["औसत सफल भुगतान", "சராசரி நிறைவுற்ற தொகை"],
  "Payments by time window": [
    "समय के अनुसार भुगतान",
    "நேரப்படி பரிவர்த்தனைகள்",
  ],
  "Recorded payments only. Cash and other missing channels are outside this file.":
    [
      "केवल दर्ज भुगतान। नकद और दूसरे अनुपस्थित माध्यम शामिल नहीं।",
      "பதிவான பரிவர்த்தனைகள் மட்டும். ரொக்கம் மற்றும் விடுபட்ட வழிகள் இதில் இல்லை.",
    ],
  "One priority observation": ["एक ज़रूरी संकेत", "ஒரு முக்கியக் கவனிப்பு"],
  "Investigate the 4–6 PM window": [
    "शाम 4–6 बजे की जाँच करें",
    "மாலை 4–6 நேரத்தை ஆராயுங்கள்",
  ],
  "No supported dip to act on": [
    "कार्रवाई लायक गिरावट का सबूत नहीं",
    "சரிவு குறித்து செயல்படப் போதிய ஆதாரம் இல்லை",
  ],
  "Context needs attention": ["जानकारी जाँचें", "சூழலைச் சரிபார்க்கவும்"],
  "Same weekday. Same window. Visible evidence.": [
    "एक ही वार, एक ही समय। सबूत सामने।",
    "அதே கிழமை. அதே நேரம். வெளிப்படையான ஆதாரம்.",
  ],
  payments: ["भुगतान", "பரிவர்த்தனைகள்"],
  "historical median": ["पुराना मध्यक", "முந்தைய இடைநிலை"],
  "below median": ["मध्यक से कम", "இடைநிலைக்குக் கீழே"],
  "matched periods": ["मिलते पुराने दिन", "பொருந்தும் முந்தைய நாட்கள்"],
  "Flagging threshold": ["संकेत की सीमा", "குறிக்கும் வரம்பு"],
  "Minimum three matched periods. This is descriptive evidence, not statistical significance.":
    [
      "कम से कम तीन मिलते दिन। यह वर्णन है, सांख्यिकीय महत्व का प्रमाण नहीं।",
      "குறைந்தது மூன்று பொருந்தும் நாட்கள். இது விவரிப்பு மட்டுமே; புள்ளியியல் உறுதி இல்லை.",
    ],
  "Listen to this receipt": ["रसीद सुनें", "இந்த ரசீதைக் கேளுங்கள்"],
  "Explain with Sarvam": ["Sarvam से समझें", "Sarvam மூலம் விளக்கவும்"],
  "Why these dates?": ["ये तारीखें क्यों?", "இந்தத் தேதிகள் ஏன்?"],
  "What is missing?": ["क्या जानकारी नहीं है?", "என்ன தகவல் இல்லை?"],
  "Is the offer feasible?": [
    "क्या ऑफर संभव है?",
    "சலுகை செயல்படுத்த முடியுமா?",
  ],
  "Ask about this evidence": [
    "इस सबूत पर सवाल पूछें",
    "இந்த ஆதாரம் பற்றிக் கேளுங்கள்",
  ],
  Ask: ["पूछें", "கேளுங்கள்"],
  "Rule-based explanation": ["नियम-आधारित व्याख्या", "விதிப்படி விளக்கம்"],
  "Sarvam-assisted explanation": [
    "Sarvam की मदद से व्याख्या",
    "Sarvam உதவியுடன் விளக்கம்",
  ],
  "Cached explanation": ["सहेजी हुई व्याख्या", "சேமித்த விளக்கம்"],
  "Cached Sarvam audio": ["सहेजा हुआ Sarvam ऑडियो", "சேமித்த Sarvam ஒலி"],
  "Sarvam audio": ["Sarvam ऑडियो", "Sarvam ஒலி"],
  "Device speech fallback": [
    "डिवाइस की आवाज़ का विकल्प",
    "சாதனக் குரல் மாற்றுவழி",
  ],
  "Sarvam is not configured. Analytics still work.": [
    "Sarvam सेटअप नहीं है। गणना चालू है।",
    "Sarvam அமைக்கப்படவில்லை. கணக்கீடுகள் இயங்குகின்றன.",
  ],
  "Speech is unavailable on this device. Read the receipt below.": [
    "इस डिवाइस पर आवाज़ उपलब्ध नहीं। नीचे रसीद पढ़ें।",
    "இந்தச் சாதனத்தில் குரல் கிடைக்கவில்லை. கீழே ரசீதைப் படிக்கவும்.",
  ],
  "Provider unavailable. Using the rule-based explanation.": [
    "सेवा उपलब्ध नहीं। नियम-आधारित व्याख्या दिख रही है।",
    "சேவை கிடைக்கவில்லை. விதிப்படி விளக்கம் காட்டப்படுகிறது.",
  ],
  "Listen using device voice": [
    "डिवाइस की आवाज़ में सुनें",
    "சாதனக் குரலில் கேளுங்கள்",
  ],
  "No provider credits used. Voice availability depends on this device.": [
    "प्रदाता क्रेडिट खर्च नहीं। आवाज़ डिवाइस पर निर्भर है।",
    "சேவை கிரெடிட் செலவில்லை. குரல் இந்தச் சாதனத்தைப் பொறுத்தது.",
  ],
  "Calculation & source": ["गणना और स्रोत", "கணக்கீடு & மூலம்"],
  "Current window": ["मौजूदा समय", "தற்போதைய நேரப்பகுதி"],
  Date: ["तारीख", "தேதி"],
  Count: ["संख्या", "எண்ணிக்கை"],
  Status: ["स्थिति", "நிலை"],
  Included: ["शामिल", "சேர்க்கப்பட்டது"],
  Excluded: ["हटाया", "விலக்கப்பட்டது"],
  Eligible: ["योग्य", "தகுதியானது"],
  Closed: ["बंद", "மூடப்பட்டது"],
  "Partial opening": ["अधूरा खुला समय", "பகுதி நேரம் திறப்பு"],
  "Coverage unknown": ["डेटा कवरेज अज्ञात", "தரவுப் பரப்பு தெரியவில்லை"],
  "Open, zero recorded payments": [
    "खुला, कोई दर्ज भुगतान नहीं",
    "திறந்துள்ளது, பதிவான பரிவர்த்தனை இல்லை",
  ],
  "Merchant exclusion": ["दुकानदार ने हटाया", "வணிகர் விலக்கினார்"],
  "Merchant-provided context": [
    "दुकानदार की दी जानकारी",
    "வணிகர் வழங்கிய சூழல்",
  ],
  Revisions: ["संशोधन", "திருத்தங்கள்"],
  Revision: ["संशोधन", "திருத்தம்"],
  "Change reason": ["बदलाव की वजह", "மாற்றக் காரணம்"],
  "No corrections yet": ["अभी कोई सुधार नहीं", "திருத்தங்கள் இன்னும் இல்லை"],
  "Every meaningful change invalidates earlier approvals and generated content.":
    [
      "हर ज़रूरी बदलाव पुरानी स्वीकृति और सामग्री को अमान्य करता है।",
      "முக்கிய மாற்றம் பழைய ஒப்புதல் மற்றும் உள்ளடக்கத்தைச் செல்லாததாக்கும்.",
    ],
  "Export receipt & history": [
    "रसीद और इतिहास डाउनलोड",
    "ரசீது & வரலாற்றை ஏற்றுமதி செய்க",
  ],
  "Shop name": ["दुकान का नाम", "கடையின் பெயர்"],
  Language: ["भाषा", "மொழி"],
  "Regular opening": ["सामान्य खुलने का समय", "வழக்கமான திறப்பு நேரம்"],
  "Regular closing": ["सामान्य बंद होने का समय", "வழக்கமான மூடும் நேரம்"],
  "Reference date": ["संदर्भ तारीख", "குறிப்பு தேதி"],
  "Experiment date": ["प्रयोग की तारीख", "முயற்சித் தேதி"],
  "Review date": ["समीक्षा की तारीख", "மதிப்பீட்டுத் தேதி"],
  Goal: ["लक्ष्य", "இலக்கு"],
  "Increase payment count": [
    "भुगतान संख्या बढ़ाना",
    "பரிவர்த்தனை எண்ணிக்கையை உயர்த்துதல்",
  ],
  "Increase average payment value": [
    "औसत भुगतान बढ़ाना",
    "சராசரி பரிவர்த்தனைத் தொகையை உயர்த்துதல்",
  ],
  "A bundle does not establish more customers or payments.": [
    "कॉम्बो से ग्राहक या भुगतान बढ़ना तय नहीं होता।",
    "காம்போ அதிக வாடிக்கையாளர்கள் அல்லது பரிவர்த்தனைகளை உறுதி செய்யாது.",
  ],
  "Save context": ["जानकारी सहेजें", "சூழலைச் சேமிக்கவும்"],
  "Why did this change?": ["बदलाव क्यों किया?", "ஏன் மாற்றுகிறீர்கள்?"],
  "Owner correction": ["दुकानदार का सुधार", "வணிகர் திருத்தம்"],
  "Coverage & date exceptions": [
    "डेटा कवरेज और तारीख के अपवाद",
    "தரவுப் பரப்பு & நாள் விதிவிலக்குகள்",
  ],
  "Confirm only dates and hours actually covered by your upload.": [
    "केवल अपलोड में मौजूद तारीख और समय की पुष्टि करें।",
    "உங்கள் கோப்பில் உள்ள தேதி மற்றும் நேரத்தை மட்டும் உறுதிப்படுத்தவும்.",
  ],
  "Complete upload coverage": ["पूरा डेटा उपलब्ध", "முழுத் தரவுப் பரப்பு"],
  "Coverage starts": ["डेटा शुरू", "பரப்பு தொடக்கம்"],
  "Coverage ends": ["डेटा अंत", "பரப்பு முடிவு"],
  "Opening override": ["खुलने का अलग समय", "மாற்றுத் திறப்பு நேரம்"],
  "Closing override": ["बंद होने का अलग समय", "மாற்று மூடும் நேரம்"],
  "Closed all day": ["पूरे दिन बंद", "முழுநாளும் மூடப்பட்டது"],
  "Exclude exceptional day": [
    "असाधारण दिन हटाएँ",
    "விதிவிலக்கான நாளை விலக்கவும்",
  ],
  "Exception reason": ["अपवाद की वजह", "விதிவிலக்குக் காரணம்"],
  "Use regular hours": ["सामान्य समय रखें", "வழக்கமான நேரத்தைப் பயன்படுத்து"],
  "No coverage confirmation means unknown, never zero.": [
    "कवरेज की पुष्टि बिना अज्ञात रहेगा, शून्य नहीं।",
    "பரப்பு உறுதி இல்லையெனில் தெரியவில்லை; பூஜ்ஜியம் அல்ல.",
  ],
  "Payment CSV": ["भुगतान CSV", "பரிவர்த்தனை CSV"],
  "Choose CSV": ["CSV चुनें", "CSV தேர்வு"],
  "Preview & map columns": [
    "झलक और कॉलम मिलान",
    "முன்பார்வை & நெடுவரிசை பொருத்தம்",
  ],
  "Import validated rows": [
    "जाँची गई पंक्तियाँ आयात करें",
    "சரிபார்த்த வரிகளை இறக்குமதி செய்க",
  ],
  "Valid completed rows": ["सही सफल पंक्तियाँ", "சரியான நிறைவுற்ற வரிகள்"],
  "Validation issues": ["जाँच की समस्याएँ", "சரிபார்ப்புச் சிக்கல்கள்"],
  "Identical duplicates removed": [
    "एक जैसी डुप्लिकेट हटाई",
    "ஒரே மாதிரி நகல்கள் நீக்கப்பட்டன",
  ],
  "Excluded statuses": ["हटाई गई स्थितियाँ", "விலக்கிய நிலைகள்"],
  "Conflicting IDs are excluded entirely. Review all issues before importing.":
    [
      "विरोधी ID पूरी तरह हटती हैं। आयात से पहले सभी समस्याएँ देखें।",
      "முரண்படும் ID முழுவதும் நீக்கப்படும். இறக்குமதிக்கு முன் சிக்கல்களைப் பார்க்கவும்.",
    ],
  "Download sample files": [
    "नमूना फाइलें डाउनलोड",
    "மாதிரிக் கோப்புகளைப் பதிவிறக்கவும்",
  ],
  "Valid sample": ["सही नमूना", "சரியான மாதிரி"],
  "Insufficient history": ["कम पुराना डेटा", "போதாத வரலாறு"],
  "Dirty data": ["समस्या वाला डेटा", "சிக்கலுள்ள தரவு"],
  "Positive follow-up": ["सुधार वाला अगला डेटा", "முன்னேற்றத் தொடர் தரவு"],
  "Negative follow-up": ["गिरावट वाला अगला डेटा", "சரிவுத் தொடர் தரவு"],
  "Coverage context": ["कवरेज की जानकारी", "தரவுப் பரப்புச் சூழல்"],
  "2 MB maximum. 10,000 rows. ISO timestamps with timezone. Amounts in rupees.":
    [
      "अधिकतम 2 MB, 10,000 पंक्तियाँ। टाइमज़ोन सहित ISO समय। राशि रुपये में।",
      "அதிகபட்சம் 2 MB, 10,000 வரிகள். நேரமண்டலத்துடன் ISO நேரம். தொகை ரூபாயில்.",
    ],
  "Importing clears prior coverage confirmations. Confirm them again.": [
    "आयात के बाद पुरानी कवरेज पुष्टि हटेगी। फिर पुष्टि करें।",
    "இறக்குமதி பழைய பரப்பு உறுதியை நீக்கும். மீண்டும் உறுதிப்படுத்தவும்.",
  ],
  "Choose one small experiment": [
    "एक छोटा प्रयोग चुनें",
    "ஒரு சிறிய முயற்சியைத் தேர்ந்தெடுக்கவும்",
  ],
  "Feasibility, not predicted demand.": [
    "यह संभव होने की जाँच है, माँग की भविष्यवाणी नहीं।",
    "இது சாத்தியக் கணக்கு; தேவை முன்னறிவிப்பு அல்ல.",
  ],
  "Investigate first": ["पहले जाँचें", "முதலில் ஆராயுங்கள்"],
  "Observe the window and record context. No customer offer.": [
    "समय देखें और जानकारी लिखें। ग्राहक ऑफर नहीं।",
    "நேரப்பகுதியைக் கவனித்து சூழலைப் பதிவு செய்யவும். வாடிக்கையாளர் சலுகை இல்லை.",
  ],
  "Promote existing offer": [
    "मौजूदा ऑफर दिखाएँ",
    "இருக்கும் சலுகையை விளம்பரப்படுத்தவும்",
  ],
  "Use the current selling price without a new discount.": [
    "नया डिस्काउंट दिए बिना मौजूदा कीमत रखें।",
    "புதிய தள்ளுபடியின்றி தற்போதைய விலையைப் பயன்படுத்து.",
  ],
  "Owner-defined discount": [
    "दुकानदार का तय डिस्काउंट",
    "வணிகர் நிர்ணயித்த தள்ளுபடி",
  ],
  "Test a bounded discount with explicit limits.": [
    "तय सीमा के अंदर डिस्काउंट आज़माएँ।",
    "வெளிப்படையான வரம்புடன் தள்ளுபடியைச் சோதிக்கவும்.",
  ],
  "Select action": ["विकल्प चुनें", "செயலைத் தேர்வு செய்க"],
  Selected: ["चुना गया", "தேர்ந்தெடுக்கப்பட்டது"],
  Blocked: ["रोका गया", "தடுக்கப்பட்டது"],
  Available: ["उपलब्ध", "கிடைக்கிறது"],
  "Item & economics": ["वस्तु और हिसाब", "பொருள் & பொருளாதாரம்"],
  "Item name (English)": [
    "वस्तु का नाम (अंग्रेज़ी)",
    "பொருள் பெயர் (ஆங்கிலம்)",
  ],
  "Item name (Hindi)": ["वस्तु का नाम (हिंदी)", "பொருள் பெயர் (இந்தி)"],
  "Item name (Tamil)": ["वस्तु का नाम (तमिल)", "பொருள் பெயர் (தமிழ்)"],
  "Item available": ["वस्तु उपलब्ध", "பொருள் கிடைக்கிறது"],
  "Selling price (₹)": ["बिक्री कीमत (₹)", "விற்பனை விலை (₹)"],
  "Variable cost (₹)": ["बदलने वाली लागत (₹)", "மாறும் செலவு (₹)"],
  "Discount (₹)": ["डिस्काउंट (₹)", "தள்ளுபடி (₹)"],
  "Additional cost per redemption (₹)": [
    "हर उपयोग की अतिरिक्त लागत (₹)",
    "ஒவ்வொரு பயன்பாட்டின் கூடுதல் செலவு (₹)",
  ],
  "Available quantity": ["उपलब्ध मात्रा", "கிடைக்கும் அளவு"],
  "Redemption limit": ["अधिकतम उपयोग", "பயன்பாட்டு வரம்பு"],
  "Discount budget (₹)": ["डिस्काउंट बजट (₹)", "தள்ளுபடி நிதி (₹)"],
  "Contribution floor (₹)": [
    "न्यूनतम योगदान (₹)",
    "குறைந்தபட்ச பங்களிப்பு (₹)",
  ],
  "Reference redemptions": ["संदर्भ उपयोग संख्या", "குறிப்பு பயன்பாடுகள்"],
  "Save economics": ["हिसाब सहेजें", "பொருளாதாரத்தைச் சேமிக்கவும்"],
  "Contribution per redemption": [
    "हर उपयोग का योगदान",
    "ஒரு பயன்பாட்டிற்கான பங்களிப்பு",
  ],
  "Maximum discount exposure": [
    "अधिकतम डिस्काउंट खर्च",
    "அதிகபட்ச தள்ளுபடிச் செலவு",
  ],
  "Before fixed costs. This does not establish overall profitability.": [
    "स्थिर खर्च से पहले। इससे कुल लाभ साबित नहीं होता।",
    "நிலையான செலவுகளுக்கு முன். இது மொத்த லாபத்தை நிரூபிக்காது.",
  ],
  "Scenario threshold": ["परिस्थिति की सीमा", "சூழ்நிலை வரம்பு"],
  "redemptions to preserve reference contribution": [
    "संदर्भ योगदान बनाए रखने के लिए उपयोग",
    "குறிப்புப் பங்களிப்பைத் தக்கவைக்கத் தேவையான பயன்பாடுகள்",
  ],
  "Assumes unchanged price, cost and product mix. This is not predicted demand.":
    [
      "कीमत, लागत और वस्तु मिश्रण समान मानता है। यह माँग का अनुमान नहीं।",
      "விலை, செலவு, பொருள் கலவை மாறாது எனக் கருதுகிறது. இது தேவை முன்னறிவிப்பு அல்ல.",
    ],
  "Unavailable items have no eligible offer.": [
    "अनुपलब्ध वस्तु का ऑफर योग्य नहीं।",
    "கிடைக்காத பொருளுக்கு தகுதியான சலுகை இல்லை.",
  ],
  "Contribution below your floor": [
    "योगदान आपकी सीमा से कम",
    "பங்களிப்பு உங்கள் வரம்புக்குக் கீழே",
  ],
  "Redemption limit exceeds stock": [
    "उपयोग सीमा स्टॉक से अधिक",
    "பயன்பாட்டு வரம்பு இருப்பை மீறுகிறது",
  ],
  "Discount exposure exceeds budget": [
    "डिस्काउंट खर्च बजट से अधिक",
    "தள்ளுபடிச் செலவு நிதியை மீறுகிறது",
  ],
  "Evidence is incomplete or no dip meets the threshold.": [
    "सबूत अधूरा है या गिरावट सीमा तक नहीं है।",
    "ஆதாரம் முழுமையில்லை அல்லது சரிவு வரம்பை எட்டவில்லை.",
  ],
  "Approve this experiment": [
    "इस प्रयोग को मंज़ूरी दें",
    "இந்த முயற்சியை ஒப்புக்கொள்ளவும்",
  ],
  "Approval readback": ["स्वीकृति का सार", "ஒப்புதல் விவரம்"],
  "I approve these exact terms.": [
    "मैं इन्हीं शर्तों को मंज़ूरी देता हूँ।",
    "இந்தத் துல்லியமான நிபந்தனைகளை ஒப்புக்கொள்கிறேன்.",
  ],
  Cancel: ["रद्द करें", "ரத்து செய்க"],
  "Confirm approval": ["मंज़ूरी की पुष्टि", "ஒப்புதலை உறுதி செய்க"],
  "Reject action": ["विकल्प अस्वीकार करें", "செயலை நிராகரிக்கவும்"],
  "Reason for rejection": ["अस्वीकार करने की वजह", "நிராகரிப்புக் காரணம்"],
  "Save rejection": ["अस्वीकृति सहेजें", "நிராகரிப்பைச் சேமிக்கவும்"],
  "No experiment yet": ["अभी कोई प्रयोग नहीं", "முயற்சி இன்னும் இல்லை"],
  "Choose and approve an action first.": [
    "पहले विकल्प चुनकर मंज़ूरी दें।",
    "முதலில் செயலைத் தேர்ந்து ஒப்புக்கொள்ளவும்.",
  ],
  "Approved terms": ["स्वीकृत शर्तें", "ஒப்புக்கொண்ட நிபந்தனைகள்"],
  "Prepare materials": ["सामग्री बनाएँ", "பொருட்களைத் தயாரிக்கவும்"],
  "Download counter poster": [
    "काउंटर पोस्टर डाउनलोड",
    "கவுண்டர் சுவரொட்டியைப் பதிவிறக்கவும்",
  ],
  "Download observation card": [
    "जाँच कार्ड डाउनलोड",
    "கவனிப்புக் குறிப்பைப் பதிவிறக்கவும்",
  ],
  "Materials created does not mean the experiment ran.": [
    "सामग्री बनने का मतलब प्रयोग चलना नहीं है।",
    "பொருட்கள் தயாரானதால் முயற்சி நடந்ததாகாது.",
  ],
  "I confirm this experiment ran": [
    "मैं पुष्टि करता हूँ कि प्रयोग चला",
    "இந்த முயற்சி நடந்ததை உறுதிப்படுத்துகிறேன்",
  ],
  "Mark as ran": ["चलाया गया दर्ज करें", "நடந்ததாகக் குறிக்கவும்"],
  Skip: ["छोड़ें", "தவிர்க்கவும்"],
  Stop: ["रोकें", "நிறுத்தவும்"],
  Draft: ["मसौदा", "வரைவு"],
  Approved: ["स्वीकृत", "ஒப்புதல்"],
  Prepared: ["तैयार", "தயார்"],
  Ran: ["चलाया गया", "நடந்தது"],
  Reviewed: ["समीक्षा हुई", "மதிப்பிடப்பட்டது"],
  Skipped: ["छोड़ा गया", "தவிர்க்கப்பட்டது"],
  Stopped: ["रोका गया", "நிறுத்தப்பட்டது"],
  "Approval invalidated by a newer revision.": [
    "नए संशोधन से पुरानी मंज़ूरी अमान्य।",
    "புதிய திருத்தம் பழைய ஒப்புதலைச் செல்லாததாக்கியது.",
  ],
  Expiry: ["समाप्ति", "காலாவதி"],
  "Maximum redemptions": ["अधिकतम उपयोग", "அதிகபட்ச பயன்பாடுகள்"],
  "One combo per redemption. While stock lasts.": [
    "हर उपयोग में एक कॉम्बो। स्टॉक रहने तक।",
    "ஒரு பயன்பாட்டிற்கு ஒரு காம்போ. இருப்பு உள்ளவரை.",
  ],
  "Customer messaging and payments are not executed.": [
    "ग्राहक संदेश और भुगतान नहीं भेजे जाते।",
    "வாடிக்கையாளர் செய்தி அல்லது பரிவர்த்தனை செய்யப்படாது.",
  ],
  "Review what happened": ["क्या हुआ, देखें", "நடந்ததை மதிப்பிடுங்கள்"],
  "Upload follow-up records": [
    "अगला डेटा अपलोड करें",
    "தொடர் பதிவுகளைப் பதிவேற்றவும்",
  ],
  "Original metric": ["मूल माप", "அசல் அளவீடு"],
  "Historical baseline": ["पुराना आधार", "முந்தைய அடிப்படை"],
  "Follow-up metric": ["अगला माप", "தொடர் அளவீடு"],
  "Change from original": ["मूल से बदलाव", "அசலிலிருந்து மாற்றம்"],
  "Change from baseline": ["आधार से बदलाव", "அடிப்படையிலிருந்து மாற்றம்"],
  "Full 4–6 PM coverage confirmed": [
    "शाम 4–6 बजे का पूरा डेटा पक्का",
    "மாலை 4–6 முழுத் தரவு உறுதி",
  ],
  "Open throughout 4–6 PM": [
    "शाम 4–6 बजे लगातार खुला",
    "மாலை 4–6 முழுவதும் திறந்திருந்தது",
  ],
  "Experiment actually ran": ["प्रयोग सच में चला", "முயற்சி உண்மையில் நடந்தது"],
  "Exceptional events or limitations": [
    "असाधारण घटनाएँ या सीमाएँ",
    "விதிவிலக்குகள் அல்லது வரம்புகள்",
  ],
  "Save outcome review": [
    "नतीजे की समीक्षा सहेजें",
    "முடிவு மதிப்பீட்டைச் சேமிக்கவும்",
  ],
  Improved: ["सुधार", "முன்னேற்றம்"],
  Deteriorated: ["गिरावट", "சரிவு"],
  Unchanged: ["बदलाव नहीं", "மாற்றமில்லை"],
  Inconclusive: ["निष्कर्ष नहीं", "முடிவு கூற இயலாது"],
  "Arithmetic comparison only. The offer cannot be credited with causing this change.":
    [
      "केवल गणितीय तुलना। बदलाव का कारण ऑफर था, यह नहीं कह सकते।",
      "கணித ஒப்பீடு மட்டும். இந்த மாற்றத்திற்குச் சலுகையே காரணம் எனக் கூற முடியாது.",
    ],
  "Comparability is limited by coverage, opening hours, weekday, data quality or exceptional events.":
    [
      "डेटा, खुलने के समय, वार, गुणवत्ता या असाधारण घटना से तुलना सीमित है।",
      "பரப்பு, திறப்பு நேரம், கிழமை, தரத் தரம் அல்லது விதிவிலக்கால் ஒப்பீடு வரம்புடையது.",
    ],
  "History remembers choices and outcomes, not improved predictions.": [
    "इतिहास विकल्प और नतीजे याद रखता है, बेहतर भविष्यवाणी का दावा नहीं।",
    "வரலாறு தேர்வுகளையும் முடிவுகளையும் நினைவில் வைக்கிறது; மேம்பட்ட முன்னறிவிப்பைக் கூறவில்லை.",
  ],
  "Confirm a spoken correction": [
    "बोला गया सुधार पक्का करें",
    "பேசிய திருத்தத்தை உறுதி செய்க",
  ],
  "Speak a correction": ["बोलकर सुधारें", "பேசித் திருத்தவும்"],
  "Record up to 15 seconds. Nothing changes until you confirm.": [
    "15 सेकंड तक बोलें। पुष्टि के बिना कुछ नहीं बदलेगा।",
    "15 வினாடிகள் வரை பேசவும். உறுதி செய்யும்வரை மாற்றமில்லை.",
  ],
  "Start recording": ["रिकॉर्ड करें", "பதிவு தொடங்கு"],
  "Stop recording": ["रिकॉर्ड रोकें", "பதிவு நிறுத்து"],
  "Type a correction instead": ["सुधार लिखें", "திருத்தத்தை எழுதவும்"],
  "Interpret correction": ["सुधार समझें", "திருத்தத்தைப் புரிந்துகொள்"],
  "Apply correction": ["सुधार लागू करें", "திருத்தத்தைப் பயன்படுத்து"],
  "I heard": ["मैंने सुना", "நான் கேட்டது"],
  Budget: ["बजट", "நிதி"],
  "Closing time": ["बंद होने का समय", "மூடும் நேரம்"],
  Availability: ["उपलब्धता", "கிடைக்கும் நிலை"],
  "This is not an approval. Confirm the change explicitly.": [
    "यह मंज़ूरी नहीं है। बदलाव की साफ पुष्टि करें।",
    "இது ஒப்புதல் அல்ல. மாற்றத்தைத் தெளிவாக உறுதி செய்க.",
  ],
  "Could not identify one safe correction. Use the form.": [
    "एक स्पष्ट सुरक्षित सुधार नहीं समझ आया। फॉर्म भरें।",
    "ஒரு தெளிவான பாதுகாப்பான திருத்தம் தெரியவில்லை. படிவத்தைப் பயன்படுத்து.",
  ],
  "Microphone unavailable. Use the text field.": [
    "माइक्रोफ़ोन उपलब्ध नहीं। लिखें।",
    "ஒலிவாங்கி கிடைக்கவில்லை. எழுத்துப் புலத்தைப் பயன்படுத்து.",
  ],
  "Settings & provider": ["सेटिंग और सेवा", "அமைப்பு & சேவை"],
  "Sarvam configuration": ["Sarvam सेटअप", "Sarvam அமைப்பு"],
  "Configured, live check pending": [
    "सेटअप है, लाइव जाँच बाकी",
    "அமைக்கப்பட்டது, நேரடி சோதனை நிலுவை",
  ],
  "Not configured": ["सेटअप नहीं", "அமைக்கப்படவில்லை"],
  "Organiser allocation: 500 credits (reported). Unit, current balance, eligibility and expiry are unverified.":
    [
      "आयोजक के 500 क्रेडिट (बताए गए)। इकाई, मौजूदा शेष, पात्रता और समाप्ति सत्यापित नहीं।",
      "அமைப்பாளர் வழங்கிய 500 கிரெடிட்கள் (தெரிவிக்கப்பட்டது). அலகு, இருப்பு, தகுதி, காலாவதி சரிபார்க்கப்படவில்லை.",
    ],
  "Server-side calls only. No automatic retries. Daily application limit is not a provider balance.":
    [
      "केवल सर्वर से कॉल। अपने-आप दोबारा प्रयास नहीं। ऐप की दैनिक सीमा प्रदाता का शेष नहीं है।",
      "சேவையக அழைப்புகள் மட்டும். தானியங்கு மீள்முயற்சி இல்லை. தினசரி செயலி வரம்பு சேவை இருப்பு அல்ல.",
    ],
  "Reset demo": ["डेमो रीसेट", "விளக்கத்தை மீட்டமைக்கவும்"],
  "Reset clears this workspace’s saved records. Download an export first.": [
    "रीसेट से इस कार्यक्षेत्र के रिकॉर्ड हटेंगे। पहले डाउनलोड करें।",
    "மீட்டமைப்பு இந்தப் பணியிடப் பதிவுகளை நீக்கும். முதலில் ஏற்றுமதி செய்க.",
  ],
  "Confirm reset": ["रीसेट पक्का करें", "மீட்டமைப்பை உறுதி செய்க"],
  Close: ["बंद करें", "மூடு"],
  Back: ["वापस", "பின்செல்"],
  Continue: ["आगे", "தொடர்க"],
  Unknown: ["अज्ञात", "தெரியவில்லை"],
  "No forecast": ["पूर्वानुमान नहीं", "முன்னறிவிப்பு இல்லை"],
  "Before fixed costs": ["स्थिर खर्च से पहले", "நிலையான செலவுக்கு முன்"],
  "Saved experiment": ["सहेजा हुआ प्रयोग", "சேமித்த முயற்சி"],
  Limit: ["सीमा", "வரம்பு"],
  Row: ["पंक्ति", "வரி"],
  Reason: ["वजह", "காரணம்"],
  "Source file": ["स्रोत फाइल", "மூலக் கோப்பு"],
  "Original proposal": ["मूल प्रस्ताव", "அசல் முன்மொழிவு"],
  "All times Asia/Kolkata": [
    "सभी समय Asia/Kolkata",
    "எல்லா நேரமும் Asia/Kolkata",
  ],
  "Server storage is isolated by signed-in owner or private demo-session cookie. Keep an export.":
    [
      "सर्वर डेटा खाते या निजी डेमो कुकी से अलग रहता है। निर्यात रखें।",
      "சேவையகத் தரவு கணக்கு அல்லது தனி விளக்கக் குக்கி மூலம் பிரிக்கப்பட்டுள்ளது. ஏற்றுமதியை வைத்திருங்கள்.",
    ],
  fileSize: ["फाइल 2 MB से बड़ी है।", "கோப்பு 2 MB-ஐ மீறுகிறது."],
  rowLimit: ["अधिकतम 10,000 पंक्तियाँ।", "அதிகபட்சம் 10,000 வரிகள்."],
  csvSyntax: ["CSV में गलत उद्धरण हैं।", "CSV மேற்கோள்கள் தவறாக உள்ளன."],
  emptyCsv: ["CSV में हेडर और डेटा चाहिए।", "CSV தலைப்பும் தரவும் தேவை."],
  duplicateHeaders: [
    "कॉलम के नाम दोहराए गए हैं।",
    "நெடுவரிசைப் பெயர்கள் மீண்டும் உள்ளன.",
  ],
  mappingRequired: [
    "चार अलग कॉलम चुनें।",
    "நான்கு தனி நெடுவரிசைகளைத் தேர்ந்தெடுக்கவும்.",
  ],
  noValidRows: [
    "कोई सही सफल रिकॉर्ड नहीं।",
    "சரியான நிறைவுற்ற பதிவுகள் இல்லை.",
  ],
  invalidInput: [
    "सभी फील्ड, तारीख, सीमा और कारण जाँचें।",
    "புலங்கள், தேதிகள், வரம்புகள், காரணங்களைச் சரிபார்க்கவும்.",
  ],
  staleVersion: [
    "कार्यक्षेत्र बदल गया। रीफ्रेश करके दोबारा देखें।",
    "பணியிடம் மாறியுள்ளது. புதுப்பித்து மீண்டும் பாருங்கள்.",
  ],
  staleApproval: [
    "यह रसीद पुरानी है। मौजूदा संशोधन देखें।",
    "இந்த ரசீது பழையது. தற்போதைய திருத்தத்தைப் பாருங்கள்.",
  ],
  duplicateExperiment: [
    "इस संशोधन का प्रयोग पहले से सहेजा है।",
    "இந்தத் திருத்தத்திற்கான முயற்சி ஏற்கெனவே உள்ளது.",
  ],
  ineligible: [
    "सबूत या आर्थिक सीमाएँ इस विकल्प को रोकती हैं।",
    "ஆதாரம் அல்லது பொருளாதார வரம்பு இந்தத் தேர்வைத் தடுக்கிறது.",
  ],
  transition: [
    "यह स्थिति बदलाव अभी मान्य नहीं।",
    "இந்த நிலைமாற்றம் இப்போது செல்லாது.",
  ],
  confirmRun: [
    "पहले सामग्री तैयार करें और चलने की पुष्टि करें।",
    "முதலில் பொருட்களைத் தயாரித்து நடந்ததை உறுதிப்படுத்தவும்.",
  ],
  followupDate: [
    "अगली तारीख मूल तारीख के बाद होनी चाहिए।",
    "தொடர் தேதி அசல் தேதிக்குப் பிறகு இருக்க வேண்டும்.",
  ],
  notFound: ["रिकॉर्ड नहीं मिला।", "பதிவு கிடைக்கவில்லை."],
  historyLimit: [
    "डेमो की इतिहास सीमा पूरी। निर्यात करके रीसेट करें।",
    "விளக்க வரலாற்று வரம்பு எட்டியது. ஏற்றுமதி செய்து மீட்டமைக்கவும்.",
  ],
  network: [
    "सर्वर से संपर्क नहीं। डेटा नहीं सहेजा गया।",
    "சேவையகத் தொடர்பில்லை. தரவு சேமிக்கப்படவில்லை.",
  ],
  rateLimit: [
    "दैनिक ऐप सीमा पूरी या अनुरोध चल रहा है। बाद में कोशिश करें।",
    "தினசரி செயலி வரம்பு எட்டியது அல்லது அழைப்பு நடக்கிறது. பின்னர் முயல்க.",
  ],
  columns: ["कॉलम संख्या गलत", "நெடுவரிசை எண்ணிக்கை தவறு"],
  missing: ["ज़रूरी मान गायब", "தேவையான மதிப்பு இல்லை"],
  idLength: ["ID बहुत लंबी", "ID மிக நீளம்"],
  conflict: ["विरोधी ID", "முரண்படும் ID"],
  date: ["गलत या अस्पष्ट समय", "தவறான அல்லது தெளிவற்ற நேரம்"],
  negative: ["ऋण राशि हटाई", "எதிர்மறைத் தொகை விலக்கப்பட்டது"],
  amount: ["गलत राशि", "தவறான தொகை"],
  status: ["अज्ञात स्थिति", "தெரியாத நிலை"],
  sampleLoaded: ["कृत्रिम डेटा लोड किया", "செயற்கைத் தரவு ஏற்றப்பட்டது"],
  uploadChanged: [
    "अपलोड बदला, कवरेज अज्ञात",
    "பதிவேற்றம் மாறியது, பரப்பு தெரியவில்லை",
  ],
  revisionChanged: ["नए संशोधन से रोका", "புதிய திருத்தத்தால் நிறுத்தப்பட்டது"],
  merchantApproved: ["दुकानदार ने मंज़ूरी दी", "வணிகர் ஒப்புக்கொண்டார்"],
  merchantConfirmed: [
    "दुकानदार ने चलने की पुष्टि की",
    "வணிகர் நடந்ததை உறுதிப்படுத்தினார்",
  ],
  merchantAction: ["दुकानदार का निर्णय", "வணிகர் முடிவு"],
  arithmeticOnly: [
    "नतीजा दर्ज, कारण साबित नहीं",
    "முடிவு பதிவு, காரணம் நிரூபிக்கப்படவில்லை",
  ],
  "above median": ["मध्यक से अधिक", "இடைநிலைக்கு மேலே"],
  "Approved experiment": ["स्वीकृत प्रयोग", "ஒப்புக்கொண்ட முயற்சி"],
  "Recorded payments": ["दर्ज भुगतान", "பதிவான பரிவர்த்தனைகள்"],
  "Uploaded records": ["अपलोड किए रिकॉर्ड", "பதிவேற்றிய பதிவுகள்"],
  "Counter offer": ["काउंटर ऑफर", "கவுண்டர் சலுகை"],
  "Not approved": ["मंज़ूरी नहीं", "ஒப்புதல் இல்லை"],
  "Save economics before approval.": [
    "मंज़ूरी से पहले हिसाब सहेजें।",
    "ஒப்புதலுக்கு முன் பொருளாதாரத்தைச் சேமிக்கவும்.",
  ],
  "Sarvam selects the explanation focus. Validated templates supply every figure.":
    [
      "Sarvam सवाल का विषय चुनता है। जाँचे टेम्पलेट सभी आँकड़े देते हैं।",
      "Sarvam விளக்கத் தலைப்பைத் தேர்கிறது. சரிபார்த்த வார்ப்புருக்கள் எல்லா எண்களையும் தருகின்றன.",
    ],
  storageUnavailable: [
    "डेटा स्टोरेज उपलब्ध नहीं।",
    "தரவுச் சேமிப்பு கிடைக்கவில்லை.",
  ],
};
const englishCodes: Record<string, string> = {
  sampleLoaded: "Synthetic dataset loaded",
  uploadChanged: "Upload changed. Coverage requires confirmation.",
  revisionChanged: "Stopped after a receipt revision",
  merchantApproved: "Merchant approved the terms",
  merchantConfirmed: "Merchant confirmed execution",
  merchantAction: "Merchant decision",
  arithmeticOnly: "Outcome recorded. Causality unknown.",
  fileSize: "The file exceeds 2 MB.",
  rowLimit: "Maximum 10,000 rows.",
  csvSyntax: "Invalid CSV quoting.",
  emptyCsv: "CSV needs a header and data rows.",
  duplicateHeaders: "Duplicate column names.",
  mappingRequired: "Map four distinct columns.",
  noValidRows: "No valid completed rows.",
  invalidInput: "Check all fields, dates, limits and reasons.",
  staleVersion: "Workspace changed. Refresh and review again.",
  staleApproval: "This receipt is stale. Review the current revision.",
  duplicateExperiment: "An experiment already exists for this revision.",
  ineligible: "Evidence or economic limits block this choice.",
  transition: "This status change is not valid now.",
  confirmRun: "Prepare materials and confirm the experiment ran.",
  followupDate: "Follow-up must be later than the original date.",
  notFound: "Record not found.",
  historyLimit: "Demo history limit reached. Export and reset.",
  network: "Server unavailable. Your change was not saved.",
  rateLimit:
    "Application request limit reached or request already running. Try later.",
  storageUnavailable: "Server storage unavailable.",
  columns: "Wrong column count",
  missing: "Required value missing",
  idLength: "ID too long",
  conflict: "Conflicting ID",
  date: "Invalid or ambiguous timestamp",
  negative: "Negative amount excluded",
  amount: "Invalid amount",
  status: "Unknown status",
};
export function tr(lang: Lang, key: string) {
  return lang === "en-IN"
    ? englishCodes[key] || key
    : catalog[key]?.[lang === "hi-IN" ? 0 : 1] || key;
}
export function periodLabel(lang: Lang, state: string, count?: number | null) {
  const k =
    state === "eligible"
      ? count === 0
        ? "Open, zero recorded payments"
        : "Included"
      : state === "closed"
        ? "Closed"
        : state === "partial"
          ? "Partial opening"
          : state === "excluded"
            ? "Merchant exclusion"
            : "Coverage unknown";
  return tr(lang, k);
}
export function briefing(a: Analysis, c: Context, l: Lang, focus = "summary") {
  const current = a.current.count ?? "—",
    baseline = a.baseline ?? "—";
  if (focus === "dates")
    return l === "hi-IN"
      ? `हमने पिछले उन्हीं वारों में शाम 4 से 6 बजे की तुलना की। ${a.included.length} दिन शामिल हैं: ${a.included.map((x) => x.date).join(", ")}। केवल खुले और पूरी कवरेज वाले दिन शामिल हैं। कम से कम 3 दिन चाहिए। यह सांख्यिकीय महत्व का प्रमाण नहीं।`
      : l === "ta-IN"
        ? `முந்தைய அதே கிழமைகளில் மாலை 4 முதல் 6 வரை ஒப்பிட்டோம். ${a.included.length} நாட்கள் சேர்க்கப்பட்டன: ${a.included.map((x) => x.date).join(", ")}. திறந்திருந்த, முழுப் பரப்புள்ள நாட்கள் மட்டும். குறைந்தது 3 நாட்கள் தேவை. இது புள்ளியியல் உறுதி அல்ல.`
        : `We compare earlier matching weekdays from 4–6 PM. ${a.included.length} periods are included: ${a.included.map((x) => x.date).join(", ")}. Only fully open windows with confirmed coverage qualify. The minimum is 3 periods. This does not establish statistical significance.`;
  if (focus === "missing")
    return l === "hi-IN"
      ? "इस फाइल से नकद, ग्राहक संख्या, वस्तु बिक्री, स्टॉक या लाभ नहीं पता चलता। समय, कवरेज और लागत दुकानदार की जानकारी है। गिरावट का कारण पता नहीं है।"
      : l === "ta-IN"
        ? "இந்தக் கோப்பு ரொக்கம், வாடிக்கையாளர் எண்ணிக்கை, பொருள் விற்பனை, இருப்பு அல்லது லாபத்தைக் காட்டாது. நேரம், பரப்பு, செலவு வணிகர் வழங்கியவை. சரிவின் காரணம் தெரியவில்லை."
        : "These records do not show cash, customer count, item sales, stock or profit. Hours, coverage and costs are merchant-provided. The cause of a dip is unknown.";
  if (focus === "economics") {
    const e = economics(c.offer, "discount");
    return l === "hi-IN"
      ? `हर उपयोग: ${money(c.offer.price)} घटा ${money(c.offer.discount)} घटा ${money(c.offer.cost)} घटा अतिरिक्त ${money(c.offer.additional)} = ${money(e.contribution)}। अधिकतम डिस्काउंट खर्च ${money(e.exposure)}। ${tr(l, e.eligible ? "Eligible" : "Blocked")}। स्थिर खर्च शामिल नहीं। यह माँग का अनुमान नहीं।`
      : l === "ta-IN"
        ? `ஒரு பயன்பாடு: ${money(c.offer.price)} கழித்து ${money(c.offer.discount)} கழித்து ${money(c.offer.cost)} கழித்து கூடுதல் ${money(c.offer.additional)} = ${money(e.contribution)}. அதிகபட்ச தள்ளுபடிச் செலவு ${money(e.exposure)}. ${tr(l, e.eligible ? "Eligible" : "Blocked")}. நிலையான செலவு சேர்க்கப்படவில்லை. இது தேவை முன்னறிவிப்பு அல்ல.`
        : `Per redemption: ${money(c.offer.price)} minus ${money(c.offer.discount)} minus ${money(c.offer.cost)} minus additional ${money(c.offer.additional)} = ${money(e.contribution)}. Maximum discount exposure is ${money(e.exposure)}. ${e.eligible ? "Within entered limits." : "Blocked by entered limits."} Before fixed costs. This is not predicted demand.`;
  }
  if (!a.eligible)
    return l === "hi-IN"
      ? `शाम 4–6 बजे की पूरी तुलना नहीं हो सकती। ${periodLabel(l, a.current.state)}। योग्य पुराने दिन ${a.included.length}। पहले समय और कवरेज जाँचें। ऑफर की सलाह रोक दी गई है।`
      : l === "ta-IN"
        ? `மாலை 4–6 முழு ஒப்பீடு செய்ய முடியவில்லை. ${periodLabel(l, a.current.state)}. தகுதியான முந்தைய நாட்கள் ${a.included.length}. முதலில் நேரம் மற்றும் பரப்பைச் சரிபார்க்கவும். சலுகை ஆலோசனை திரும்பப் பெறப்பட்டது.`
        : `The complete 4–6 PM comparison is unavailable. ${periodLabel(l, a.current.state)}. ${a.included.length} eligible historical periods. Check hours and coverage first. Offer advice is withdrawn.`;
  return l === "hi-IN"
    ? `${c.date}, शाम 4–6 बजे ${current} सफल भुगतान। ${a.included.length} पुराने मिलते दिनों का मध्यक ${baseline} है। ${a.flag ? "यह तय सीमा से नीचे है। पहले जानकारी जाँचें, फिर सीमित प्रयोग चुनें।" : "गिरावट तय सीमा तक नहीं है। पहले जाँच वाला विकल्प रखें।"} कारण साबित नहीं है। लक्ष्य: ${tr(l, c.goal === "count" ? "Increase payment count" : "Increase average payment value")}।`
    : l === "ta-IN"
      ? `${c.date}, மாலை 4–6 மணிக்கு ${current} நிறைவுற்ற பரிவர்த்தனைகள். ${a.included.length} முந்தைய பொருந்தும் நாட்களின் இடைநிலை ${baseline}. ${a.flag ? "இது குறிக்கும் வரம்புக்குக் கீழே. முதலில் சூழலைச் சரிபார்த்து வரம்புள்ள முயற்சியைத் தேர்வு செய்யவும்." : "சரிவு குறிக்கும் வரம்பை எட்டவில்லை. முதலில் ஆராயும் தேர்வை வைத்திருங்கள்."} காரணம் நிரூபிக்கப்படவில்லை. இலக்கு: ${tr(l, c.goal === "count" ? "Increase payment count" : "Increase average payment value")}.`
      : `On ${c.date}, 4–6 PM recorded ${current} completed payments against a median of ${baseline} across ${a.included.length} matching earlier periods. ${a.flag ? "This is below your flagging threshold. Check context before choosing a bounded experiment." : "No dip meets your threshold. Keep the investigation option."} The cause is unknown. Goal: ${tr(l, c.goal === "count" ? "Increase payment count" : "Increase average payment value")}.`;
}
export function approvedTerms(e: Experiment, l: Lang) {
  const c = e.context,
    o = c.offer,
    ec = economics(o, e.action),
    name = o.name[l];
  if (e.action === "investigate")
    return `${tr(l, "Investigate first")} · ${c.testDate} · 16:00–18:00 · ${tr(l, "Observe the window and record context. No customer offer.")}`;
  return `${name} · ${money(o.price - ec.discount)} · ${c.testDate} · 16:00–18:00 (Asia/Kolkata) · ${tr(l, "Maximum redemptions")}: ${o.limit} · ${tr(l, "Expiry")}: ${c.testDate} 18:00 · ${tr(l, "One combo per redemption. While stock lasts.")}`;
}
export const translatedKeys = Object.keys(catalog);
