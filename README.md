# foodscan

Echt eten, echte keuzes – scan een barcode of foto van ingrediënten en krijg een eerlijk oordeel met NOVA en gezondere alternatieven.

## Lokaal draaien

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Vul in Instellingen (⚙) je OpenAI- of Anthropic-API-key in.

## GitHub Pages

De app wordt als **statische site** geëxporteerd en werkt op GitHub Pages.

### 1. Build

**Projectpagina** (URL: `username.github.io/foodscan-app/`):

```bash
NEXT_PUBLIC_BASE_PATH=/foodscan-app npm run build
```

**Gebruikerspagina** (URL: `username.github.io`):

```bash
npm run build
```

De output staat in de map **`out`**.

### 2. Deployen

- **Optie A:** In je repo onder **Settings → Pages** kies je “Deploy from a branch”. Kies de branch waar de inhoud van `out` staat (bijv. `gh-pages` of `main`), en als map **`/ (root)`** of **`/docs`** (als je `out` in `docs` kopieert).
- **Optie B:** Push de inhoud van `out` naar een branch `gh-pages` en zet Pages op die branch.

Het bestand `public/.nojekyll` wordt meegekopieerd zodat GitHub de map `_next` niet door Jekyll laat negeren.

### 3. Base path

Als je site op een subpad staat (bijv. `/foodscan-app/`), moet je bij de build `NEXT_PUBLIC_BASE_PATH` zetten op dat pad, anders laden CSS en JS niet.
