'use strict';
const CACHE='nanowar-v6-ppo-touch';
const SCOPE=self.registration.scope;
const ASSETS=['./','index.html','manifest.webmanifest','src/style.css','src/core.js','src/levels-data.js','src/levels.js','src/campaign.js','src/ai.js','src/ppo-model.js','src/ai-ppo.js','src/render.js','src/input.js','src/app.js','src/arena-maps.js','src/arena.js','src/net-client.js','icons/icon-192.png','icons/icon-512.png'].map(p=>new URL(p,SCOPE).href);
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>null)))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;if(u.pathname.includes('/api/'))return;
 if(r.mode==='navigate'||r.destination==='style'||r.destination==='script'||r.destination==='manifest'){e.respondWith(fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));return res;}).catch(()=>caches.match(r).then(hit=>hit||caches.match(new URL('index.html',SCOPE).href))));return;}
 e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));return res;})));});
