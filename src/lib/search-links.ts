/**
 * Zoek-URLs voor alternatieven. Later te vervangen door affiliate-links
 * (bijv. via env NEXT_PUBLIC_AH_AFFILIATE of een redirect-service).
 */

const SEARCH_URLS: Record<string, (q: string) => string> = {
  ah: (q) => `https://www.ah.nl/zoeken?query=${encodeURIComponent(q)}`,
  jumbo: (q) => `https://www.jumbo.com/zoeken?SearchTerm=${encodeURIComponent(q)}`,
  bol: (q) => `https://www.bol.com/nl/s/?searchText=${encodeURIComponent(q)}`,
  plus: (q) => `https://www.plus.nl/zoeken?q=${encodeURIComponent(q)}`,
  dirk: (q) => `https://www.dirk.nl/zoeken?query=${encodeURIComponent(q)}`,
};

/** Bepaalt welke zoek-URL we tonen op basis van "waar" (bijv. "AH", "Jumbo", "online"). */
export function getSearchUrl(productName: string, waar: string): string | null {
  const w = waar.toLowerCase();
  if (w.includes("ah") || w.includes("albert heijn")) return SEARCH_URLS.ah(productName);
  if (w.includes("jumbo")) return SEARCH_URLS.jumbo(productName);
  if (w.includes("bol")) return SEARCH_URLS.bol(productName);
  if (w.includes("plus")) return SEARCH_URLS.plus(productName);
  if (w.includes("dirk")) return SEARCH_URLS.dirk(productName);
  if (w.includes("online")) return SEARCH_URLS.bol(productName);
  return SEARCH_URLS.ah(productName);
}
