/*
 * Service worker do site: guarda o app no aparelho para abrir sem internet.
 * Os dados já ficam no IndexedDB; aqui só entram os arquivos do app.
 * A versão vem do endereço de registro (`sw.js?v=...`), que muda a cada build.
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const CACHE = `devstack-${VERSION}`

async function precache() {
  const cache = await caches.open(CACHE)
  const files = ['./', './index.html', './manifest.webmanifest', './favicon.svg']
  try {
    // Lista de tudo o que o build gerou (JS, CSS, fontes), escrita pelo Vite.
    const manifest = await (await fetch('./asset-manifest.json', { cache: 'no-store' })).json()
    for (const entry of Object.values(manifest)) {
      for (const file of [entry.file, ...(entry.css || []), ...(entry.assets || [])]) {
        if (file) files.push(`./${file}`)
      }
    }
  } catch {
    // Sem a lista, os arquivos entram no cache conforme forem usados.
  }
  await cache.addAll([...new Set(files)])
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // Páginas: tenta a rede (versão nova) e cai no cache quando está offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true })),
    )
    return
  }

  // Arquivos do build têm hash no nome: o que está no cache nunca fica velho.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
