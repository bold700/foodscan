"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ResultCard } from "@/components/result-card";
import {
  getApiConfig,
  saveApiConfig,
  callAI,
  parseAIJson,
  fetchProductByBarcode,
  type ApiProvider,
  type AnalysisResult,
} from "@/lib/analyze";
import { loadHistory, saveHistory, type HistoryItem } from "@/lib/history";
import {
  getEffectiveTheme,
  getStoredTheme,
  toggleTheme as doToggleTheme,
} from "@/lib/theme";

type TabId = "barcode" | "ingredients" | "recent";

declare global {
  interface Window {
    Quagga?: {
      init: (config: unknown, cb: (err: unknown) => void) => void;
      start: () => void;
      stop: () => void;
      onDetected: (cb: (data: { codeResult?: { code?: string } }) => void) => void;
      decodeSingle: (config: { src: string; decoder: { readers: string[] }; locate: boolean }, cb: (r: unknown) => void) => void;
    };
  }
}

export function FoodscanApp() {
  const [tab, setTab] = useState<TabId>("barcode");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsProvider, setSettingsProvider] = useState<ApiProvider>("openai");
  const [settingsApiKey, setSettingsApiKey] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [bcCameraActive, setBcCameraActive] = useState(false);
  const [bcStatus, setBcStatus] = useState("Of typ barcode hieronder");
  const [bcStatusDetecting, setBcStatusDetecting] = useState(false);
  const [ingredientCameraOpen, setIngredientCameraOpen] = useState(false);
  const [ingredientCaptureReady, setIngredientCaptureReady] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeFileRef = useRef<HTMLInputElement>(null);
  const bcVideoRef = useRef<HTMLVideoElement>(null);
  const ingredientVideoRef = useRef<HTMLVideoElement>(null);
  const bcStreamRef = useRef<MediaStream | null>(null);
  const ingredientStreamRef = useRef<MediaStream | null>(null);
  const quaggaRunningRef = useRef(false);
  const lastLiveCodeRef = useRef<string | null>(null);
  const liveCodeCountRef = useRef(0);
  const barcodeDetectedRef = useRef(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    setIsDark(getEffectiveTheme() === "dark");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (getStoredTheme() === null) {
        document.documentElement.classList.toggle("dark", mq.matches);
        setIsDark(mq.matches);
      }
    };
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    if (tab !== "barcode" && bcCameraActive) {
      stopBarcodeCamera();
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "ingredients" && ingredientCameraOpen) {
      stopIngredientCamera();
    }
  }, [tab]);

  const stopBarcodeCamera = useCallback(() => {
    if (quaggaRunningRef.current && typeof window !== "undefined" && window.Quagga) {
      try {
        window.Quagga.stop();
      } catch {
        // ignore
      }
      quaggaRunningRef.current = false;
    }
    bcStreamRef.current?.getTracks().forEach((t) => t.stop());
    bcStreamRef.current = null;
    setBcCameraActive(false);
    if (!barcodeDetectedRef.current) {
      setBcStatus("Of typ barcode hieronder");
      setBcStatusDetecting(false);
    }
  }, []);

  const startQuagga = useCallback(
    (video: HTMLVideoElement) => {
      const Quagga = window.Quagga;
      if (!Quagga || quaggaRunningRef.current) return;
      quaggaRunningRef.current = true;
      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: video,
            constraints: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
            area: { top: "20%", right: "15%", left: "15%", bottom: "30%" },
          },
          locator: { patchSize: "large", halfSample: false },
          numOfWorkers: 4,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader"],
            multiple: false,
          },
          locate: true,
        },
        (err: unknown) => {
          if (err) {
            Quagga.init(
              {
                inputStream: { type: "LiveStream", target: video, constraints: { facingMode: "environment" } },
                decoder: { readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader"] },
                locate: true,
              },
              (e: unknown) => {
                if (!e) Quagga.start();
              }
            );
            return;
          }
          Quagga.start();
        }
      );
      Quagga.onDetected((data: { codeResult?: { code?: string } }) => {
        if (barcodeDetectedRef.current) return;
        const code = data.codeResult?.code;
        if (!code || code.length < 8) return;
        if (code === lastLiveCodeRef.current) {
          liveCodeCountRef.current += 1;
          if (liveCodeCountRef.current >= 2) {
            barcodeDetectedRef.current = true;
            setBcStatus("Barcode gevonden: " + code);
            setBarcodeInput(code);
            stopBarcodeCamera();
            analyzeBarcodeWithCode(code);
          }
        } else {
          lastLiveCodeRef.current = code;
          liveCodeCountRef.current = 1;
        }
      });
    },
    [stopBarcodeCamera]
  );

  const openBarcodeCamera = useCallback(async () => {
    barcodeDetectedRef.current = false;
    lastLiveCodeRef.current = null;
    liveCodeCountRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      });
      bcStreamRef.current = stream;
      setBcCameraActive(true);
      setBcStatus("Houd de barcode stil in het groene kader...");
      setBcStatusDetecting(true);
    } catch {
      setBcStatus("Camera niet beschikbaar. Typ barcode hieronder.");
      setBcStatusDetecting(false);
      setError("Camera niet beschikbaar.");
    }
  }, []);

  useEffect(() => {
    if (!bcCameraActive || !bcStreamRef.current) return;
    const video = bcVideoRef.current;
    if (!video) return;
    const stream = bcStreamRef.current;
    video.srcObject = stream;
    video.onloadedmetadata = () => startQuagga(video);
  }, [bcCameraActive, startQuagga]);

  const toggleBarcodeCamera = useCallback(() => {
    if (bcCameraActive) {
      stopBarcodeCamera();
      return;
    }
    openBarcodeCamera();
  }, [bcCameraActive, openBarcodeCamera, stopBarcodeCamera]);

  const stopIngredientCamera = useCallback(() => {
    ingredientStreamRef.current?.getTracks().forEach((t) => t.stop());
    ingredientStreamRef.current = null;
    setIngredientCameraOpen(false);
    setIngredientCaptureReady(false);
  }, []);

  const openIngredientCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      ingredientStreamRef.current = stream;
      setIngredientCameraOpen(true);
      setIngredientCaptureReady(false);
    } catch {
      setError("Camera niet beschikbaar. Gebruik 'Uit galerij'.");
    }
  }, []);

  useEffect(() => {
    if (!ingredientCameraOpen || !ingredientStreamRef.current) return;
    const video = ingredientVideoRef.current;
    if (!video) return;
    video.srcObject = ingredientStreamRef.current;
  }, [ingredientCameraOpen]);

  const captureIngredientPhoto = useCallback(() => {
    const video = ingredientVideoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoPreview(dataUrl);
    setPhotoBase64(dataUrl.split(",")[1] ?? null);
    stopIngredientCamera();
    setIngredientCameraOpen(false);
    setIngredientCaptureReady(true);
  }, [stopIngredientCamera]);

  const openSettings = useCallback(() => {
    const cfg = getApiConfig();
    setSettingsProvider(cfg?.provider ?? "openai");
    setSettingsApiKey(cfg?.apiKey ?? "");
    setSettingsOpen(true);
  }, []);

  const saveSettings = useCallback(() => {
    saveApiConfig(settingsProvider, settingsApiKey);
    setSettingsOpen(false);
  }, [settingsProvider, settingsApiKey]);

  const analyzeBarcodeWithCode = useCallback(async (codeOverride?: string) => {
    const code = (codeOverride ?? barcodeInput).trim();
    if (!code) return;
    const cfg = getApiConfig();
    if (!cfg) {
      setError("Voeg eerst je API-key toe in Instellingen.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const product = await fetchProductByBarcode(code);
      const prompt = product
        ? `Je bent een eerlijke, praktische voedingsadviseur voor Nederlandse consumenten. Analyseer dit product. Wees concreet: noem specifieke ingrediënten of additieven waar relevant. Geef een kort oordeel (2-3 zinnen) en 2-4 korte aandachtspunten (bijv. "Veel zout", "Bevat palmolie"). Geef 2-3 alternatieven die echt te vinden zijn in Nederland (concrete productnaam of duidelijke categorie, waar te koop). Antwoord uitsluitend met één JSON-object, geen tekst ervoor of erna.

Product: ${product.name}
Merk: ${product.brand}
Ingrediënten: ${product.ingredients}
NOVA: ${product.nova}

Verplicht formaat (alleen dit JSON-object):
{"naam":"...","merk":"...","nova":1-4,"nova_label":"Onbewerkt of Licht bewerkt of Bewerkt of Ultrabewerkt","oordeel":"2-3 zinnen, concreet en eerlijk","aandachtspunten":["punt 1","punt 2",...],"alternatieven":[{"naam":"concreet product of categorie","waar":"bijv. AH, Jumbo, versafdeling","nova":1 of 2}]}`
        : `Barcode ${code} niet gevonden. Antwoord uitsluitend met: {"naam":"Onbekend product","merk":"","nova":null,"nova_label":"Niet gevonden","oordeel":"Product niet gevonden. Probeer de ingrediënten-tab.","alternatieven":[]}`;
      const text = await callAI(prompt);
      const analysis = parseAIJson(text);
      setResult(analysis);
      setHistory((h) => [{ type: "barcode", barcode: code, result: analysis, time: new Date() }, ...h]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }, [barcodeInput]);

  const analyzeBarcode = useCallback(() => {
    analyzeBarcodeWithCode();
  }, [analyzeBarcodeWithCode]);

  const handleBarcodePhoto = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setBcStatus("Barcode uit foto lezen...");
      setBcStatusDetecting(true);
      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const max = 1200;
          let w = img.width,
            h = img.height;
          if (w > max || h > max) {
            if (w > h) {
              h = Math.round((h * max) / w);
              w = max;
            } else {
              w = Math.round((w * max) / h);
              h = max;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          const scaledUrl = canvas.toDataURL("image/png");
          const Quagga = window.Quagga;
          if (!Quagga) {
            setError("Barcode-scanner nog niet geladen. Vernieuw de pagina.");
            setBcStatus("Of typ barcode hieronder");
            setBcStatusDetecting(false);
            return;
          }
          const decoderConfig = { readers: ["ean_reader", "ean_8_reader", "code_128_reader", "upc_reader"] };
          const tryDecode = (
            src: string,
            locate: boolean,
            done: (code: string | null) => void
          ) => {
            Quagga.decodeSingle(
              { src, decoder: decoderConfig, locate },
              (result: unknown) => {
                const code = (result as { codeResult?: { code?: string } })?.codeResult?.code;
                if (code && code.length >= 8) done(code);
                else done(null);
              }
            );
          };
          tryDecode(scaledUrl, true, (code) => {
            if (code) {
              setBarcodeInput(code);
              setBcStatus("Barcode gevonden: " + code);
              setBcStatusDetecting(true);
              analyzeBarcodeWithCode(code);
              return;
            }
            tryDecode(scaledUrl, false, (code2) => {
              if (code2) {
                setBarcodeInput(code2);
                setBcStatus("Barcode gevonden: " + code2);
                setBcStatusDetecting(true);
                analyzeBarcodeWithCode(code2);
                return;
              }
              ctx.clearRect(0, 0, w, h);
              ctx.save();
              ctx.translate(w / 2, h / 2);
              ctx.rotate(Math.PI);
              ctx.translate(-w / 2, -h / 2);
              ctx.drawImage(img, 0, 0, w, h);
              ctx.restore();
              tryDecode(canvas.toDataURL("image/png"), true, (code3) => {
                if (code3) {
                  setBarcodeInput(code3);
                  setBcStatus("Barcode gevonden: " + code3);
                  setBcStatusDetecting(true);
                  analyzeBarcodeWithCode(code3);
                } else {
                  setBcStatus("Of typ barcode hieronder");
                  setBcStatusDetecting(false);
                  setError("Geen barcode gevonden op de foto. Probeer opnieuw of typ de code.");
                }
              });
            });
          });
        };
        img.onerror = () => {
          setBcStatus("Of typ barcode hieronder");
          setBcStatusDetecting(false);
          setError("Foto kon niet worden geladen. Probeer een andere afbeelding.");
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [analyzeBarcodeWithCode]
  );

  const analyzePhoto = useCallback(async () => {
    if (!photoBase64) return;
    const cfg = getApiConfig();
    if (!cfg) {
      setError("Voeg eerst je API-key toe in Instellingen.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const prompt = `Je bent een eerlijke, praktische voedingsadviseur voor Nederlandse consumenten. Lees de ingrediëntenlijst op de foto en analyseer het product. Wees concreet: noem specifieke ingrediënten of additieven waar relevant. Geef een kort oordeel (2-3 zinnen) en 2-4 korte aandachtspunten (bijv. "Veel zout", "Bevat emulgatoren"). Geef 2-3 alternatieven die echt te vinden zijn in Nederland (concrete productnaam of duidelijke categorie). Antwoord uitsluitend met één JSON-object, geen tekst ervoor of erna.

Verplicht formaat (alleen dit JSON-object):
{"naam":"...","merk":"...","nova":1-4,"nova_label":"Onbewerkt of Licht bewerkt of Bewerkt of Ultrabewerkt","oordeel":"2-3 zinnen, concreet","aandachtspunten":["punt 1","punt 2",...],"alternatieven":[{"naam":"concreet product of categorie","waar":"bijv. AH, Jumbo","nova":1 of 2}]}`;
    try {
      const text = await callAI(prompt, photoBase64);
      const analysis = parseAIJson(text);
      setResult(analysis);
      setHistory((h) => [{ type: "photo", result: analysis, time: new Date() }, ...h]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon afbeelding niet analyseren.");
    } finally {
      setLoading(false);
    }
  }, [photoBase64]);

  const handleIngredientPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      setPhotoBase64(dataUrl.split(",")[1] ?? null);
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
        <div className="flex w-full items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              food<span className="text-muted-foreground">scan</span>
            </h1>
            <p className="text-xs text-muted-foreground">echt eten, echte keuzes</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(doToggleTheme() === "dark")}
              aria-label={isDark ? "Licht thema" : "Donker thema"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={openSettings}
              aria-label="Instellingen"
            >
              <SettingsIcon />
            </Button>
          </div>
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabId)}
        className="flex flex-1 flex-col"
      >
        <TabsList variant="line" className="w-full rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger value="barcode" className="flex-1">Barcode</TabsTrigger>
          <TabsTrigger value="ingredients" className="flex-1">Ingrediënten</TabsTrigger>
          <TabsTrigger value="recent" className="flex-1">Recent</TabsTrigger>
        </TabsList>

        <main className="mx-auto w-full max-w-2xl flex-1 p-4">
          <TabsContent value="barcode" className="mt-0 space-y-4">
            {bcCameraActive && (
              <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-[4/3] max-h-[50vh]">
                <video
                  ref={bcVideoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[70%] aspect-[3/1] border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={bcCameraActive ? "secondary" : "default"}
                className="flex-1"
                onClick={toggleBarcodeCamera}
              >
                {bcCameraActive ? "Stop camera" : "Live scannen"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => barcodeFileRef.current?.click()}
                disabled={bcCameraActive}
              >
                Foto van barcode
              </Button>
              <input
                ref={barcodeFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleBarcodePhoto}
              />
            </div>
            <p
              className={`text-center text-sm min-h-8 ${
                bcStatusDetecting ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {bcStatus}
            </p>
            <p className="text-center text-sm text-muted-foreground">— of —</p>
            <div className="flex gap-2">
              <Input
                placeholder="bv. 8718309228874"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyzeBarcode()}
                className="flex-1"
              />
              <Button onClick={analyzeBarcode} disabled={loading}>
                Zoek
              </Button>
            </div>
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {loading && (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                <p className="text-sm text-muted-foreground">Analyseren...</p>
              </div>
            )}
            {result && !loading && <ResultCard result={result} />}
          </TabsContent>

          <TabsContent value="ingredients" className="mt-0 space-y-4">
            {ingredientCameraOpen && (
              <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-[4/3]">
                <video
                  ref={ingredientVideoRef}
                  className="h-full w-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] aspect-[4/3] border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIngredientPhoto}
            />
            {!ingredientCameraOpen && !photoPreview && (
              <div className="flex flex-wrap gap-2">
                <Button className="flex-1" onClick={openIngredientCamera}>
                  Camera openen
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Uit galerij
                </Button>
              </div>
            )}
            {ingredientCameraOpen && (
              <div className="flex flex-wrap gap-2">
                <Button className="flex-1" onClick={captureIngredientPhoto}>
                  Maak foto
                </Button>
                <Button variant="outline" className="flex-1" onClick={stopIngredientCamera}>
                  Annuleer
                </Button>
              </div>
            )}
            {photoPreview && (
              <>
                <img
                  src={photoPreview}
                  alt="Gekozen"
                  className="w-full rounded-lg border border-border object-contain max-h-64"
                />
                <div className="flex gap-2">
                  <Button onClick={analyzePhoto} disabled={loading} className="flex-1">
                    Analyseer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoBase64(null);
                      setIngredientCaptureReady(false);
                    }}
                  >
                    Opnieuw
                  </Button>
                </div>
              </>
            )}
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {loading && (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                <p className="text-sm text-muted-foreground">Ingrediënten lezen...</p>
              </div>
            )}
            {result && !loading && <ResultCard result={result} />}
          </TabsContent>

          <TabsContent value="recent" className="mt-0 space-y-4">
            {history.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nog geen producten gescand
              </p>
            ) : (
              <ul className="space-y-4">
                {history.map((item, i) => (
                  <li key={i}>
                    <p className="mb-1 text-xs text-muted-foreground">
                      {item.time.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <ResultCard result={item.result} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </main>
      </Tabs>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instellingen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>AI-provider</Label>
              <Select
                value={settingsProvider}
                onValueChange={(v) => setSettingsProvider(v as ApiProvider)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (goedkoper)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                OpenAI is goedkoper; Claude is vaak iets sterker op teksten.
              </p>
            </div>
            <div className="space-y-2">
              <Label>API-key</Label>
              <Input
                type="password"
                placeholder="sk-... of sk-ant-..."
                value={settingsApiKey}
                onChange={(e) => setSettingsApiKey(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">Wordt lokaal opgeslagen. Nooit gedeeld.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Sluiten
            </Button>
            <Button onClick={saveSettings}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
