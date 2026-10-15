
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const field = $("field");
  const pitcher = $("pitcher");
  const ball = $("pitchBall");
  const hitBall = $("battedBall");
  const bat = $("bat");
  const pitchBtn = $("pitchBtn");
  const resetBtn = $("resetBtn");
  const feedback = $("feedback");
  const zone = $("strikeZone");
  const fireworks = $("fireworksEffect");

  const S = {
    phase:"idle", balls:0, strikes:0, outs:0,
    inning:1, pitches:0, runs:0, hits:0,
    homers:0, walks:0, bases:[false,false,false],
    innings:[0], pitch:null, start:0, impact:0,
    frame:0, token:0
  };

  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const random = (a,b) => a+Math.random()*(b-a);

  const types = [
    ["FASTBALL",145,0,0],
    ["SLIDER",130,.12,0],
    ["CURVE",112,.10,.13],
    ["SINKER",136,-.09,.11],
    ["TWO-SEAM",140,-.09,0],
    ["CHANGEUP",110,0,.05]
  ];

  function position(el,x,y,scale=1) {
    el.style.left=x*100+"%";
    el.style.top=y*100+"%";
    el.style.transform=
      `translate(-50%,-50%) scale(${scale})`;
  }

  function message(text,type="out",extra="") {
    feedback.dataset.result=type;
    feedback.textContent=text;
    if(extra) {
      const small=document.createElement("small");
      small.textContent=extra;
      feedback.append(small);
    }
    feedback.classList.add("show");
    $("lastPlay").textContent=text;
    $("lastPlay").dataset.result=type;
    clearTimeout(message.timer);
    message.timer=setTimeout(
      ()=>feedback.classList.remove("show"),1450
    );
  }

  function celebrate(mode="score") {
    if(!fireworks)return;
    fireworks.className="fireworks-effect";
    void fireworks.offsetWidth;
    fireworks.classList.add("active",mode);
    setTimeout(()=>{
      fireworks.classList.remove("active",mode);
    },2000);
  }

  function hud() {
    [["balls",S.balls],["strikes",S.strikes],
     ["outs",S.outs]].forEach(([id,count])=>{
      const el=$(id);
      [...el.children].forEach((child,i)=>{
        child.classList.toggle("on",i<count);
      });
    });

    S.bases.forEach((occupied,i)=>{
      $("base"+(i+1)).classList.toggle("on",occupied);
    });

    $("runs").textContent=S.runs;
    $("hits").textContent=S.hits;
    $("homers").textContent=S.homers;
    $("walks").textContent=S.walks;
    $("pitchCount").textContent="PITCH #"+S.pitches;

    const suffix=S.inning===1?"ST":
      S.inning===2?"ND":S.inning===3?"RD":"TH";
    $("inning").textContent="TOP "+S.inning+suffix;

    $("battingLine").textContent=
      `${S.runs} RUNS · ${S.hits} HITS · ${S.homers} HR`;

    $("scoreTeam").textContent=
      document.body.classList.contains("red-sox")
      ?"RED SOX":"TIGERS";

    const first=Math.max(1,S.inning-8);
    document.querySelectorAll("[data-inning-head]")
      .forEach((el,i)=>{
        const n=first+i;
        el.textContent=n;
        el.classList.toggle("active",n===S.inning);
      });

    document.querySelectorAll("[data-inning-run]")
      .forEach((el,i)=>{
        const n=first+i;
        const score=S.innings[n-1]||0;
        el.textContent=n<S.inning?String(score):
          n===S.inning?(score?String(score):""):"·";
      });

    const range=document.querySelector(".board-footer strong");
    if(range)range.textContent=`${first}–${first+8}`;
  }

  function idle() {
    S.phase="idle";
    pitchBtn.disabled=false;
    field.classList.remove("playing","batting");
    ball.style.opacity=0;
    zone.classList.remove("ready");
    ball.classList.remove("sweet-spot");
    $("pitchHalo").classList.remove("visible");
  }

  function nextOut(count=1) {
    S.outs+=count;
    S.balls=0;
    S.strikes=0;
    if(S.outs>=3) {
      S.outs=0;
      S.inning++;
      S.innings[S.inning-1]??=0;
      S.bases=[false,false,false];
      $("phaseLabel").textContent="CHANGE!";
    }
    hud();
  }

  function score(runs) {
    S.runs+=runs;
    S.innings[S.inning-1]+=runs;
    if(runs>0)celebrate("score");
  }

  function advance(n) {
    const next=[false,false,false];
    let runs=0;
    for(let i=2;i>=0;i--) {
      if(!S.bases[i])continue;
      if(i+n>=3)runs++;
      else next[i+n]=true;
    }
    if(n===4)runs++;
    else next[n-1]=true;
    S.bases=next;
    score(runs);
    return runs;
  }

  function finish(text,type,extra="") {
    message(text,type,extra);
    hud();
    idle();
  }

  function walk() {
    S.walks++;
    const [a,b,c]=S.bases;
    if(a&&b&&c)score(1);
    S.bases=!a?[true,b,c]:
      !b?[true,true,c]:[true,true,true];
    S.balls=0;
    S.strikes=0;
    finish("WALK!","walk");
  }

  function miss(swung=false) {
    if(!swung&&S.pitch.zone==="ball") {
      S.balls++;
      if(S.balls>=4){walk();return;}
      finish("BALL","ball");
      return;
    }
    S.strikes++;
    if(S.strikes>=3) {
      nextOut();
      finish("STRIKE OUT!","strikeout");
    } else {
      finish(swung?"SWING & MISS!":"STRIKE!",
        "strike");
    }
  }

  function makePitch() {
    const type=types[Math.floor(Math.random()*types.length)];
    const speed=type[1]+random(-5,5);
    return {
      name:type[0],speed,
      dx:type[2],dy:type[3],
      x:random(-.09,.09),
      y:random(-.07,.08),
      duration:clamp(1550-speed*5,650,1100),
      zone:Math.random()<.77?"strike":"ball"
    };
  }

  function trajectory(t) {
    const p=S.pitch;
    const curve=t*t;
    return [
      .5+p.x*t+p.dx*curve,
      .48+.34*t+p.y*t+p.dy*curve
    ];
  }

  function pitch() {
    if(S.phase!=="idle")return;
    S.token++;
    const token=S.token;
    S.pitch=makePitch();
    S.pitches++;
    S.phase="windup";
    S.start=performance.now()+550;
    S.impact=S.start+S.pitch.duration*.83;
    pitchBtn.disabled=true;
    field.classList.add("playing","batting");
    pitcher.src="./pitch-ready.png";
    pitcher.classList.remove("release");
    $("phaseLabel").textContent="WINDUP...";
    $("pitchReadout").textContent="LAST PITCH: —";
    hud();

    function frame(now) {
      if(token!==S.token)return;
      if(now<S.start) {
        S.frame=requestAnimationFrame(frame);
        return;
      }
      if(S.phase==="windup") {
        S.phase="pitching";
        pitcher.src="./pitch-release.png";
        pitcher.classList.add("release");
        $("phaseLabel").textContent="PITCH INCOMING!";
      }
      if(S.phase!=="pitching")return;
      const t=clamp((now-S.start)/S.pitch.duration,0,1);
      const [x,y]=trajectory(t);
      position(ball,x,y,.2+t);
      ball.style.opacity=1;
      const sweet=Math.abs(now-S.impact)<75;
      ball.classList.toggle("sweet-spot",sweet);
      zone.classList.toggle("ready",sweet);
      if(t>=1){miss(false);return;}
      S.frame=requestAnimationFrame(frame);
    }
    S.frame=requestAnimationFrame(frame);
  }

  function contact(dx,dy,elapsed) {
    if(!["windup","pitching"].includes(S.phase))return;
    cancelAnimationFrame(S.frame);
    S.phase="flight";
    field.classList.remove("batting");
    bat.classList.add("swing");
    setTimeout(()=>bat.classList.remove("swing"),220);

    const length=Math.hypot(dx,dy);
    const timing=Math.abs(performance.now()-S.impact);
    if(length<20||timing>275) {
      miss(true);return;
    }

    const vertical=-dy/length;
    const horizontal=dx/length;
    const quality=Math.exp(-Math.pow(timing/116,2));
    const power=clamp(length/160,0,1);
    const carry=36+72*Math.pow(quality,1.75)
      +11*power+8*clamp(vertical,0,1)+7;

    if(Math.abs(horizontal)>.83||vertical<-.18) {
      S.strikes=Math.min(2,S.strikes+1);
      finish("FOUL!","foul");return;
    }

    let result;
    if(vertical<.55||carry<96)result="GROUND OUT!";
    else if(carry>=131)result="HOME RUN!";
    else if(carry>=117)result="DOUBLE!";
    else result="SINGLE!";

    if(result==="GROUND OUT!"&&S.bases[0]
       &&S.outs<2&&Math.random()<.42)
      result="DOUBLE PLAY!";

    ball.style.opacity=0;
    hitBall.style.opacity=1;
    const started=performance.now();
    const token=S.token;
    const homer=result==="HOME RUN!";
    const ground=result.includes("GROUND")||
      result==="DOUBLE PLAY!";
    const duration=homer?1200:ground?650:850;

    function fly(now) {
      if(token!==S.token)return;
      const t=clamp((now-started)/duration,0,1);
      const x=.5+horizontal*.42*t;
      const target=homer?-.15:ground?.75:.4;
      const y=.83+(target-.83)*t
        -(ground?.01:.2)*Math.sin(Math.PI*t);
      position(hitBall,x,y,1-t*.85);
      if(t<1) {
        S.frame=requestAnimationFrame(fly);
      } else {
        hitBall.style.opacity=0;
        resolve(result);
      }
    }
    S.frame=requestAnimationFrame(fly);
  }

  function resolve(result) {
    if(result==="DOUBLE PLAY!") {
      const [first,second,third]=S.bases;
      if(S.outs===0) {
        if(third)score(1);
        S.bases=[false,false,second];
      }
      nextOut(2);
      finish(result,"doubleplay","2 OUTS");
    } else if(result==="GROUND OUT!") {
      nextOut();
      finish(result,"out");
    } else if(result==="HOME RUN!") {
      S.hits++;
      S.homers++;
      const runs=advance(4);
      celebrate("homer");
      finish(result,"homer",`${runs} RUNS`);
    } else {
      S.hits++;
      const runs=advance(result==="DOUBLE!"?2:1);
      finish(result,result==="DOUBLE!"?"double":"hit",
        runs?`${runs} RUNS`:"");
    }
  }

  let pointer=null;
  field.addEventListener("pointerdown",e=>{
    if(!["windup","pitching"].includes(S.phase))return;
    pointer={x:e.clientX,y:e.clientY,t:performance.now()};
    field.setPointerCapture?.(e.pointerId);
  });

  field.addEventListener("pointerup",e=>{
    if(!pointer)return;
    const dx=e.clientX-pointer.x;
    const dy=e.clientY-pointer.y;
    const dt=performance.now()-pointer.t;
    pointer=null;
    contact(dx,dy,dt);
  });

  field.addEventListener("pointercancel",()=>pointer=null);

  function reset() {
    S.token++;
    cancelAnimationFrame(S.frame);
    Object.assign(S,{
      phase:"idle",balls:0,strikes:0,outs:0,
      inning:1,pitches:0,runs:0,hits:0,
      homers:0,walks:0,bases:[false,false,false],
      innings:[0],pitch:null
    });
    pitcher.src="pitch-ready.png";
    pitcher.classList.remove("release");
    hitBall.style.opacity=0;
    $("phaseLabel").textContent="READY • PITCH を押して開始";
    $("lastPlay").textContent="—";
    $("pitchReadout").textContent="LAST PITCH: —";
    feedback.classList.remove("show");
    idle();
    hud();
  }

  pitchBtn.addEventListener("click",pitch);
  resetBtn.addEventListener("click",reset);
  reset();
})();
