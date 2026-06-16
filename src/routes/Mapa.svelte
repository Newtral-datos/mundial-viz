<script>
  import { onMount, onDestroy } from 'svelte'
  import L from 'leaflet'
  import { loadPlayers, t, POS_MAP, POS_ES } from '../lib/data.js'

  // Equivalencias entre nombre de selección y posibles valores de birthplace_country
  const TEAM_BIRTH_EQUIV = {
    'Bosnia-Herzegovina':               ['Bosnia and Herzegovina', 'Bosnia-Herzegovina'],
    'Turkiye':                          ['Turkey', 'Turkiye'],
    'Czechia':                          ['Czech Republic', 'Czechia'],
    'Democratic Republic of the Congo': ['Democratic Republic of the Congo', 'DR Congo', 'Congo DR', 'Zaire'],
    'Cape Verde':                       ['Cape Verde', 'Cabo Verde'],
    'Ivory Coast':                      ["Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire"],
    'South Korea':                      ['South Korea', 'Korea, Republic of', 'Republic of Korea', 'Korea, South'],
    'United States':                    ['United States', 'United States of America', 'USA'],
  }

  const EX_YUGOSLAVIA = new Set(['Croatia', 'Bosnia-Herzegovina', 'Serbia', 'Slovenia',
                                  'North Macedonia', 'Montenegro', 'Kosovo'])
  const EX_ANTILLES   = new Set(['Curaçao'])

  function norm(s) {
    if (!s) return ''
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  }

  function isForeign(p) {
    if (!p.birthplace_country) return false
    const b = norm(p.birthplace_country)
    if ((b.includes('yugoslavia') || b.includes('jugoslaw')) && EX_YUGOSLAVIA.has(p.team)) return false
    if (b.includes('netherlands antilles') && EX_ANTILLES.has(p.team)) return false
    const equiv = TEAM_BIRTH_EQUIV[p.team] ?? [p.team]
    return !equiv.some(c => norm(c) === b)
  }

  const GEO_TO_TEAMS = {
    'Bosnia and Herz.':         ['Bosnia-Herzegovina'],
    'Bosnia and Herzegovina':   ['Bosnia-Herzegovina'],
    'Dem. Rep. Congo':          ['Democratic Republic of the Congo'],
    'S. Korea':                 ['South Korea'],
    'Republic of Korea':        ['South Korea'],
    'Czech Rep.':               ['Czechia'],
    'Czech Republic':           ['Czechia'],
    'Cabo Verde':               ['Cape Verde'],
    'Turkey':                   ['Turkiye'],
    "Côte d'Ivoire":            ['Ivory Coast'],
    "Cote d'Ivoire":            ['Ivory Coast'],
    'United States of America': ['United States'],
    'United States':            ['United States'],
    'Flemish':               ['Belgium'],
    'Walloon':               ['Belgium'],
    'Brussels':              ['Belgium'],
    'Rep. Srpska':           ['Bosnia-Herzegovina'],
    'Fed. of Bos. & Herz.': ['Bosnia-Herzegovina'],
  }

  const QUALIFIED = new Set([
    'Mexico','South Africa','South Korea','Czechia',
    'Canada','Bosnia-Herzegovina','Qatar','Switzerland',
    'Brazil','Morocco','Haiti','Scotland',
    'United States','Paraguay','Australia','Turkiye',
    'Germany','Curaçao','Ivory Coast','Ecuador',
    'Netherlands','Japan','Sweden','Tunisia',
    'Belgium','Egypt','Iran','New Zealand',
    'Spain','Cape Verde','Saudi Arabia','Uruguay',
    'France','Senegal','Iraq','Norway',
    'Argentina','Algeria','Austria','Jordan',
    'Portugal','Democratic Republic of the Congo','Uzbekistan','Colombia',
    'England','Croatia','Ghana','Panama',
  ])

  // Leyenda (incluye no clasificado y 0 extranjeros)
  const STEPS = [
    { color: '#ffffff', label: 'No clasificado' },
    { color: '#d8d8d8', label: '0'              },
    { color: '#b3f0de', label: '1–2'            },
    { color: '#5de3bf', label: '3–5'            },
    { color: '#1dd4a4', label: '6–9'            },
    { color: '#00a87e', label: '10–14'          },
    { color: '#006e54', label: '15+'            },
  ]

  const COLOR_STEPS = [
    { min: 1,  color: '#b3f0de' },
    { min: 3,  color: '#5de3bf' },
    { min: 6,  color: '#1dd4a4' },
    { min: 10, color: '#00a87e' },
    { min: 15, color: '#006e54' },
  ]

  function getColor(n, qualified) {
    if (!qualified) return '#ffffff'
    for (let i = COLOR_STEPS.length - 1; i >= 0; i--) {
      if (n >= COLOR_STEPS[i].min) return COLOR_STEPS[i].color
    }
    return '#d8d8d8'
  }

  // ── Banderas ──────────────────────────────────────────────────────
  const COUNTRY_ISO2 = {
    'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Angola': 'AO',
    'Argentina': 'AR', 'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT',
    'Azerbaijan': 'AZ', 'Bahrain': 'BH', 'Belarus': 'BY', 'Belgium': 'BE',
    'Benin': 'BJ', 'Bolivia': 'BO', 'Bosnia and Herzegovina': 'BA',
    'Bosnia-Herzegovina': 'BA', 'Botswana': 'BW', 'Brazil': 'BR',
    'Bulgaria': 'BG', 'Burkina Faso': 'BF', 'Burundi': 'BI',
    'Cabo Verde': 'CV', 'Cambodia': 'KH', 'Cameroon': 'CM', 'Canada': 'CA',
    'Cape Verde': 'CV', 'Chad': 'TD', 'Chile': 'CL', 'China': 'CN',
    'China PR': 'CN', 'Colombia': 'CO', 'Comoros': 'KM', 'Congo': 'CG',
    'Costa Rica': 'CR', 'Croatia': 'HR', 'Cuba': 'CU', 'Curaçao': 'CW',
    "Côte d'Ivoire": 'CI', "Cote d'Ivoire": 'CI', 'Ivory Coast': 'CI',
    'Czech Republic': 'CZ', 'Czechia': 'CZ',
    'Democratic Republic of the Congo': 'CD', 'Dem. Rep. Congo': 'CD',
    'DR Congo': 'CD', 'Congo DR': 'CD',
    'Denmark': 'DK', 'Djibouti': 'DJ', 'Dominican Republic': 'DO',
    'Ecuador': 'EC', 'Egypt': 'EG', 'El Salvador': 'SV', 'England': 'GB',
    'Equatorial Guinea': 'GQ', 'Eritrea': 'ER', 'Estonia': 'EE',
    'Ethiopia': 'ET', 'Fiji': 'FJ', 'Finland': 'FI', 'France': 'FR',
    'French Guiana': 'GF', 'Gabon': 'GA', 'Georgia': 'GE', 'Germany': 'DE',
    'Ghana': 'GH', 'Greece': 'GR', 'Guadeloupe': 'GP', 'Guatemala': 'GT',
    'Guinea': 'GN', 'Guinea-Bissau': 'GW', 'Guyana': 'GY', 'Haiti': 'HT',
    'Honduras': 'HN', 'Hungary': 'HU', 'Iceland': 'IS', 'India': 'IN',
    'Indonesia': 'ID', 'Iran': 'IR', 'IR Iran': 'IR', 'Iraq': 'IQ',
    'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT', 'Jamaica': 'JM',
    'Japan': 'JP', 'Jordan': 'JO', 'Kazakhstan': 'KZ', 'Kenya': 'KE',
    'Korea, Republic of': 'KR', 'Korea, South': 'KR', 'Korea Republic': 'KR',
    'Republic of Korea': 'KR', 'South Korea': 'KR',
    'Kuwait': 'KW', 'Kyrgyzstan': 'KG', 'Latvia': 'LV', 'Lebanon': 'LB',
    'Libya': 'LY', 'Lithuania': 'LT', 'Luxembourg': 'LU',
    'Madagascar': 'MG', 'Malawi': 'MW', 'Malaysia': 'MY', 'Mali': 'ML',
    'Martinique': 'MQ', 'Mauritania': 'MR', 'Mexico': 'MX', 'Moldova': 'MD',
    'Montenegro': 'ME', 'Morocco': 'MA', 'Mozambique': 'MZ', 'Namibia': 'NA',
    'Netherlands': 'NL', 'New Caledonia': 'NC', 'New Zealand': 'NZ',
    'Nicaragua': 'NI', 'Niger': 'NE', 'Nigeria': 'NG', 'North Korea': 'KP',
    'North Macedonia': 'MK', 'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK',
    'Palestine': 'PS', 'Panama': 'PA', 'Papua New Guinea': 'PG',
    'Paraguay': 'PY', 'Peru': 'PE', 'Philippines': 'PH', 'Poland': 'PL',
    'Portugal': 'PT', 'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU',
    'Rwanda': 'RW', 'Saudi Arabia': 'SA', 'Scotland': 'GB', 'Senegal': 'SN',
    'Serbia': 'RS', 'Sierra Leone': 'SL', 'Singapore': 'SG',
    'Slovakia': 'SK', 'Slovenia': 'SI', 'Somalia': 'SO', 'South Africa': 'ZA',
    'South Sudan': 'SS', 'Spain': 'ES', 'Sudan': 'SD', 'Suriname': 'SR',
    'Sweden': 'SE', 'Switzerland': 'CH', 'Syria': 'SY', 'Tajikistan': 'TJ',
    'Tanzania': 'TZ', 'Thailand': 'TH', 'Togo': 'TG',
    'Trinidad and Tobago': 'TT', 'Tunisia': 'TN', 'Turkey': 'TR',
    'Turkiye': 'TR', 'Türkiye': 'TR', 'Turkmenistan': 'TM', 'Uganda': 'UG',
    'Ukraine': 'UA', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
    'United States': 'US', 'United States of America': 'US', 'USA': 'US',
    'Uruguay': 'UY', 'Uzbekistan': 'UZ', 'Venezuela': 'VE', 'Vietnam': 'VN',
    'Wales': 'GB', 'Yemen': 'YE', 'Zambia': 'ZM', 'Zimbabwe': 'ZW',
  }

  function flagUrl(country) {
    const iso2 = COUNTRY_ISO2[country]
    if (!iso2) return null
    return `https://flagcdn.com/16x12/${iso2.toLowerCase()}.png`
  }

  // ── Estado del mapa ───────────────────────────────────────────────
  let mapEl, map
  let loading      = true
  let hovered      = null
  let locked       = null
  let geolayer     = null
  let lockedLayers = []
  let hoveredLayer = null

  // ── Geocoder ──────────────────────────────────────────────────────
  let searchQuery = ''
  let searchOpen  = false
  let searchIndex = []
  let teamIndex   = new Map()  // teamKey → { data, layers[] }

  let showAll = false
  let _prevDisplayed = null

  $: filteredCountries = searchIndex.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  $: displayed = locked ?? hovered

  // Resetear toggle al cambiar de país
  $: {
    if (displayed !== _prevDisplayed) {
      _prevDisplayed = displayed
      showAll = false
    }
  }

  $: shownPlayers = showAll
    ? (displayed?.allPlayers ?? [])
    : (displayed?.players ?? [])

  function unlock() {
    lockedLayers.forEach(l => geolayer?.resetStyle(l))
    lockedLayers = []
    locked = null
  }

  function flyToTeam(teamKey) {
    const entry = teamIndex.get(teamKey)
    if (!entry) return
    let bounds = null
    entry.layers.forEach(l => {
      bounds = bounds ? bounds.extend(l.getBounds()) : l.getBounds()
    })
    unlock()
    locked = entry.data
    lockedLayers = [...entry.layers]
    lockedLayers.forEach(l => {
      l.setStyle({ weight: 2.5, color: '#00916b', fillOpacity: 1 })
      l.bringToFront()
    })
    if (bounds) map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 6, duration: 0.8 })
    searchQuery = ''
    searchOpen  = false
  }

  onMount(async () => {
    map = L.map(mapEl, { zoomControl: false }).setView([20, 10], 2)
    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '©<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ©<a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)


    const [players, geo] = await Promise.all([
      loadPlayers(),
      fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson').then(r => r.json()),
    ])
    loading = false

    const foreignByTeam = new Map()
    const allByTeam     = new Map()
    players.forEach(p => {
      if (!p.team) return
      if (!foreignByTeam.has(p.team)) foreignByTeam.set(p.team, { count: 0, players: [] })
      if (!allByTeam.has(p.team))     allByTeam.set(p.team, [])
      allByTeam.get(p.team).push(p)
      if (isForeign(p)) {
        const e = foreignByTeam.get(p.team)
        e.count++
        e.players.push(p)
      }
    })
    foreignByTeam.forEach(e => {
      e.players.sort((a, b) =>
        (a.birthplace_country ?? '').localeCompare(b.birthplace_country ?? '') ||
        (a.player_tm ?? '').localeCompare(b.player_tm ?? ''))
    })
    allByTeam.forEach(ps => {
      ps.sort((a, b) => (Number(a.jersey) || 99) - (Number(b.jersey) || 99))
    })

    function getTeamNames(feature) {
      const geoName = feature.properties.NAME ?? feature.properties.ADMIN ?? ''
      return GEO_TO_TEAMS[geoName] ?? [geoName]
    }

    geolayer = L.geoJson(geo, {
      style: feature => {
        const teams     = getTeamNames(feature)
        const qualified = teams.some(tn => QUALIFIED.has(tn))
        const count     = teams.reduce((s, tn) => s + (foreignByTeam.get(tn)?.count ?? 0), 0)
        return {
          fillColor: getColor(count, qualified),
          weight: 0.7,
          color: '#b8c4d0',
          fillOpacity: 0.88,
        }
      },
      onEachFeature: (feature, layer) => {
        const teams     = getTeamNames(feature)
        const count     = teams.reduce((s, tn) => s + (foreignByTeam.get(tn)?.count ?? 0), 0)
        const ps        = teams
          .flatMap(tn => foreignByTeam.get(tn)?.players ?? [])
          .sort((a, b) =>
            (a.team ?? '').localeCompare(b.team ?? '') ||
            (a.player_tm ?? '').localeCompare(b.player_tm ?? ''))
        const name       = teams.map(tn => t(tn)).join(' / ')
        const multiTeam  = teams.length > 1
        const qualified  = teams.some(tn => QUALIFIED.has(tn))
        const allPs      = teams
          .flatMap(tn => allByTeam.get(tn) ?? [])
          .sort((a, b) =>
            (a.team ?? '').localeCompare(b.team ?? '') ||
            (Number(a.jersey) || 99) - (Number(b.jersey) || 99))
        const data       = { name, count, players: ps, allPlayers: allPs, multiTeam, qualified }

        // Índice para el geocoder (todos los países del GeoJSON)
        teams.forEach(tn => {
          if (!teamIndex.has(tn)) teamIndex.set(tn, { data, layers: [] })
          teamIndex.get(tn).layers.push(layer)
        })

        layer.on({
          mouseover: () => {
            // Resetear el layer anterior si mouseout no llegó a dispararse
            if (hoveredLayer && hoveredLayer !== layer && !lockedLayers.includes(hoveredLayer)) {
              geolayer.resetStyle(hoveredLayer)
            }
            hoveredLayer = layer
            if (!locked) hovered = data
            layer.setStyle({ weight: 2, color: '#00916b', fillOpacity: 1 })
            layer.bringToFront()
          },
          mouseout: () => {
            if (hoveredLayer === layer) hoveredLayer = null
            if (!locked) hovered = null
            if (!lockedLayers.includes(layer)) geolayer.resetStyle(layer)
          },
          click: e => {
            L.DomEvent.stopPropagation(e)
            if (lockedLayers.includes(layer)) {
              unlock()
            } else {
              unlock()
              locked = data
              lockedLayers = [layer]
              layer.setStyle({ weight: 2.5, color: '#00916b', fillOpacity: 1 })
              layer.bringToFront()
            }
          },
        })
      },
    }).addTo(map)

    // Construir índice de búsqueda una vez cargado el GeoJSON
    const idx = []
    teamIndex.forEach((_, teamKey) => idx.push({ name: t(teamKey), teamKey }))
    idx.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    searchIndex = idx

    map.on('click', () => { if (locked) unlock() })

  })

  onDestroy(() => map?.remove())
</script>

<div class="wrapper">
  <div bind:this={mapEl} class="map"></div>

  <!-- Leyenda -->
  <div class="legend">
    <div class="legend-title">Nacidos fuera del país que defienden</div>
    {#each STEPS as { color, label }}
      <div class="legend-item">
        <span class="legend-swatch" style="background:{color}"></span>
        <span>{label}</span>
      </div>
    {/each}
  </div>

  <!-- Geocoder (bajo los botones de zoom, esquina superior derecha) -->
  <div class="geocoder">
    <div class="geocoder-input-wrap">
      <span class="geocoder-icon">⌕</span>
      <input
        type="text"
        class="geocoder-input"
        placeholder="Buscar país…"
        bind:value={searchQuery}
        on:focus={() => searchOpen = true}
        on:blur={() => setTimeout(() => { searchOpen = false }, 180)}
      />
    </div>
    {#if searchOpen && filteredCountries.length > 0}
      <ul class="geocoder-results">
        {#each filteredCountries as item}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li on:mousedown={() => flyToTeam(item.teamKey)}>{item.name}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Panel de info (abajo derecha, fijo) -->
  <div class="info-panel" class:is-locked={!!locked}>
    {#if displayed}
      <div class="info-head">
        <div class="info-head-left">
          <span class="info-country">{displayed.name}</span>
          <span class="info-subtitle" class:info-no-data={!displayed.qualified && displayed.count === 0}>
            {#if displayed.count > 0}
              {displayed.count} jugador{displayed.count !== 1 ? 'es' : ''} nacido{displayed.count !== 1 ? 's' : ''} fuera de su selección
            {:else if displayed.qualified}
              Todos nacidos en su país
            {:else}
              No clasificado al Mundial 2026
            {/if}
          </span>
        </div>
        {#if locked}
          <button class="close-btn" on:click={unlock}>×</button>
        {/if}
      </div>

      {#if displayed.qualified && displayed.allPlayers?.length > 0}
        <div class="pill-toggle">
          <button class="pill" class:pill-active={!showAll} on:click={() => showAll = false}>
            Extranjeros · {displayed.count}
          </button>
          <button class="pill" class:pill-active={showAll} on:click={() => showAll = true}>
            Todos · {displayed.allPlayers.length}
          </button>
        </div>
      {/if}

      {#if shownPlayers.length > 0}
        <ul class="info-list">
          {#each shownPlayers as p}
            <li class="info-row">
              <div class="info-top">
                <span class="info-name">{p.player_tm}</span>
                <div class="info-top-right">
                  {#if showAll && isForeign(p)}
                    <span class="foreign-dot" title="Nacido fuera del país"></span>
                  {/if}
                  <span class="pos-badge pos-{POS_MAP[p.pos] ?? 'XX'}">{POS_ES[POS_MAP[p.pos]] ?? '—'}</span>
                </div>
              </div>
              <div class="info-birth">
                {#if flagUrl(p.birthplace_country)}
                  <img class="flag-img" src={flagUrl(p.birthplace_country)} alt="" loading="lazy" />
                {/if}
                {p.birthplace_city ? `${p.birthplace_city}, ` : ''}{t(p.birthplace_country)}
                {#if displayed.multiTeam}
                  <span class="info-team-tag">· {t(p.team)}</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      <div class="info-placeholder">
        Pasa el cursor sobre un país<br>
        <span class="hint">Haz clic para fijar el panel</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="badge">
      <span class="dot pulse"></span> Cargando datos…
    </div>
  {/if}
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

  /* ── Leyenda ── */
  .legend {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 1000;
    background: rgba(255,255,255,0.93);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    backdrop-filter: blur(6px);
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  .legend-title {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 0.2rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .legend-swatch {
    width: 13px;
    height: 13px;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,0.1);
    flex-shrink: 0;
  }

  /* ── Geocoder ── */
  .geocoder {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    width: 190px;
  }

  /* Empuja el zoom de Leaflet bajo el geocoder */
  :global(.leaflet-top.leaflet-right .leaflet-control-zoom) {
    margin-top: 52px;
  }

  .geocoder-input-wrap {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.96);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 0.55rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    backdrop-filter: blur(6px);
    gap: 0.35rem;
  }

  .geocoder-icon {
    font-size: 1rem;
    color: var(--text-muted);
    line-height: 1;
    user-select: none;
  }

  .geocoder-input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: 0.78rem;
    color: var(--text);
    padding: 0.45rem 0;
    outline: none;
    min-width: 0;
  }

  .geocoder-input::placeholder { color: var(--text-muted); }

  .geocoder-results {
    list-style: none;
    margin-top: 4px;
    background: rgba(255,255,255,0.98);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    max-height: 220px;
    overflow-y: auto;
    padding: 0.25rem 0;
  }

  .geocoder-results li {
    padding: 0.42rem 0.85rem;
    font-size: 0.78rem;
    color: var(--text);
    cursor: pointer;
    transition: background 0.08s;
  }

  .geocoder-results li:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
  }

  /* ── Panel de info ── */
  .info-panel {
    position: absolute;
    bottom: 1.5rem;
    right: 1rem;
    z-index: 1000;
    background: rgba(255,255,255,0.96);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    backdrop-filter: blur(8px);
    min-width: 240px;
    max-width: 300px;
    max-height: 280px;
    overflow-y: auto;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .info-panel.is-locked {
    max-height: 65vh;
    border-color: var(--accent-dark);
    box-shadow: 0 6px 28px rgba(0,0,0,0.15), 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent);
  }

  .info-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid var(--border);
  }

  .info-head-left {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
  }

  .info-country {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text);
    line-height: 1.2;
  }

  .info-subtitle {
    font-size: 0.7rem;
    color: var(--accent-dark);
    font-weight: 600;
    line-height: 1.3;
  }

  .info-subtitle.info-no-data {
    color: var(--text-muted);
    font-weight: 400;
    font-style: italic;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.15rem;
    line-height: 1;
    padding: 0 0.15rem;
    color: var(--text-muted);
    transition: color 0.1s;
    flex-shrink: 0;
    margin-top: -0.1rem;
  }
  .close-btn:hover { color: var(--text); }

  /* ── Pill toggle ── */
  .pill-toggle {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.55rem;
  }

  .pill {
    flex: 1;
    padding: 0.28rem 0.5rem;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
  }

  .pill:hover { border-color: var(--accent-dark); color: var(--text); }

  .pill.pill-active {
    background: var(--accent);
    border-color: var(--accent);
    color: #0a2820;
  }

  /* ── Punto extranjero ── */
  .info-top-right {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .foreign-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-dark);
    flex-shrink: 0;
  }

  .info-list {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .info-row {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.38rem 0;
    border-bottom: 1px solid var(--surface2);
  }
  .info-row:last-child { border-bottom: none; }

  .info-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    min-width: 0;
  }

  .info-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .info-birth {
    font-size: 0.7rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .flag-img {
    width: 16px;
    height: 12px;
    border-radius: 1px;
    border: 0.5px solid rgba(0,0,0,0.12);
    flex-shrink: 0;
    vertical-align: middle;
  }

  .info-team-tag {
    color: var(--accent-dark);
    font-weight: 600;
  }

  .info-placeholder {
    font-size: 0.78rem;
    color: var(--text-muted);
    text-align: center;
    padding: 0.3rem 0;
    line-height: 1.6;
  }

  .hint {
    font-size: 0.68rem;
    opacity: 0.75;
  }

  /* ── Badges de posición ── */
  .pos-badge {
    display: inline-block;
    padding: 0.08rem 0.35rem;
    border-radius: 3px;
    font-size: 0.58rem;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .pos-GK { background: #fef3c7; color: #92400e; }
  .pos-DF { background: #dbeafe; color: #1e40af; }
  .pos-MF { background: #d1fae5; color: #065f46; }
  .pos-FW { background: #fce7f3; color: #9d174d; }
  .pos-XX { background: #f3f4f6; color: #6b7280; }

  /* ── Badge de carga ── */
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

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .legend {
      top: 0.6rem;
      left: 0.6rem;
      padding: 0.5rem 0.65rem;
      gap: 0.2rem;
    }
    .legend-item   { font-size: 0.67rem; }
    .legend-swatch { width: 11px; height: 11px; }

    .geocoder {
      top: 10px;
      width: 160px;
    }

    .info-panel {
      bottom: 0.75rem;
      right: 0.6rem;
      min-width: 0;
      max-width: calc(100vw - 1.2rem);
      max-height: 220px;
      padding: 0.65rem 0.8rem;
    }
    .info-panel.is-locked { max-height: 55vh; }
    .info-country { font-size: 0.85rem; }
    .badge { display: none; }
  }
</style>
