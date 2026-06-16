<script>
  import { link, location } from 'svelte-spa-router'
  const logoUrl = `${import.meta.env.BASE_URL}logo-newtral.png`
</script>

<nav>
  <span class="brand">Mundial 2026</span>
  <div class="links">
    <a href="/" use:link class:active={$location === '/'}>Mapa</a>
    <a href="/tabla" use:link class:active={$location === '/tabla'}>Jugadores</a>
  </div>
  <img class="logo" src={logoUrl} alt="Newtral" />
</nav>

<style>
  nav {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 0 1.5rem;
    height: 52px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  .brand {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-dark);
  }

  .links { display: flex; gap: 0.25rem; flex: 1; }

  .logo {
    height: 24px;
    width: auto;
    display: block;
  }

  @media (max-width: 480px) {
    nav { padding: 0 0.75rem; gap: 0.75rem; }
    .brand { font-size: 0.75rem; }
  }

  a {
    padding: 0.35rem 0.85rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: color 0.15s, background 0.15s;
  }

  a:hover {
    color: var(--text);
    background: var(--surface2);
  }

  a.active {
    color: var(--accent-dark);
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    font-weight: 600;
  }
</style>
