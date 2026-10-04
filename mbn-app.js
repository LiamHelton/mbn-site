'use strict';
(() => {
 const $=id=>document.getElementById(id), FAVORITES='mbn-favorites-v1';
 let reflections=[],current=null,installEvent=null,toastTimer,midnightTimer;
 function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
 function readSaved(){try{const value=JSON.parse(localStorage.getItem(FAVORITES)||'[]');return Array.isArray(value)?value.filter(r=>r&&typeof r.id==='string'&&typeof r.text==='string'&&typeof r.cat==='string'):[];}catch(e){return [];}}
 function decode(value){const box=document.createElement('textarea');box.innerHTML=value;return box.value;}
 function mirrorURL(r){return '/archive.html?app=1#'+encodeURIComponent(r.cat)+'/'+encodeURIComponent(r.id)+'/mirror';}
 function dayNumber(date){return Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);}
 function chooseDaily(list,date=new Date()){
  const ordered=[...list].sort((a,b)=>(a.dailyIndex??Number(a.id))-(b.dailyIndex??Number(b.id)));
  const elapsed=dayNumber(date)-Math.floor(Date.UTC(2026,9,4)/86400000);
  return ordered[((elapsed%ordered.length)+ordered.length)%ordered.length];
 }
 function parseArchive(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const script=[...doc.scripts].map(s=>s.textContent).find(text=>/const\s+R\s*=\s*\[/.test(text));
  const match=script?.match(/const\s+R\s*=\s*(\[[\s\S]*?\n\]);/);
  if(!match)throw new Error('Archive data unavailable');
  const data=JSON.parse(match[1].replace(/([{,]\s*)(id|cat|text|img)\s*:/g,'$1"$2":'));
  const valid=data.filter(r=>r&&/^\d+$/.test(r.id)&&typeof r.cat==='string'&&typeof r.text==='string');
  if(!valid.length)throw new Error('No reflections found');
  return valid.map(r=>({...r,text:decode(r.text)}));
 }
 function syncFavorite(){if(!current)return;const saved=readSaved().some(r=>r.id===current.id);$('favoriteButton').setAttribute('aria-pressed',String(saved));$('favoriteButton').textContent=saved?'♥ Saved on this device':'♡ Save reflection';}
 function showDaily(){
  const now=new Date();$('todayDate').textContent=now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  if(reflections.length){current=chooseDaily(reflections,now);$('dailyQuote').textContent=current.text;$('reflectionNumber').textContent='No. '+current.id;$('mirrorLink').href=mirrorURL(current);$('favoriteButton').disabled=false;$('shareButton').disabled=false;syncFavorite();}
  clearTimeout(midnightTimer);const next=new Date(now);next.setHours(24,0,0,0);midnightTimer=setTimeout(showDaily,next-now+1000);
 }
 function renderSaved(){
  const list=$('savedList');list.replaceChildren();const saved=readSaved();
  if(!saved.length){const box=document.createElement('div');box.className='empty';const title=document.createElement('h2');title.textContent='Let a reflection stay with you.';const p=document.createElement('p');p.textContent='Tap “Save reflection” on Today to begin your collection.';box.append(title,p);list.append(box);return;}
  saved.forEach(stored=>{const r=reflections.find(x=>x.id===stored.id)||stored;const card=document.createElement('article');card.className='saved-card';const tag=document.createElement('div');tag.className='eyebrow';tag.textContent='Reflection '+r.id;const quote=document.createElement('blockquote');quote.textContent=r.text;const row=document.createElement('div');row.className='row';const link=document.createElement('a');link.href=mirrorURL(r);link.textContent='Enter The Mirror ↗';const remove=document.createElement('button');remove.className='quiet';remove.textContent='Remove';remove.setAttribute('aria-label','Remove reflection '+r.id+' from favorites');remove.onclick=()=>{try{localStorage.setItem(FAVORITES,JSON.stringify(readSaved().filter(x=>x.id!==r.id)));renderSaved();syncFavorite();toast('Removed from favorites.');}catch(e){toast('This device could not change favorites.');}};row.append(link,remove);card.append(tag,quote,row);list.append(card);});
 }
 function setView(){const key=['today','saved','more'].includes(location.hash.slice(1))?location.hash.slice(1):'today';['today','saved','more'].forEach(v=>$(v+'View').hidden=v!==key);document.querySelectorAll('[data-view]').forEach(a=>{if(a.dataset.view===key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});if(key==='saved')renderSaved();$('menuPanel').hidden=true;$('menuButton').setAttribute('aria-expanded','false');}
 async function load(){
  showDaily();try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);let response;try{response=await fetch('/archive.html',{signal:controller.signal,cache:'no-cache'});}finally{clearTimeout(timeout);}if(!response.ok)throw new Error('Archive unavailable');reflections=parseArchive(await response.text());showDaily();$('loadStatus').textContent=navigator.onLine?'':'Offline. Reading the archive stored on this device.';renderSaved();}
  catch(e){const saved=readSaved();if(saved.length){reflections=saved;showDaily();$('loadStatus').textContent='The archive could not load. Showing a saved reflection until you reconnect.';}else{$('dailyQuote').textContent='Your daily reflection is waiting in the archive.';$('loadStatus').replaceChildren();const p=document.createElement('span');p.textContent='Could not load the archive. ';const retry=document.createElement('button');retry.className='quiet';retry.textContent='Try again';retry.onclick=load;$('loadStatus').append(p,retry);}}
 }
 $('favoriteButton').onclick=()=>{if(!current)return;try{let saved=readSaved();const exists=saved.some(r=>r.id===current.id);saved=exists?saved.filter(r=>r.id!==current.id):[current,...saved];localStorage.setItem(FAVORITES,JSON.stringify(saved));syncFavorite();renderSaved();toast(exists?'Removed from favorites.':'Saved in this browser or app on this device.');}catch(e){toast('This browser could not save your favorite.');}};
 $('shareButton').onclick=async()=>{if(!current)return;const url=new URL('/archive.html#'+current.cat+'/'+current.id,location.origin).href;try{if(navigator.share)await navigator.share({title:'MBN Wisdom · '+current.id,text:current.text,url});else{await navigator.clipboard.writeText(current.text+'\n\n'+url);toast('Reflection and link copied.');}}catch(e){if(e.name!=='AbortError'){toast('Sharing is unavailable here. Open the reflection in the archive to copy its link.');}}};
 $('menuButton').onclick=()=>{const open=$('menuPanel').hidden;$('menuPanel').hidden=!open;$('menuButton').setAttribute('aria-expanded',String(open));};
 document.addEventListener('click',e=>{if(!e.target.closest('#menuPanel')&&!e.target.closest('#menuButton')){$('menuPanel').hidden=true;$('menuButton').setAttribute('aria-expanded','false');}});
 const dialog=$('installDialog');function openInstall(){$('menuPanel').hidden=true;$('menuButton').setAttribute('aria-expanded','false');$('nativeInstall').hidden=!installEvent;dialog.showModal();}
 ['installButton','moreInstall','menuInstall'].forEach(id=>$(id).onclick=openInstall);['closeInstall','doneInstall'].forEach(id=>$(id).onclick=()=>dialog.close());
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;});
 $('nativeInstallButton').onclick=async()=>{if(!installEvent)return;const event=installEvent;installEvent=null;await event.prompt();const result=await event.userChoice;$('nativeInstall').hidden=true;if(result.outcome==='accepted'){dialog.close();$('installCard').hidden=true;toast('MBN Wisdom added to your apps.');}};
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 if(standalone())$('installCard').hidden=true;
 window.addEventListener('appinstalled',()=>{$('installCard').hidden=true;installEvent=null;});
 window.addEventListener('hashchange',()=>{setView();window.scrollTo({top:0,behavior:'auto'});});
 window.addEventListener('storage',e=>{if(e.key===FAVORITES){syncFavorite();renderSaved();}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)showDaily();});
 window.addEventListener('online',()=>{load();});
 setView();load();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/mbn-sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready).then(()=>{if(navigator.onLine&&reflections.length)$('loadStatus').textContent='Your daily reflection is ready for offline reading on this device.';}).catch(()=>{console.info('MBN offline support could not start. Online reading remains available.');});
})();
