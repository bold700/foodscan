# foodscan

**echt eten, echte keuzes** — Scan een barcode of foto van de ingrediëntenlijst en krijg een eerlijk oordeel met NOVA-classificatie en gezondere alternatieven.

## Live testen (GitHub Pages)

1. Ga in deze repo naar **Settings** → **Pages**.
2. Bij **Source** kies je **Deploy from a branch**.
3. Bij **Branch** kies je **main** en map **/ (root)**.
4. Klik op **Save**. Na een paar minuten staat de app online.

**URL:** `https://bold700.github.io/foodscan/`

## Gebruik

- Voeg in de app je eigen **API-key** toe (⚙ Instellingen): OpenAI of Anthropic. De key wordt alleen lokaal opgeslagen.
- **Barcode:** camera of handmatig invullen; product wordt opgezocht bij Open Food Facts en geanalyseerd.
- **Ingrediënten:** maak een foto van de ingrediëntenlijst of upload een afbeelding voor analyse.
- **Recent:** overzicht van eerder gescande producten (in deze sessie).

## Techniek

- Eén HTML-bestand (`index.html`), geen buildstap.
- Open Food Facts API voor productdata, OpenAI of Claude voor analyse.
- Werkt op mobiel en desktop; responsive layout.
