/* Akihiro Kokufukata — Favorite Team Locker v15
   Original selection/storage behavior retained; categories and swatches removed.
   Works with index.html and the existing page layout. */
(() => {
  'use strict';
  const KEY = 'akihiro-color-theme-v1'; // keep existing visitor selection
  const VARS = ['--paper','--card','--ink','--muted','--crimson',
                '--crimson-dark','--line','--theme-event-bg'];
  const original = {
    id: 'original', label: 'ORIGINAL', fullName: 'Original', emoji: '',
    tone: 'light',
    c: ['#f3eee5','#f7f2e9','#181313','#756b66','#98182a','#76101f','#cfc2b6','rgba(247,242,233,.66)']
  };
  const teams = [
    {id:'tigers',label:'TIGERS',fullName:'Hanshin Tigers',emoji:'🐯',tone:'light',
      c:['#FFFDF2','#FFFFFF','#111111','#5A564A','#FFD400','#D6B200','#CFC7A7','rgba(255,255,255,.84)']},
    {id:'celtics',label:'CELTICS',fullName:'Boston Celtics',emoji:'☘️',tone:'light',
      c:['#F3F1E6','#FCFAF1','#12352A','#607066','#007A33','#005B26','#B8C2A8','rgba(252,250,241,.88)']},
    {id:'bruins',label:'BRUINS',fullName:'Boston Bruins',emoji:'🧸',tone:'dark',
      c:['#111111','#1C1C1C','#F7F2E7','#BCB4A4','#FFB81C','#D68F00','#4A4332','rgba(28,28,28,.90)']},
    {id:'red-sox',label:'RED SOX',fullName:'Boston Red Sox',emoji:'🧦',tone:'light',
      c:['#FFFFFF','#FFFAFB','#244A70','#586B7D','#E31837','#B9142C','#D2DAE3','#FFFAFB']},
    {id:'liverpool',label:'LIVERPOOL',fullName:'Liverpool FC',emoji:'🐦‍🔥',tone:'light',
      c:['#F6EFE9','#FFF9F4','#241416','#746260','#C8102E','#980B22','#D5BEB9','rgba(255,249,244,.86)']},
    {id:'patriots',label:'PATRIOTS',fullName:'New England Patriots',emoji:'🏈',tone:'dark',
      c:['#002244','#0B2C50','#F5F5F5','#B0B7BC','#C60C30','#940923','#60758A','rgba(11,44,80,.86)']}
  ];
  const all = new Map([original, ...teams].map(t => [t.id,t]));

  function apply(id, save=true) {
    const t = all.get(id) || original;
    const root = document.documentElement;
    root.dataset.colorTheme = t.id;
    root.dataset.themeTone = t.tone;
    VARS.forEach((v,i) => root.style.setProperty(v,t.c[i]));
    if (save) { try { localStorage.setItem(KEY,t.id); } catch (_) {} }
    document.querySelectorAll('.theme-choice').forEach(button => {
      const selected = button.dataset.themeId === t.id;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }

  function makeButton(t, extra='') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-choice' + (extra ? ' ' + extra : '');
    button.dataset.themeId = t.id;
    button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label',t.fullName);
    const name = document.createElement('span');
    name.className = 'theme-choice-name';
    name.append(document.createTextNode(t.label));
    if (t.emoji) {
      const emoji = document.createElement('span');
      emoji.className = 'theme-choice-emoji';
      emoji.setAttribute('aria-hidden','true');
      emoji.textContent = t.emoji;
      name.append(emoji);
    }
    button.append(name);
    button.addEventListener('click',()=>apply(t.id));
    return button;
  }

  function build() {
    const main = document.querySelector('main');
    if (!main || document.querySelector('.theme-locker')) return;
    const section = document.createElement('section');
    section.className = 'theme-locker';
    const trigger = document.createElement('button');
    trigger.className = 'theme-locker-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-controls','favorite-team-panel');
    trigger.innerHTML = '<span>COLOR THEMES</span><span class="theme-locker-mark" aria-hidden="true">+</span>';
    const panel = document.createElement('div');
    panel.id = 'favorite-team-panel';
    panel.className = 'theme-panel';
    panel.append(makeButton(original,'theme-original'));
    const grid = document.createElement('div');
    grid.className = 'theme-grid';
    teams.forEach(t => grid.append(makeButton(t)));
    panel.append(grid);
    trigger.addEventListener('click',()=>{
      const open = section.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(open));
      trigger.querySelector('.theme-locker-mark').textContent = open ? '−' : '+';
    });
    section.append(trigger,panel);
    const footer = main.querySelector('footer');
    if (footer) main.insertBefore(section,footer);
    else main.append(section);
    apply(document.documentElement.dataset.colorTheme||'original',false);
  }

  let saved = 'original';
  try { saved = localStorage.getItem(KEY)||'original'; } catch (_) {}
  apply(saved,false);
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',build,{once:true});
  else build();
  window.AkihiroColorLocker={apply,reset:()=>apply('original')};
})();
