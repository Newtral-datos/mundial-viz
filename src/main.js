import App from './App.svelte'
import 'leaflet/dist/leaflet.css'
import './app.css'

const app = new App({ target: document.getElementById('app') })

// Emite la altura al padre cuando está embebido en un iframe
function broadcastHeight() {
  const h = window.innerWidth < 640 ? 500 : 650
  window.parent.postMessage({ iframeHeight: h }, '*')
}
window.addEventListener('DOMContentLoaded', broadcastHeight)
window.addEventListener('resize', broadcastHeight)

export default app
