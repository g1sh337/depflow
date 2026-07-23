/** Derive the flag emoji from a 2-letter ISO country code (KR -> 🇰🇷). */
export function flagFromCode(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🌐";
  return cc.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  ru: string;
  en: string;
}

/** Practical country list for affiliate traffic — CIS, Europe, MENA, Asia, Africa, Americas. */
export const COUNTRIES: Country[] = [
  // CIS
  { code: "RU", ru: "Россия", en: "Russia" },
  { code: "UA", ru: "Украина", en: "Ukraine" },
  { code: "BY", ru: "Беларусь", en: "Belarus" },
  { code: "KZ", ru: "Казахстан", en: "Kazakhstan" },
  { code: "UZ", ru: "Узбекистан", en: "Uzbekistan" },
  { code: "KG", ru: "Киргизия", en: "Kyrgyzstan" },
  { code: "TJ", ru: "Таджикистан", en: "Tajikistan" },
  { code: "TM", ru: "Туркмения", en: "Turkmenistan" },
  { code: "AM", ru: "Армения", en: "Armenia" },
  { code: "AZ", ru: "Азербайджан", en: "Azerbaijan" },
  { code: "GE", ru: "Грузия", en: "Georgia" },
  { code: "MD", ru: "Молдова", en: "Moldova" },
  // Europe
  { code: "GB", ru: "Великобритания", en: "United Kingdom" },
  { code: "DE", ru: "Германия", en: "Germany" },
  { code: "FR", ru: "Франция", en: "France" },
  { code: "IT", ru: "Италия", en: "Italy" },
  { code: "ES", ru: "Испания", en: "Spain" },
  { code: "PT", ru: "Португалия", en: "Portugal" },
  { code: "PL", ru: "Польша", en: "Poland" },
  { code: "NL", ru: "Нидерланды", en: "Netherlands" },
  { code: "BE", ru: "Бельгия", en: "Belgium" },
  { code: "SE", ru: "Швеция", en: "Sweden" },
  { code: "NO", ru: "Норвегия", en: "Norway" },
  { code: "FI", ru: "Финляндия", en: "Finland" },
  { code: "DK", ru: "Дания", en: "Denmark" },
  { code: "IE", ru: "Ирландия", en: "Ireland" },
  { code: "AT", ru: "Австрия", en: "Austria" },
  { code: "CH", ru: "Швейцария", en: "Switzerland" },
  { code: "CZ", ru: "Чехия", en: "Czechia" },
  { code: "SK", ru: "Словакия", en: "Slovakia" },
  { code: "HU", ru: "Венгрия", en: "Hungary" },
  { code: "RO", ru: "Румыния", en: "Romania" },
  { code: "BG", ru: "Болгария", en: "Bulgaria" },
  { code: "GR", ru: "Греция", en: "Greece" },
  { code: "RS", ru: "Сербия", en: "Serbia" },
  { code: "HR", ru: "Хорватия", en: "Croatia" },
  { code: "SI", ru: "Словения", en: "Slovenia" },
  { code: "LT", ru: "Литва", en: "Lithuania" },
  { code: "LV", ru: "Латвия", en: "Latvia" },
  { code: "EE", ru: "Эстония", en: "Estonia" },
  // MENA / Middle East
  { code: "TR", ru: "Турция", en: "Turkey" },
  { code: "EG", ru: "Египет", en: "Egypt" },
  { code: "MA", ru: "Марокко", en: "Morocco" },
  { code: "DZ", ru: "Алжир", en: "Algeria" },
  { code: "TN", ru: "Тунис", en: "Tunisia" },
  { code: "SA", ru: "Саудовская Аравия", en: "Saudi Arabia" },
  { code: "AE", ru: "ОАЭ", en: "United Arab Emirates" },
  { code: "QA", ru: "Катар", en: "Qatar" },
  { code: "KW", ru: "Кувейт", en: "Kuwait" },
  { code: "BH", ru: "Бахрейн", en: "Bahrain" },
  { code: "OM", ru: "Оман", en: "Oman" },
  { code: "IQ", ru: "Ирак", en: "Iraq" },
  { code: "JO", ru: "Иордания", en: "Jordan" },
  { code: "LB", ru: "Ливан", en: "Lebanon" },
  { code: "IL", ru: "Израиль", en: "Israel" },
  { code: "IR", ru: "Иран", en: "Iran" },
  // South & East Asia
  { code: "IN", ru: "Индия", en: "India" },
  { code: "PK", ru: "Пакистан", en: "Pakistan" },
  { code: "BD", ru: "Бангладеш", en: "Bangladesh" },
  { code: "LK", ru: "Шри-Ланка", en: "Sri Lanka" },
  { code: "NP", ru: "Непал", en: "Nepal" },
  { code: "KR", ru: "Южная Корея", en: "South Korea" },
  { code: "JP", ru: "Япония", en: "Japan" },
  { code: "CN", ru: "Китай", en: "China" },
  { code: "TW", ru: "Тайвань", en: "Taiwan" },
  { code: "HK", ru: "Гонконг", en: "Hong Kong" },
  { code: "VN", ru: "Вьетнам", en: "Vietnam" },
  { code: "TH", ru: "Таиланд", en: "Thailand" },
  { code: "ID", ru: "Индонезия", en: "Indonesia" },
  { code: "MY", ru: "Малайзия", en: "Malaysia" },
  { code: "PH", ru: "Филиппины", en: "Philippines" },
  { code: "SG", ru: "Сингапур", en: "Singapore" },
  { code: "KH", ru: "Камбоджа", en: "Cambodia" },
  { code: "MM", ru: "Мьянма", en: "Myanmar" },
  { code: "LA", ru: "Лаос", en: "Laos" },
  // Africa
  { code: "NG", ru: "Нигерия", en: "Nigeria" },
  { code: "KE", ru: "Кения", en: "Kenya" },
  { code: "ZA", ru: "ЮАР", en: "South Africa" },
  { code: "GH", ru: "Гана", en: "Ghana" },
  { code: "TZ", ru: "Танзания", en: "Tanzania" },
  { code: "UG", ru: "Уганда", en: "Uganda" },
  { code: "CM", ru: "Камерун", en: "Cameroon" },
  { code: "CI", ru: "Кот-д’Ивуар", en: "Ivory Coast" },
  { code: "SN", ru: "Сенегал", en: "Senegal" },
  { code: "ET", ru: "Эфиопия", en: "Ethiopia" },
  { code: "CD", ru: "ДР Конго", en: "DR Congo" },
  { code: "AO", ru: "Ангола", en: "Angola" },
  // Americas
  { code: "US", ru: "США", en: "United States" },
  { code: "CA", ru: "Канада", en: "Canada" },
  { code: "MX", ru: "Мексика", en: "Mexico" },
  { code: "BR", ru: "Бразилия", en: "Brazil" },
  { code: "AR", ru: "Аргентина", en: "Argentina" },
  { code: "CL", ru: "Чили", en: "Chile" },
  { code: "CO", ru: "Колумбия", en: "Colombia" },
  { code: "PE", ru: "Перу", en: "Peru" },
  { code: "VE", ru: "Венесуэла", en: "Venezuela" },
  { code: "EC", ru: "Эквадор", en: "Ecuador" },
  { code: "BO", ru: "Боливия", en: "Bolivia" },
  { code: "PY", ru: "Парагвай", en: "Paraguay" },
  { code: "UY", ru: "Уругвай", en: "Uruguay" },
  // Oceania
  { code: "AU", ru: "Австралия", en: "Australia" },
  { code: "NZ", ru: "Новая Зеландия", en: "New Zealand" },
];

/** Case-insensitive search by ru name, en name, or code. */
export function searchCountries(query: string, limit = 30): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES.slice(0, limit);
  const res = COUNTRIES.filter(
    (c) => c.ru.toLowerCase().includes(q) || c.en.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
  );
  return res.slice(0, limit);
}
