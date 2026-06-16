<script>
  import Router from 'svelte-spa-router'
  import Nav from './components/Nav.svelte'
  import Mapa from './routes/Mapa.svelte'
  import Tabla from './routes/Tabla.svelte'

  const routes = {
    '/': Mapa,
    '/tabla': Tabla,
  }
</script>

<Nav />
<main>
  <Router {routes} />
</main>
<footer><em>Datos de FIFA y Transfermarkt</em></footer>

<style>
  main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  footer {
    flex-shrink: 0;
    text-align: center;
    font-size: 0.72rem;
    color: var(--text-muted);
    padding: 0.5rem;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }
</style>
