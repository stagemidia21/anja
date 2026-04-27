const CACHE = 'anja-v2'
const STATIC = ['/offline.html', '/icon-192.png', '/icon-512.png']

// Instala e pré-cacheia assets estáticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

// Ativa e limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Estratégia de fetch
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Ignora extensões do Chrome, DevTools e requisições não-HTTP
  if (!url.protocol.startsWith('http')) return
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // API e Supabase → sempre rede (sem cache)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  // Assets estáticos Next.js (_next/static) → cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Imagens e fontes → cache-first com fallback de rede
  if (request.destination === 'image' || request.destination === 'font') {
    e.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request))
    )
    return
  }

  // Navegação (HTML) → network-first com fallback offline
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    )
    return
  }
})

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Anja', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/dashboard' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/dashboard'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.includes(url))
      if (match) return match.focus()
      return clients.openWindow(url)
    })
  )
})
