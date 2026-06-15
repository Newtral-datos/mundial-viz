<script>
  import { onMount, onDestroy } from 'svelte'
  import L from 'leaflet'
  import { loadPlayers, formatMV, t, POS_MAP, POS_ES } from '../lib/data.js'

  const COORD_OVERRIDES = {
    'Achraf Hakimi': [40.30876796248437, -3.7307993645508004],
  }

  // Nombres alternativos del país de nacimiento para cada selección
  const TEAM_BIRTH_EQUIV = {
    'Bosnia-Herzegovina':               ['Bosnia and Herzegovina', 'Bosnia-Herzegovina'],
    'Turkiye':                          ['Turkey', 'Turkiye'],
    'Czechia':                          ['Czech Republic', 'Czechia'],
    'Democratic Republic of the Congo': ['Democratic Republic of the Congo', 'DR Congo', 'Congo DR'],
    'Cape Verde':                       ['Cape Verde', 'Cabo Verde'],
    'Ivory Coast':                      ["Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire"],
    'South Korea':                      ['South Korea', 'Korea, Republic of', 'Republic of Korea'],
    'United States':                    ['United States', 'United States of America', 'USA'],
  }

  function sameCountry(team, birthCountry) {
    if (!birthCountry) return true
    const equiv = TEAM_BIRTH_EQUIV[team] ?? [team]
    return equiv.some(c => c.toLowerCase() === birthCountry.toLowerCase())
  }

  let mapEl
  let map
  let loading = true
  let mapped = 0
  let foreignCount = 0


  onMount(async () => {
    map = L.map(mapEl, { zoomControl: true }).setView([20, 10], 2)

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map)

    const players = await loadPlayers()
    loading = false

    const byCoords = new Map()
    players.forEach(p => {
      if (COORD_OVERRIDES[p.player_tm]) {
        const [lat, lon] = COORD_OVERRIDES[p.player_tm]
        p.birthplace_lat = lat
        p.birthplace_lon = lon
      }
      if (p.birthplace_lat && p.birthplace_lon) {
        mapped++
        const key = `${p.birthplace_lat},${p.birthplace_lon}`
        if (!byCoords.has(key)) byCoords.set(key, [])
        byCoords.get(key).push(p)
      }
    })

    function jitter(name, axis) {
      let h = axis === 'lat' ? 1327 : 7331
      for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 2654435761)
      return ((h >>> 0) / 0xffffffff - 0.5) * 0.012
    }

    byCoords.forEach((group, key) => {
      const [lat, lon] = key.split(',').map(Number)
      const n = group.length

      group.forEach(p => {
        const isForeign = !sameCountry(p.team, p.birthplace_country)
        if (isForeign) foreignCount++

        const jLat = lat + (n === 1 ? 0 : jitter(p.player_tm, 'lat'))
        const jLon = lon + (n === 1 ? 0 : jitter(p.player_tm, 'lon'))

        const fill   = isForeign ? '#01f3b3' : '#494949'
        const stroke = isForeign ? '#00916b' : '#2a2a2a'

        const marker = L.circleMarker([jLat, jLon], {
          radius: 5,
          fillColor: fill,
          color: stroke,
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.8,
        }).bindPopup(
          `<div class="popup">
            <div class="popup-header">
              <span class="popup-name">${p.player_tm}</span>
              <span class="popup-pos pos-${POS_MAP[p.pos] ?? 'XX'}">${POS_ES[POS_MAP[p.pos]] ?? '—'}</span>
            </div>
            <div class="popup-body">
              <div class="popup-row">
                <span class="popup-label">Selección</span>
                <span>${t(p.team)}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Nacido en</span>
                <span>${p.birthplace_city ? `${p.birthplace_city}, ${t(p.birthplace_country)}` : '—'}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Club</span>
                <span>${p.club ?? '—'}</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Valor</span>
                <span class="popup-value">${formatMV(p.market_value)}</span>
              </div>
            </div>
          </div>`
        )

        marker.addTo(map)
      })
    })
  })

  onDestroy(() => map?.remove())
</script>

<div class="wrapper">
  <div bind:this={mapEl} class="map"></div>

  <div class="legend">
    <div class="legend-item">
      <span class="legend-dot foreign"></span>
      Nacido fuera de su selección
    </div>
    <div class="legend-item">
      <span class="legend-dot native"></span>
      Nacido en su país
    </div>
  </div>

  <div class="badge">
    {#if loading}
      <span class="dot pulse"></span> Cargando datos…
    {:else}
      <span class="dot"></span>
      {mapped} jugadores · {foreignCount} nacidos fuera
    {/if}
  </div>
</div>

<style>
  .wrapper {
    position: relative;
    flex: 1;
  }

  .map {
    width: 100%;
    height: 100%;
  }

  .legend {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: rgba(255,255,255,0.92);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.6rem 0.85rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    backdrop-filter: blur(6px);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.74rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-dot.foreign { background: #01f3b3; border: 1.5px solid #00916b; }
  .legend-dot.native  { background: #494949; border: 1.5px solid #2a2a2a; }

  .badge {
    position: absolute;
    bottom: 1.25rem;
    left: 1.25rem;
    z-index: 1000;
    background: rgba(255,255,255,0.92);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.45rem 0.85rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    backdrop-filter: blur(6px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-dark);
    flex-shrink: 0;
  }

  .dot.pulse { animation: pulse 1.2s infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  :global(.leaflet-popup-content-wrapper) {
    background: #ffffff;
    color: #1a1d21;
    border: none;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    padding: 0;
    overflow: hidden;
  }

  :global(.leaflet-popup-content) {
    margin: 0;
    width: auto !important;
  }

  :global(.leaflet-popup-tip) { background: #ffffff; }

  :global(.leaflet-popup-close-button) {
    color: #9ca3af !important;
    top: 8px !important;
    right: 8px !important;
    font-size: 16px !important;
  }

  :global(.popup) {
    font-family: 'Inter', system-ui, sans-serif;
    min-width: 200px;
  }

  :global(.popup-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.7rem 0.9rem 0.55rem;
    border-bottom: 1px solid #f0f2f4;
  }

  :global(.popup-name) {
    font-weight: 700;
    font-size: 13.5px;
    color: #1a1d21;
    line-height: 1.2;
  }

  :global(.popup-pos) {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  :global(.pos-GK) { background: #fef3c7; color: #92400e; }
  :global(.pos-DF) { background: #dbeafe; color: #1e40af; }
  :global(.pos-MF) { background: #d1fae5; color: #065f46; }
  :global(.pos-FW) { background: #fce7f3; color: #9d174d; }
  :global(.pos-XX) { background: #f3f4f6; color: #6b7280; }

  :global(.popup-body) {
    padding: 0.5rem 0.9rem 0.65rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  :global(.popup-row) {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    font-size: 12px;
    color: #374151;
  }

  :global(.popup-label) {
    color: #9ca3af;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  :global(.popup-value) {
    font-weight: 600;
    color: #00916b;
  }

  @media (max-width: 640px) {
    .legend {
      top: 0.6rem;
      right: 0.6rem;
      padding: 0.45rem 0.65rem;
      gap: 0.3rem;
    }

    .legend-item { font-size: 0.68rem; }

    .badge {
      bottom: 0.75rem;
      left: 0.75rem;
      font-size: 0.7rem;
      padding: 0.35rem 0.65rem;
      max-width: calc(100vw - 1.5rem);
    }

    :global(.leaflet-popup-content-wrapper) {
      max-width: 85vw;
    }

    :global(.popup) {
      min-width: 0;
    }
  }
</style>
