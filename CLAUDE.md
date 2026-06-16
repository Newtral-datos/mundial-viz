# CLAUDE.md — mundial-viz

Visualización interactiva del lugar de nacimiento de los jugadores del Mundial 2026 (48 selecciones). SPA en **Svelte 4 + Vite**, mapa con **Leaflet**, datos de FIFA y Transfermarkt.

## Comandos principales

```bash
# Desarrollo
npm run dev          # servidor en localhost:5173

# Producción
npm run build        # copia CSV → public/data/ y compila en dist/
npm run deploy       # build + publicación en GitHub Pages (rama gh-pages)
                     # URL: https://newtral-datos.github.io/mundial-viz/
```

## Estructura

```
src/
  App.svelte          # router (svelte-spa-router): / → Mapa, /tabla → Tabla
  app.css             # variables CSS globales (--bg, --accent, --text-muted…)
  main.js             # punto de entrada; emite postMessage {iframeHeight} para embed WordPress
  routes/
    Mapa.svelte       # coroplético Leaflet + panel extranjeros + geocoder
    Tabla.svelte      # acordeón por grupos FIFA con tabla de jugadores
  lib/
    data.js           # loadPlayers(), formatMV(), formatDOB(), t(), POS_MAP, POS_ES

public/data/          # CSV copiado por prebuild (no editar manualmente)
../data/              # fuente del CSV (bbdd_mundial_nacimiento_localizado.csv)
../scripts/           # pipeline de scraping y análisis
```

## Datos

El CSV principal es `../data/bbdd_mundial_nacimiento_localizado.csv`.  
Columnas relevantes: `team`, `player_tm`, `pos`, `dob`, `club`, `market_value`, `birthplace_city`, `birthplace_country`, `birthplace_lat`, `birthplace_lon`.

El `prebuild` lo copia a `public/data/` antes de cada build. En desarrollo sirve directamente desde `public/data/` — hay que copiarlo a mano si cambia el CSV:

```bash
cp ../data/bbdd_mundial_nacimiento_localizado.csv public/data/
```

## Embed WordPress

`main.js` emite `postMessage({ iframeHeight })` al padre: 650px escritorio / 500px móvil. HTML para WordPress:

```html
<div style="margin:0 auto;width:100%">
  <iframe id="iframe-github"
    src="https://newtral-datos.github.io/mundial-viz/"
    style="width:100%;border:none;display:block" allowfullscreen loading="lazy">
  </iframe>
</div>
<script>
  window.addEventListener('message', e => {
    if (e.data?.iframeHeight)
      document.getElementById('iframe-github').style.height = e.data.iframeHeight + 'px'
  })
</script>
```

## Mapa (Mapa.svelte)

- GeoJSON: **Natural Earth `ne_50m_admin_0_map_units`** (URL raw de GitHub). Se usa esta capa específicamente porque separa Inglaterra y Escocia (`NAME` = `'England'` / `'Scotland'`), y también divide Bélgica en `Flemish`/`Walloon`/`Brussels` y Bosnia en `Rep. Srpska`/`Fed. of Bos. & Herz.`.
- Propiedad usada: `feature.properties.NAME` (no `ADMIN`).
- Sin capa de etiquetas — se eliminó el tile `light_only_labels` para evitar nombres en inglés.
- `GEO_TO_TEAMS`: mapea nombres del GeoJSON → nombre de selección en el CSV (necesario para Bélgica, Bosnia, RD del Congo, Corea del Sur, etc.).
- `QUALIFIED`: conjunto de las 48 selecciones clasificadas.

### Colores del coroplético

Tres categorías visuales:
- **Blanco** (`#ffffff`) → no clasificado al Mundial 2026
- **Gris** (`#d8d8d8`) → clasificado, 0 extranjeros
- **Escala verde** (`COLOR_STEPS`) → 1–2 / 3–5 / 6–9 / 10–14 / 15+

`getColor(count, qualified)` recibe ambos parámetros; `STEPS` es solo para la leyenda.

### Panel de info (esquina inferior derecha)

- Se actualiza al hover; se fija al click (con botón ×).
- **Pill toggle** "Extranjeros · N / Todos · N": alterna entre lista de extranjeros (ordenados por país) y plantilla completa (ordenada por dorsal). Se resetea al cambiar de país.
- En modo "Todos", los jugadores nacidos fuera llevan un punto verde junto al badge de posición.
- Banderas: imágenes `16×12` de `flagcdn.com/{iso2}.png` a partir de `COUNTRY_ISO2` (~120 países).

### Geocoder (esquina superior derecha, bajo el zoom)

- Input con dropdown que filtra los ~250 territorios del GeoJSON por nombre en español.
- Al seleccionar: `map.flyToBounds()` + panel bloqueado con los datos del país.
- Funciona para países multi-polígono (Bélgica 3 features, Bosnia 2 features): `teamIndex` agrupa layers por team key y calcula bounds combinados.
- Incluye países no clasificados (muestran "No clasificado al Mundial 2026").

### Lógica de jugador extranjero (`isForeign`)

1. **Normalización**: `norm()` aplica NFD + elimina combining chars + toLowerCase. Imprescindible para Türkiye, Côte d'Ivoire, Curaçao.
2. **Yugoslavia**: subcadena `'yugoslavia'` o `'jugoslaw'` → nacional para Croacia, Bosnia, Serbia, Eslovenia, Macedonia del Norte, Montenegro, Kosovo.
3. **Antillas Neerlandesas**: subcadena `'netherlands antilles'` → nacional para Curaçao.
4. **Equivalencias simétricas** (`TEAM_BIRTH_EQUIV`): Turkey/Turkiye, Czech Republic/Czechia, Bosnia variantes, DR Congo/Zaire, Cape Verde/Cabo Verde, Ivory Coast/Côte d'Ivoire, South Korea variantes, United States/USA.

## Tabla (Tabla.svelte)

- Acordeón de dos niveles: grupos (A–L) → selecciones → tabla de jugadores.
- Búsqueda por jugador o club: cuando hay texto, **solo se renderizan** los grupos y equipos con coincidencias (no solo se abren — se ocultan del DOM los que no coinciden).
- `t()` traduce nombres de selección al español en cabeceras y preview de grupo.

## Scripts de datos (`../scripts/`)

| Script | Función |
|---|---|
| `1_lista_fifa.py` | Extrae la lista oficial FIFA del PDF |
| `1_descarga.py` | Descarga datos FIFA |
| `2_procesado.py` | Limpieza inicial |
| `3_transfermarkt.py` | Scraping de plantillas y lugar de nacimiento en TM |
| `4_geocodificar.py` | Geocodificación con Nominatim |
| `5_filtrar_fifa.py` | Cruce FIFA ↔ TM |
| `6_rescrape_incompletos.py` | Re-scraping de selecciones con < 26 jugadores; `TARGETS` = lista explícita o `None` para autodetectar |
| `analisis.ipynb` | Análisis exploratorio + definición de `jug_extranjeros` + notas metodológicas (última celda) |

### Editar analisis.ipynb desde código

Jupyter sobreescribe el archivo al guardar desde la UI. Para modificar celdas de forma persistente usar **Python JSON directo**:

```python
import json
path = "../scripts/analisis.ipynb"
with open(path) as f:
    nb = json.load(f)
# modificar nb["cells"]
with open(path, "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)
```

## Convenciones

- Nombres de selecciones: siempre en inglés tal como aparecen en el CSV (`team`). La traducción al español es responsabilidad de `t()` en `data.js` → `COUNTRY_ES`.
- Posiciones en español: `POS_MAP` (inglés TM → código) + `POS_ES` (código → español) en `data.js`.
- No hay TypeScript, no hay backend: todo es estático.
