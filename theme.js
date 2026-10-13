(()=>{"use strict";
const KEY="akihiro-color-theme-v1";
const original={id:"original",label:"ORIGINAL",tone:"light",sw:["#f3eee5","#98182a","#181313"],w:[56,26,18],c:["#f3eee5","#f7f2e9","#181313","#756b66","#98182a","#76101f","#cfc2b6","rgba(247,242,233,.66)"]};
const groups=[
["BASEBALL",[
["tigers","HANSHIN TIGERS",["#FFD400","#111111","#FFFFFF"],[45,38,17],["#FFFDF2","#FFFFFF","#111111","#5A564A","#FFD400","#D6B200","#CFC7A7","rgba(255,255,255,.84)"],"light"],
["red-sox","BOSTON RED SOX",["#0B1F33","#BD3039","#FFFFFF"],[52,28,20],["#0B1F33","#132A43","#F7F2E8","#B7C0CA","#BD3039","#8F2028","#405266","rgba(19,42,67,.84)"],"dark"]
]],
["NFL",[
["patriots","NEW ENGLAND PATRIOTS",["#002244","#C60C30","#B0B7BC","#FFFFFF"],[50,27,15,8],["#002244","#0B2C50","#F5F5F5","#B0B7BC","#C60C30","#940923","#60758A","rgba(11,44,80,.86)"],"dark"]
]],
["SOCCER",[
["liverpool","LIVERPOOL",["#C8102E","#FFFFFF","#00B2A9"],[66,24,10],["#F6EFE9","#FFF9F4","#241416","#746260","#C8102E","#980B22","#D5BEB9","rgba(255,249,244,.86)"],"light"]
]],
["NBA",[
["celtics","BOSTON CELTICS",["#007A33","#FFFFFF","#BA9653"],[58,30,12],["#F3F1E6","#FCFAF1","#12352A","#607066","#007A33","#005B26","#B8C2A8","rgba(252,250,241,.88)"],"light"]
]],
["NHL",[
["bruins","BOSTON BRUINS",["#111111","#FFB81C","#FFFFFF"],[56,36,8],["#111111","#1C1C1C","#F7F2E7","#BCB4A4","#FFB81C","#D68F00","#4A4332","rgba(28,28,28,.90)"],"dark"]
]]
];
const all=new Map([[original.id,original],...groups.flatMap(g=>g[1].map(t=>[t[0],{id:t[0],label:t[1],sw:t[2],w:t[3],c:t[4],tone:t[5]}]))]);
function apply(id,save=true){const t=all.get(id)||original,c=t.c,r=document.documentElement;
r.dataset.colorTheme=t.id;r.dataset.themeTone=t.tone;
["--paper","--card","--ink","--muted","--crimson","--crimson-dark","--line","--theme-event-bg"].forEach((v,i)=>r.style.setProperty(v,c[i]));
if(save)try{localStorage.setItem(KEY,t.id)}catch(e){}
document.querySelectorAll(".theme-choice").forEach(b=>{let s=b.dataset.themeId===t.id;b.classList.toggle("selected",s);b.setAttribute("aria-pressed",s)})}
function sw(t){let s=document.createElement("span");s.className="theme-swatch";t.sw.forEach((c,i)=>{let x=document.createElement("i");x.style.background=c;x.style.flexGrow=t.w[i];s.append(x)});return s}
function btn(t,extra=""){let b=document.createElement("button");b.type="button";b.className="theme-choice "+extra;b.dataset.themeId=t.id;b.setAttribute("aria-pressed","false");
let n=document.createElement("span");n.className="theme-choice-name";n.textContent=t.label;b.append(n,sw(t));b.onclick=()=>apply(t.id);return b}
function build(){if(document.querySelector(".theme-locker")||!document.querySelector("main"))return;
let sec=document.createElement("section");sec.className="theme-locker";
let tr=document.createElement("button");tr.type="button";tr.className="theme-locker-trigger";tr.setAttribute("aria-expanded","false");
tr.innerHTML='<span>COLOR THEMES</span><span class="theme-locker-mark">+</span>';
let p=document.createElement("div");p.className="theme-panel";p.append(btn(original,"theme-original"));
groups.forEach(g=>{let d=document.createElement("details");d.className="theme-category";let s=document.createElement("summary");
s.innerHTML=`<span class="theme-category-name">${g[0]}</span><span class="theme-category-count">${String(g[1].length).padStart(2,"0")}</span>`;
let grid=document.createElement("div");grid.className="theme-grid";g[1].forEach(x=>grid.append(btn({id:x[0],label:x[1],sw:x[2],w:x[3],c:x[4],tone:x[5]})));d.append(s,grid);p.append(d)});
tr.onclick=()=>{let o=sec.classList.toggle("open");tr.setAttribute("aria-expanded",o);tr.querySelector(".theme-locker-mark").textContent=o?"−":"+"};
sec.append(tr,p);let main=document.querySelector("main"),footer=main.querySelector("footer");footer?main.insertBefore(sec,footer):main.append(sec);apply(document.documentElement.dataset.colorTheme||"original",false)}
let saved="original";try{saved=localStorage.getItem(KEY)||"original"}catch(e){}apply(saved,false);
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",build,{once:true}):build();
window.AkihiroColorLocker={apply,reset:()=>apply("original")};
})();