const CACHE='sobrecarga-v11';
const ASSETS=['./','./index.html','./styles.css','./app.js','./engine.js','./firebase-config.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const requestUrl=new URL(event.request.url);
  if(requestUrl.origin===self.location.origin && (event.request.mode==='navigate' || ['app.js','styles.css','sw.js','index.html'].some(name=>requestUrl.pathname.endsWith(name)))){
    event.respondWith(fetch(event.request).then(response=>{if(response.ok){caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
