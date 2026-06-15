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

<style>
  main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
