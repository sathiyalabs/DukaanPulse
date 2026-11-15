/**
 * Online Climate & Weather Module for DukaanPulse
 * Connects to live meteorological data via Open-Meteo API
 * and generates retail demand forecasts for tea shops & local dukaans.
 */

export type WeatherCondition = "rain" | "hot" | "cloudy" | "pleasant";

export type LiveWeatherData = {
  tempC: number;
  condition: WeatherCondition;
  conditionLabelTa: string;
  conditionLabelEn: string;
  emoji: string;
  precipitationMm: number;
  humidity: number;
  windSpeedKmH: number;
  city: string;
  source: "online" | "simulated" | "fallback";
  updatedAt: string;
};

// Preset configurations for instant offline demonstration and testing
export const WEATHER_PRESETS: Record<WeatherCondition, LiveWeatherData> = {
  rain: {
    tempC: 24.2,
    condition: "rain",
    conditionLabelTa: "மழை பெய்கிறது / குளிர்",
    conditionLabelEn: "Rainy & Cold Weather",
    emoji: "🌧️",
    precipitationMm: 3.5,
    humidity: 88,
    windSpeedKmH: 18.2,
    city: "Chennai (சென்னை)",
    source: "simulated",
    updatedAt: "Live",
  },
  hot: {
    tempC: 34.6,
    condition: "hot",
    conditionLabelTa: "கடும் வெயில் (Summer Heat)",
    conditionLabelEn: "Hot & Sunny",
    emoji: "☀️",
    precipitationMm: 0.0,
    humidity: 46,
    windSpeedKmH: 11.5,
    city: "Chennai (சென்னை)",
    source: "simulated",
    updatedAt: "Live",
  },
  cloudy: {
    tempC: 28.4,
    condition: "cloudy",
    conditionLabelTa: "மேகமூட்டம் (Overcast)",
    conditionLabelEn: "Cloudy & Humid",
    emoji: "⛅",
    precipitationMm: 0.1,
    humidity: 72,
    windSpeedKmH: 14.0,
    city: "Chennai (சென்னை)",
    source: "simulated",
    updatedAt: "Live",
  },
  pleasant: {
    tempC: 26.8,
    condition: "pleasant",
    conditionLabelTa: "மிதமான இதமான வானிலை",
    conditionLabelEn: "Pleasant & Breezy",
    emoji: "🍃",
    precipitationMm: 0.0,
    humidity: 58,
    windSpeedKmH: 12.0,
    city: "Chennai (சென்னை)",
    source: "simulated",
    updatedAt: "Live",
  },
};

/**
 * Fetch live online climate & weather from Open-Meteo REST API
 * (Defaults to Chennai / Tamil Nadu coordinates: 13.0827° N, 80.2707° E)
 */
export async function fetchLiveOnlineWeather(
  latitude = 13.0827,
  longitude = 80.2707,
  cityName = "Chennai (சென்னை)",
): Promise<LiveWeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Weather fetch HTTP ${res.status}`);
    const data = (await res.json()) as { current?: Record<string, unknown> };
    const current = data.current || {};

    const temp = Number(current.temperature_2m ?? 29);
    const rain = Number(current.precipitation ?? 0);
    const code = Number(current.weather_code ?? 0);
    const humidity = Number(current.relative_humidity_2m ?? 60);
    const wind = Number(current.wind_speed_10m ?? 10);

    // Classify weather condition
    let condition: WeatherCondition = "pleasant";
    let labelTa = "மிதமான இதமான வானிலை";
    let labelEn = "Pleasant Weather";
    let emoji = "🍃";

    if (rain > 0.2 || code >= 50) {
      condition = "rain";
      labelTa = "மழை பெய்கிறது / குளிர்";
      labelEn = "Rainy & Cool";
      emoji = "🌧️";
    } else if (temp >= 32) {
      condition = "hot";
      labelTa = "கடும் வெயில்";
      labelEn = "Hot Summer Sunny";
      emoji = "☀️";
    } else if (code >= 2 || humidity >= 75) {
      condition = "cloudy";
      labelTa = "மேகமூட்டம் / ஈரப்பதம்";
      labelEn = "Cloudy / Humid";
      emoji = "⛅";
    }

    const timeStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

    return {
      tempC: Math.round(temp * 10) / 10,
      condition,
      conditionLabelTa: labelTa,
      conditionLabelEn: labelEn,
      emoji,
      precipitationMm: rain,
      humidity,
      windSpeedKmH: wind,
      city: cityName,
      source: "online",
      updatedAt: timeStr,
    };
  } catch (err) {
    console.warn("Live weather online fetch failed or timed out, using fallback:", err);
    return {
      ...WEATHER_PRESETS.cloudy,
      source: "fallback",
      updatedAt: "Fallback (Offline)",
    };
  }
}

/**
 * Intelligent Retail Guidance combining Weather + Time-of-Day
 */
export function getWeatherAndTimeAdvice(
  weather: LiveWeatherData,
  hour = new Date().getHours(),
  isTamil = true,
): { title: string; adviceText: string; recommendedItems: string[]; alertTone: "info" | "warn" | "accent" } {
  // Morning Rush (07:00 - 11:00)
  if (hour >= 7 && hour < 11) {
    if (weather.condition === "rain") {
      return {
        title: isTamil ? "காலை மழை நேர உத்தி (Rainy Morning)" : "Rainy Morning Strategy",
        adviceText: isTamil
          ? `இப்போது மழை பெய்கிறது (${weather.tempC}°C). அலுவலகம் செல்லும் வாடிக்கையாளர்கள் சூடான இஞ்சி டீ, மசாலா டீ மற்றும் சூடான மெதுவடைக்கு முன்னுரிமை கொடுப்பார்கள். சூடாக தயாரித்து வையுங்கள்.`
          : `Raining outside (${weather.tempC}°C). Commuters will seek hot Ginger Tea, Masala Tea, and fresh Vadas. Keep fresh hot batches ready.`,
        recommendedItems: ["Ginger Tea (இஞ்சி டீ)", "Masala Tea (மசாலா டீ)", "Medu Vada (மெதுவடை)"],
        alertTone: "accent",
      };
    }
    return {
      title: isTamil ? "காலை பீக் வேளை (Morning Peak Rush)" : "Morning Peak Hours",
      adviceText: isTamil
        ? `காலை வேளையில் பில்டர் காபி & மசாலா டீ விற்பனை உச்சத்தில் இருக்கும். இட்லி & மெதுவடை பார்சல் தயார் செய்து வைக்கவும்.`
        : `Morning peak rush: Filter Coffee and Masala Tea are top sellers. Keep takeaway parcels ready.`,
      recommendedItems: ["Filter Coffee (பில்டர் காபி)", "Masala Tea (மசாலா டீ)", "Medu Vada (மெதுவடை)"],
      alertTone: "info",
    };
  }

  // Mid-Day Slump / Dead Hours (11:00 - 15:00)
  if (hour >= 11 && hour < 15) {
    if (weather.condition === "hot" || weather.tempC >= 31) {
      return {
        title: isTamil ? "கடும் வெயில் & மதிய மந்தம் (Hot Summer Slump)" : "Hot Afternoon Slump",
        adviceText: isTamil
          ? `மதியம் சுட்டெரிக்கும் வெயில் (${weather.tempC}°C)! சூடான டீ விற்பனை 40% குறைய வாய்ப்புள்ளது. குளிர்ந்த ரோஸ் மில்க், பாதாம் பால், சோடா ஆகியவற்றை கடை முகப்பில் வையுங்கள். ₹5 சலுகை அறிவிக்கலாம்.`
          : `Scorching summer heat (${weather.tempC}°C)! Hot beverage sales drop by ~40%. Showcase chilled Rose Milk, Badam Milk, and Cool Drinks upfront with a ₹5 discount.`,
        recommendedItems: ["Cold Rose Milk (ரோஸ் மில்க்)", "Cold Badam Milk (பாதாம் பால்)", "Biscuits (பிஸ்கட்)"],
        alertTone: "warn",
      };
    }
    return {
      title: isTamil ? "மதிய நேர மந்தமான வேளை (Afternoon Lull)" : "Afternoon Lull Hours",
      adviceText: isTamil
        ? `மதிய மந்தமான நேரத்தை (11-15) சமாளிக்க "பன் பட்டர் ஜாம் + டீ @ ₹35" காம்போ சலுகை கொடுத்தால் வாடிக்கையாளர் எண்ணிக்கை அதிகரிக்கும்.`
        : `Overcome afternoon dead hours with a lunch snack combo: "Bun Butter Jam + Tea @ ₹35" to attract nearby shoppers.`,
        recommendedItems: ["Bun Butter Jam (பன் பட்டர் ஜாம்)", "Cool Drinks (கூல் டிரிங்க்ஸ்)", "Butter Biscuits"],
        alertTone: "warn",
      };
  }

  // Evening Snack Rush (15:00 - 19:00)
  if (hour >= 15 && hour < 19) {
    if (weather.condition === "rain" || weather.precipitationMm > 0) {
      return {
        title: isTamil ? "🌧️ மழைக்கால மாலை நேர பம்பர் விற்பனை (Rainy Evening Rush)" : "Rainy Evening Rush",
        adviceText: isTamil
          ? `மழை பெய்யும் மாலை வேளையில் (${weather.tempC}°C) சமோசா, வெங்காய பஜ்ஜி மற்றும் சுடச்சுட இஞ்சி டீக்கான தேவை 60% அதிகரிக்கும்! கூடுதல் சமோசா பொரித்து வையுங்கள்.`
          : `Heavy rain during evening snack time (${weather.tempC}°C)! Samosa, Bajji, and hot Ginger Tea demand surges by up to 60%. Fry extra snacks immediately.`,
        recommendedItems: ["Hot Samosa (சூடான சமோசா)", "Ginger Tea (இஞ்சி டீ)", "Onion Bajji (வெங்காய பஜ்ஜி)"],
        alertTone: "accent",
      };
    }
    return {
      title: isTamil ? "மாலை நேர சிற்றுண்டி வேளை (Evening Snack Time)" : "Evening Snack Time",
      adviceText: isTamil
        ? `மாலை நேரத்தில் அலுவலகம், பள்ளி முடிந்து வருபவர்களுக்கு சமோசா + மசாலா டீ காம்போ (₹25) வழங்கினால் பில் மதிப்பு உயரும்.`
        : `Prime evening snack time: Offer Samosa + Masala Tea combo at ₹25 to drive higher basket size.`,
      recommendedItems: ["Hot Samosa (சமோசா)", "Masala Tea (மசாலா டீ)", "Veg Puff (வெஜ் பஃப்)"],
      alertTone: "accent",
    };
  }

  // Night Wind-down (19:00 - 22:00)
  return {
    title: isTamil ? "இரவு நேர விற்பனை (Night Hours)" : "Night Hours",
    adviceText: isTamil
      ? `இரவு நேரத்தில் சூடான பால், இஞ்சி டீ மற்றும் பேக்கரி பிஸ்கட்கள் அதிகம் விக்கும். எஞ்சிய ஸ்நாக்ஸ்களை தள்ளுபடியில் விற்று முடிக்கவும்.`
      : `Night wind-down: Hot Milk, Ginger Tea, and Biscuits sell steadily. Clear remaining snacks before closing.`,
    recommendedItems: ["Hot Milk (சூடான பால்)", "Ginger Tea (இஞ்சி டீ)", "Butter Biscuits"],
    alertTone: "info",
  };
}
