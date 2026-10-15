/* GAME DAY v44: theme-aware, on-demand embed for the public Live Schedule.
   Add via <script defer src="game-day/play-ball.js"></script> AFTER theme.js.
   No extra button markup is needed. */
(() => {
  'use strict';
  const root=document.documentElement;
  const THEMES=new Set(['tigers','red-sox']);
  const script=document.currentScript;
  const gameURL=new URL('game.html', script?.src || new URL('game-day/play-ball.js',location.href).href);
  let host,button,panel,iframe,loading,open=false,currentTeam=null;
  function getTheme(){return root.getAttribute('data-color-theme')||'original';}
  function setExpanded(next){
    open=next;
    button.setAttribute('aria-expanded', String(next));
    button.querySelector('.pb-indicator').textContent=next?'−':'+';
    panel.hidden=!next;
  }
  function unload(){
    setExpanded(false);
    if (iframe){iframe.remove();iframe=null;}
    loading.hidden=true;
  }
  function loadGame(team){
    if(iframe){iframe.remove();iframe=null;}
    iframe=document.createElement('iframe');
    iframe.className='pb-frame';
    iframe.title='GAME DAY — '+(team==='tigers'?'Tigers':'Red Sox')+' batting game';
    iframe.setAttribute('scrolling','no');
    iframe.src=gameURL.href+'?team='+encodeURIComponent(team);
    iframe.addEventListener('load',()=>{if(loading)loading.hidden=true;});
    loading.hidden=false;
    panel.append(iframe);
  }
  function updateTheme(){
    if(!host)return;
    const team=getTheme();
    const eligible=THEMES.has(team);
    host.hidden=!eligible;
    if(!eligible){unload();currentTeam=null;return;}
    host.dataset.team=team;
    if(team!==currentTeam){
      currentTeam=team;
      if(open) loadGame(team);
      else if(iframe){iframe.remove();iframe=null;}
    }
  }
  function build(){
    if(document.getElementById('play-ball-secret') || !document.querySelector('main'))return;
    const main=document.querySelector('main');
    host=document.createElement('section');host.id='play-ball-secret';host.className='pb-widget';host.hidden=true;
    button=document.createElement('button');button.className='pb-toggle';button.type='button';
    button.id='play-ball-trigger';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','play-ball-panel');
    const label=document.createElement('span');label.className='pb-title';
    const ball=document.createElement('span');ball.className='pb-ball';ball.textContent='⚾';ball.setAttribute('aria-hidden','true');
    label.append(ball,document.createTextNode('Play Ball'));
    const ind=document.createElement('span');ind.className='pb-indicator';ind.textContent='+';ind.setAttribute('aria-hidden','true');
    button.append(label,ind);
    panel=document.createElement('div');panel.className='pb-panel';panel.id='play-ball-panel';panel.hidden=true;
    loading=document.createElement('div');loading.className='pb-loading';loading.textContent='LOADING STADIUM…';loading.hidden=true;
    panel.append(loading);
    host.append(button,panel);
    const footer=main.querySelector('footer');
    // The existing color theme locker sits before the footer; insert Play Ball after it.
    if(footer)main.insertBefore(host,footer);else main.append(host);
    button.addEventListener('click',()=>{
      if(open){setExpanded(false);return;}
      const team=getTheme();if(!THEMES.has(team))return;
      setExpanded(true);
      if(!iframe)loadGame(team);
      requestAnimationFrame(()=>host.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
    });
    updateTheme();
    new MutationObserver(updateTheme).observe(root,{attributes:true,attributeFilter:['data-color-theme']});
    // The saved theme may also change in a second browser tab.
    window.addEventListener('storage',(ev)=>{if(ev.key==='akihiro-color-theme-v1')requestAnimationFrame(updateTheme);});
  }
  window.addEventListener('message',(event)=>{
    if(!iframe || event.source!==iframe.contentWindow)return;
    if(location.protocol!=='file:' && event.origin!==location.origin)return;
    const data=event.data;
    if(!data || data.type!=='ak-play-ball-height-v44')return;
    const n=Number(data.height);
    if(Number.isFinite(n)&&n>=250&&n<=2400){iframe.style.height=n+'px';loading.hidden=true;}
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
