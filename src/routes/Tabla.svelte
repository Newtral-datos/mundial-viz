<script>
  import { onMount } from 'svelte'
  import { loadPlayers, formatMV, formatDOB, t, POS_MAP, POS_ES } from '../lib/data.js'

  // Grupos del sorteo FIFA 2026 (diciembre 2024)
  const GROUPS = {
    A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
    B: ['Canada', 'Bosnia-Herzegovina', 'Qatar', 'Switzerland'],
    C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
    D: ['United States', 'Paraguay', 'Australia', 'Turkiye'],
    E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
    F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
    G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
    H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
    I: ['France', 'Senegal', 'Iraq', 'Norway'],
    J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
    K: ['Portugal', 'Democratic Republic of the Congo', 'Uzbekistan', 'Colombia'],
    L: ['England', 'Croatia', 'Ghana', 'Panama'],
  }

  let players      = []
  let loading      = true
  let error        = null
  let search = ''

  // Dos niveles de acordeón: grupos y equipos dentro del grupo
  let openGroups = new Set()
  let openTeams  = new Set()

  onMount(async () => {
    try {
      players  = await loadPlayers()
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  })

  function toggleGroup(letter) {
    openGroups.has(letter) ? openGroups.delete(letter) : openGroups.add(letter)
    openGroups = openGroups
  }

  function toggleTeam(team) {
    openTeams.has(team) ? openTeams.delete(team) : openTeams.add(team)
    openTeams = openTeams
  }

  $: filtered = players.filter(p => {
    if (search && !(
      p.player_tm?.toLowerCase().includes(search.toLowerCase()) ||
      p.club?.toLowerCase().includes(search.toLowerCase())
    )) return false
    return true
  })

  $: groupData = Object.entries(GROUPS).map(([letter, teamNames]) => ({
    letter,
    teams: teamNames.map(name => ({
      name,
      players: filtered
        .filter(p => p.team === name)
        .sort((a, b) => (Number(a.jersey) || 99) - (Number(b.jersey) || 99)),
    })),
  }))

  // Cuando hay búsqueda, mostrar todos los grupos/equipos con resultados ignorando el estado manual
  $: visibleGroups = search
    ? new Set(groupData.filter(g => g.teams.some(tm => tm.players.length > 0)).map(g => g.letter))
    : openGroups

  $: visibleTeams = search
    ? new Set(groupData.flatMap(g => g.teams.filter(tm => tm.players.length > 0).map(tm => tm.name)))
    : openTeams


</script>

<div class="page">

  <!-- Barra de filtros -->
  <div class="bar filter-bar">
    <span class="hint-text">Pincha en los grupos y en las selecciones para ver a sus jugadores</span>
    <input
      class="search"
      type="search"
      placeholder="Buscar jugador o club…"
      bind:value={search}
    />
  </div>

  <!-- Grupos -->
  {#if loading}
    <div class="empty">Cargando…</div>
  {:else if error}
    <div class="empty error">Error: {error}</div>
  {:else}
    <div class="groups-list">
      {#each groupData as { letter, teams }}
        {#if !search || teams.some(tm => tm.players.length > 0)}
          <div class="group-block">

            <!-- Cabecera de grupo -->
            <button class="group-header" on:click={() => toggleGroup(letter)}>
              <span class="group-badge">Grupo {letter}</span>
              <span class="group-teams-preview">
                {teams.map(tm => t(tm.name)).join(' - ')}
              </span>
              <span class="chevron" class:open={visibleGroups.has(letter)}>▸</span>
            </button>

            <!-- Equipos del grupo -->
            {#if visibleGroups.has(letter)}
              <div class="teams-list">
                {#each teams as { name, players: squad }}
                  {#if !search || squad.length > 0}
                    <div class="team-block">

                      <button class="team-header" on:click={() => toggleTeam(name)}>
                        <span class="chevron small" class:open={visibleTeams.has(name)}>▸</span>
                        <span class="team-name">{t(name)}</span>
                      </button>

                      {#if visibleTeams.has(name)}
                        <div class="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th class="center">#</th>
                                <th>Jugador</th>
                                <th>Pos.</th>
                                <th class="col-secondary">Nacimiento</th>
                                <th class="col-secondary">Club</th>
                                <th class="right col-hide">Valor</th>
                                <th>Lugar de nacimiento</th>
                              </tr>
                            </thead>
                            <tbody>
                              {#each squad as p}
                                <tr>
                                  <td class="center muted">{p.jersey ?? '—'}</td>
                                  <td class="player-name">
                                    <a href={p.tm_url} target="_blank" rel="noopener">{p.player_tm}</a>
                                  </td>
                                  <td>
                                    <span class="pos-badge pos-{POS_MAP[p.pos] ?? 'XX'}">
                                      {POS_ES[POS_MAP[p.pos]] ?? p.pos ?? '—'}
                                    </span>
                                  </td>
                                  <td class="muted col-secondary">{formatDOB(p.dob)}</td>
                                  <td class="muted col-secondary">{p.club ?? '—'}</td>
                                  <td class="value right col-hide">{formatMV(p.market_value)}</td>
                                  <td class="muted">
                                    {p.birthplace_city ? `${p.birthplace_city}, ${t(p.birthplace_country)}` : '—'}
                                  </td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      {/if}

                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

          </div>
        {/if}
      {/each}
    </div>
  {/if}

</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* ── Barras ── */
  .bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.55rem 1.25rem;
  }

  .search {
    padding: 0.38rem 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text);
    font-family: inherit;
    font-size: 0.82rem;
    width: 240px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search:focus {
    border-color: var(--accent-dark);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
  }

  /* ── Filtros ── */
  .filter-bar { gap: 0.75rem; flex-wrap: wrap; }

  .hint-text {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .filter-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .divider {
    width: 1px;
    height: 22px;
    background: var(--border);
    flex-shrink: 0;
  }

  /* ── Lista de grupos ── */
  .groups-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  /* ── Bloque de grupo ── */
  .group-block {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    background: var(--surface);
    flex-shrink: 0;
  }

  .group-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 1rem;
    background: var(--surface);
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text);
    font-family: inherit;
    font-size: 0.85rem;
    transition: background 0.12s;
  }
  .group-header:hover { background: var(--surface2); }

  .group-badge {
    font-weight: 700;
    font-size: 0.78rem;
    background: var(--accent);
    color: #0a2820;
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }

  .group-teams-preview {
    flex: 1;
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chevron {
    color: var(--text-muted);
    font-size: 0.65rem;
    transition: transform 0.15s;
    display: inline-block;
    flex-shrink: 0;
  }
  .chevron.small { font-size: 0.55rem; }
  .chevron.open  { transform: rotate(90deg); }

  /* ── Equipos dentro del grupo ── */
  .teams-list {
    border-top: 1px solid var(--border);
    background: var(--bg);
  }

  .team-block { border-bottom: 1px solid var(--border); }
  .team-block:last-child { border-bottom: none; }

  .team-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.5rem 1.25rem;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text);
    font-family: inherit;
    font-size: 0.82rem;
    transition: background 0.1s;
  }
  .team-header:hover { background: color-mix(in srgb, var(--accent) 6%, transparent); }

  .team-name { font-weight: 600; flex: 1; }

  .no-players {
    padding: 0.5rem 1.5rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    font-style: italic;
  }

  /* ── Tabla de jugadores ── */
  .table-wrap {
    overflow-x: auto;
    border-top: 1px solid var(--border);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
    background: var(--surface);
  }

  thead th {
    padding: 0.4rem 0.85rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.08s;
  }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }

  td { padding: 0.38rem 0.85rem; white-space: nowrap; vertical-align: middle; }

  .center { text-align: center; }
  .right  { text-align: right; }
  .muted  { color: var(--text-muted); }

  .player-name a {
    color: var(--text);
    font-weight: 500;
    transition: color 0.1s;
  }
  .player-name a:hover { color: var(--accent-dark); }

  .value { color: var(--accent-dark); font-weight: 600; }

  .pos-badge {
    display: inline-block;
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    font-size: 0.67rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .pos-GK { background: #fef3c7; color: #92400e; }
  .pos-DF { background: #dbeafe; color: #1e40af; }
  .pos-MF { background: #d1fae5; color: #065f46; }
  .pos-FW { background: #fce7f3; color: #9d174d; }

  .empty { padding: 3rem; text-align: center; color: var(--text-muted); }
  .error { color: #dc2626; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .bar {
      padding: 0.5rem 0.75rem;
      gap: 0.5rem;
    }

    .filter-bar {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .divider { display: none; }

    .search {
      width: 100%;
    }

    .groups-list { padding: 0.5rem 0.6rem; }

    .group-header { padding: 0.6rem 0.75rem; font-size: 0.82rem; }

    .group-teams-preview { font-size: 0.74rem; }

    .team-header { padding: 0.45rem 0.85rem; }

    td { padding: 0.35rem 0.6rem; }
    thead th { padding: 0.35rem 0.6rem; }

    .col-secondary { display: none; }
    .col-hide      { display: none; }
  }
</style>
