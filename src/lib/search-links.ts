/**
 * Zoek-URLs per winkel. Later te vervangen door affiliate-links.
 * Volgorde: specifieke winkels eerst, daarna algemeen (AH als fallback).
 */

const SEARCH_URLS: Record<string, (q: string) => string> = {
  ah: (q) => `https://www.ah.nl/zoeken?query=${encodeURIComponent(q)}`,
  jumbo: (q) => `https://www.jumbo.com/zoeken?SearchTerm=${encodeURIComponent(q)}`,
  lidl: (q) => `https://www.lidl.nl/zoeken?q=${encodeURIComponent(q)}`,
  aldi: (q) => `https://www.aldi.nl/zoeken.html?q=${encodeURIComponent(q)}`,
  ekoplaza: (q) => `https://www.ekoplaza.nl/zoeken?q=${encodeURIComponent(q)}`,
  plus: (q) => `https://www.plus.nl/zoeken?q=${encodeURIComponent(q)}`,
  dirk: (q) => `https://www.dirk.nl/zoeken?query=${encodeURIComponent(q)}`,
  bol: (q) => `https://www.bol.com/nl/s/?searchText=${encodeURIComponent(q)}`,
};

/** Bepaalt welke zoek-URL we tonen op basis van "waar" (bijv. "AH", "Jumbo", "Lidl", "Ekoplaza"). */
export function getSearchUrl(productName: string, waar: string): string | null {
  const w = waar.toLowerCase();
  if (w.includes("ekoplaza")) return SEARCH_URLS.ekoplaza(productName);
  if (w.includes("lidl")) return SEARCH_URLS.lidl(productName);
  if (w.includes("aldi")) return SEARCH_URLS.aldi(productName);
  if (w.includes("ah") || w.includes("albert heijn")) return SEARCH_URLS.ah(productName);
  if (w.includes("jumbo")) return SEARCH_URLS.jumbo(productName);
  if (w.includes("plus")) return SEARCH_URLS.plus(productName);
  if (w.includes("dirk")) return SEARCH_URLS.dirk(productName);
  if (w.includes("bol") || w.includes("online")) return SEARCH_URLS.bol(productName);
  return SEARCH_URLS.ah(productName);
}
