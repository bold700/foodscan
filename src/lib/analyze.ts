"use client";

const STORAGE_KEY = "foodscan_apikey";
const STORAGE_PROVIDER = "foodscan_provider";

export type ApiProvider = "openai" | "anthropic";

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
}

export interface AnalysisResult {
  naam: string;
  merk: string;
  nova: number | null;
  nova_label: string;
  oordeel: string;
  /** 2-4 korte aandachtspunten (bijv. "Veel zout", "Bevat emulgatoren") */
  aandachtspunten?: string[];
  alternatieven: Array<{ naam: string; waar: string; nova: number }>;
}

export function getApiConfig(): ApiConfig | null {
  if (typeof window === "undefined") return null;
  const apiKey = localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  const provider = (localStorage.getItem(STORAGE_PROVIDER)?.trim() || "openai") as ApiProvider;
  if (!apiKey) return null;
  return { provider, apiKey };
}

export function saveApiConfig(provider: ApiProvider, apiKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PROVIDER, provider);
  localStorage.setItem(STORAGE_KEY, apiKey.trim());
}

export function parseAIJson(text: string): AnalysisResult {
  if (!text?.trim()) throw new Error("Geen antwoord van de AI ontvangen.");
  let raw = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const start = raw.indexOf("{");
  if (start === -1)
    throw new Error("De AI gaf geen JSON terug (alleen tekst). Probeer opnieuw of een andere barcode.");
  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end !== -1) raw = raw.slice(start, end + 1);
  else raw = raw.slice(start);
  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ongeldige JSON";
    throw new Error("Antwoord kon niet worden gelezen. Probeer opnieuw. [" + String(msg).slice(0, 50) + "]");
  }
}

export async function callAI(prompt: string, imageBase64?: string): Promise<string> {
  const cfg = getApiConfig();
  if (!cfg) throw new Error("Voeg eerst je API-key toe in Instellingen.");

  if (cfg.provider === "openai") {
    const body = {
      model: "gpt-4o-mini",
      max_tokens: 1200,
      messages: [
        {
          role: "user" as const,
          content: imageBase64
            ? [
                { type: "text" as const, text: prompt },
                { type: "image_url" as const, image_url: { url: "data:image/jpeg;base64," + imageBase64 } },
              ]
            : prompt,
        },
      ],
    };
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.apiKey },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || "OpenAI fout");
    return data.choices?.[0]?.message?.content ?? "";
  }

  if (cfg.provider === "anthropic") {
    const body = imageBase64
      ? {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: imageBase64 } },
                { type: "text" as const, text: prompt },
              ],
            },
          ],
        }
      : {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          messages: [{ role: "user" as const, content: prompt }],
        };
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || "Anthropic fout");
    return (data.content ?? []).map((x: { text?: string }) => x.text ?? "").join("");
  }

  throw new Error("Onbekende provider.");
}

export async function fetchProductByBarcode(barcode: string): Promise<{
  name: string;
  brand: string;
  ingredients: string;
  nova: string;
} | null> {
  const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const d = await r.json();
  if (d.status !== 1 || !d.product) return null;
  const p = d.product;
  return {
    name: p.product_name_nl || p.product_name || "Onbekend",
    brand: p.brands || "",
    ingredients: p.ingredients_text_nl || p.ingredients_text || "",
    nova: p.nova_group ?? "",
  };
}
