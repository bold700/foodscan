"use client";

const STORAGE_KEY = "foodscan_history";
const MAX_ITEMS = 50;

export interface StoredHistoryItem {
  type: "barcode" | "photo";
  barcode?: string;
  result: {
    naam: string;
    merk: string;
    nova: number | null;
    nova_label: string;
    oordeel: string;
    alternatieven: Array<{ naam: string; waar: string; nova: number }>;
  };
  time: string; // ISO
}

export interface HistoryItem {
  type: "barcode" | "photo";
  barcode?: string;
  result: StoredHistoryItem["result"];
  time: Date;
}

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredHistoryItem[];
    return (Array.isArray(arr) ? arr : [])
      .slice(0, MAX_ITEMS)
      .map((h) => ({ ...h, time: new Date(h.time) }));
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const toStore: StoredHistoryItem[] = items.slice(0, MAX_ITEMS).map((h) => ({
      type: h.type,
      barcode: h.barcode,
      result: h.result,
      time: h.time.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // ignore
  }
}
