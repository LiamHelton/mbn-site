'use strict';
const CACHE='mbn-practice-v1';
const SHELL=['/app.html','/mbn-app.css','/mbn-app.js','/mbn.webmanifest','/mbn-icon-180.png','/mbn-icon-192.png','/mbn-icon-512.png','/mbn-icon-maskable.png','/archive.html','/coffee-with-liam.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mbn-practice-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
function eligible(url){return ['/app','/app.html','/archive','/archive.html','/coffee-with-liam','/coffee-with-liam.html',...SHELL.slice(1,8)].includes(url.pathname);}
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!eligible(url))return;
 const cachePromise=caches.open(CACHE);
 const network=fetch(req);
 // Keep the cache update alive, even when a slow network loses the race to offline content.
 event.waitUntil(network.then(async response=>{if(response.ok)await(await cachePromise).put(req,response.clone());}).catch(()=>{}));
 event.respondWith((async()=>{
  const cache=await cachePromise;
  const cached=await cache.match(req,{ignoreSearch:true})||await cache.match(url.pathname+'.html');
  let timer;
  try{const response=await Promise.race([network,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Network timeout')),5000))]);clearTimeout(timer);if(response.ok||!cached)return response;return cached;}
  catch(e){clearTimeout(timer);if(cached)return cached;return new Response('Reconnect to open this part of MBN Wisdom.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
 })());
});
