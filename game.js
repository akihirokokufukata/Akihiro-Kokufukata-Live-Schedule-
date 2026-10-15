(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const field=$('field'), pitcher=$('pitcher'), pitchBall=$('pitchBall'), battedBall=$('battedBall'), bat=$('bat');
  const pitchBtn=$('pitchBtn'), resetBtn=$('resetBtn'), pitchHalo=$('pitchHalo');
  const strikesEl=$('strikes'), ballsEl=$('balls'), outsEl=$('outs');
  const inningEl=$('inning'), pitchCountEl=$('pitchCount'), timingCircle=$('strikeZone');
  const phaseLabel=$('phaseLabel'), feedback=$('feedback'), aimArrow=$('aimArrow'), lastPlay=$('lastPlay'), battingLine=$('battingLine'), fireworksEffect=$('fireworksEffect');
  const state={phase:'idle',strikes:0,balls:0,outs:0,innings:1,pitches:0,hits:0,homers:0,walks:0,runs:0,inningRuns:[0],bases:[false,false,false],pitch:null,raf:0,roundId:0,releaseAt:0,impactAt:0,contactGlow:false,battedOuts:0,outBag:[]};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ease=t=>t*t*(3-2*t);
  const rand=(a,b)=>a+Math.random()*(b-a);
  const setRelative=(el,x,y,scale,rot=0)=>{el.style.left=x*100+'%';el.style.top=y*100+'%';el.style.transform=`translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`;};
  const setPhase=p=>{state.phase=p;field.classList.toggle('playing',['windup','pitching','flight'].includes(p));field.classList.toggle('batting',['windup','pitching'].includes(p));};
  const setInfo=(message)=>{phaseLabel.textContent=message;};
  const resultColors={
    'STRIKE!':'strike', 'SWING & MISS!':'strike', 'STRIKE OUT!':'strikeout',
    'BALL':'ball', 'WALK!':'walk', 'FOUL!':'foul',
    'OUT!':'out', 'GROUND OUT!':'out', 'DOUBLE PLAY!':'doubleplay',
    'SINGLE!':'hit', 'DOUBLE!':'double', 'HOME RUN!':'homer'
  };
  function showMessage(message,small=''){
    const tone=resultColors[message]||'neutral';
    feedback.dataset.result=tone;
    lastPlay.dataset.result=tone;
    feedback.replaceChildren(document.createTextNode(message));
    if(small){const span=document.createElement('small');span.textContent=small;feedback.appendChild(span);}
    feedback.classList.add('show');clearTimeout(showMessage.timer);
    showMessage.timer=setTimeout(()=>feedback.classList.remove('show'),1450);
  }
  // A transparent illustration overlays the ballpark only after a scoring play.
  // Retriggering the same animation is safe (e.g. consecutive home runs).
  let fireworksTimer=0;
  function playFireworks(mode='score'){
    if(!fireworksEffect)return;
    clearTimeout(fireworksTimer);
    fireworksEffect.classList.remove('active','homer','score');
    void fireworksEffect.offsetWidth; // restart the keyframes
    fireworksEffect.classList.add('active',mode==='homer'?'homer':'score');
    fireworksTimer=setTimeout(()=>{
      fireworksEffect.classList.remove('active','homer','score');
    },mode==='homer'?2000:1550);
  }
  function stopFireworks(){
    clearTimeout(fireworksTimer);
    fireworksEffect?.classList.remove('active','homer','score');
  }
  const base=(i)=>$('base'+(i+1));
  function hud(){
    [[ballsEl,state.balls,'balls'],[strikesEl,state.strikes,'strikes'],[outsEl,state.outs,'outs']].forEach(([el,n,key])=>{
      [...el.children].forEach((lamp,i)=>lamp.classList.toggle('on',i<n));el.setAttribute('aria-label',n+' '+key);
    });
    state.bases.forEach((occupied,i)=>base(i).classList.toggle('on',occupied));
    $('runs').textContent=state.runs;$('hits').textContent=state.hits;$('walks').textContent=state.walks;$('homers').textContent=state.homers;
    inningEl.textContent='TOP '+state.innings+(state.innings===1?'ST':state.innings===2?'ND':state.innings===3?'RD':'TH');
    pitchCountEl.textContent='PITCH #'+state.pitches;
    battingLine.textContent=`${state.runs} RUNS · ${state.hits} HITS · ${state.homers} HR`;
    const firstShown=Math.max(1,state.innings-8);
    document.querySelectorAll('[data-inning-head]').forEach((el,i)=>{
      const inn=firstShown+i;el.dataset.inningHead=String(inn);el.textContent=inn;
      el.classList.toggle('active',inn===state.innings);
    });
    document.querySelectorAll('[data-inning-run]').forEach((el,i)=>{
      const inn=firstShown+i;el.dataset.inningRun=String(inn);
      const isFinished=inn<state.innings;
      const isCurrent=inn===state.innings;
      const inningRuns=state.inningRuns[inn-1]||0;
      // An ongoing scoreless inning has no '0' yet. Runs appear as scored;
      // only after the third out do we confirm a scoreless inning as 0.
      el.textContent=isFinished?String(inningRuns)
        :isCurrent?(inningRuns>0?String(inningRuns):''):'·';
      el.classList.toggle('future',inn>state.innings);
      el.setAttribute('aria-label',isFinished?`第${inn}回：${inningRuns}点（終了）`
        :isCurrent?`第${inn}回：攻撃中${inningRuns?`、${inningRuns}点`:''}`
        :`第${inn}回：未開始`);
    });
    const team=document.getElementById('scoreTeam');
    if(team)team.textContent=document.body.classList.contains('red-sox')?'RED SOX':'TIGERS';
    const range=document.querySelector('.board-footer strong');
    if(range)range.textContent=`${firstShown}–${firstShown+8}`;

  }
  function clearCount(){state.balls=0;state.strikes=0;}
  function finishInningIfNeeded(){
    if(state.outs<3)return false;
    state.outs=0;state.innings++;state.bases=[false,false,false];state.inningRuns[state.innings-1]??=0;clearCount();hud();return true;
  }
  function addOut(count=1){state.outs+=count;clearCount();const changed=finishInningIfNeeded();hud();return changed;}
  function advanceBatter(n){
    const next=[false,false,false];let r=0;
    for(let i=2;i>=0;i--){if(!state.bases[i])continue;if(i+n>=3)r++;else next[i+n]=true;}
    if(n>=4)r++;
    else next[n-1]=true;
    state.bases=next;state.runs+=r;state.inningRuns[state.innings-1]=(state.inningRuns[state.innings-1]||0)+r;return r;
  }
  function walk(){
    state.walks++;
    const [first,second,third]=state.bases;
    if(first&&second&&third){state.runs++;state.inningRuns[state.innings-1]=(state.inningRuns[state.innings-1]||0)+1;}
    state.bases=[true,first||second? (first?true:second):false, third||(first&&second)];
    // If first is unoccupied, any existing runner stays put.
    if(!first)state.bases=[true,second,third];
    // If first occupied, a runner is forced only when all preceding bases occupied.
    else if(!second)state.bases=[true,true,third];
    else state.bases=[true,true,true];
    clearCount();hud();
    if(first&&second&&third)playFireworks('score');
    lastPlay.textContent='WALK!';showMessage('WALK!');setInfo('BASE ON BALLS','四球で出塁。次の投球へ。');endRound();
  }
  function ballOrCalledStrike(){
    if(state.pitch.zone==='ball'){
      state.balls++;hud();
      if(state.balls>=4){walk();return;}
      lastPlay.textContent='BALL';showMessage('BALL');setInfo('BALL','コースを外れました。次の投球へ。');endRound();
    }else{
      calledStrike();
    }
  }
  function calledStrike(){
    state.strikes++;
    if(state.strikes>=3){const change=addOut();const msg='STRIKE OUT!';lastPlay.textContent=msg;showMessage(msg);setInfo(change?'THREE OUTS · CHANGE':'STRIKE OUT!', '次の PITCH で新しい打席へ。');}
    else{hud();lastPlay.textContent='STRIKE!';showMessage('STRIKE!');setInfo('STRIKE','次の投球を待ってください。');}
    endRound();
  }
  function swingMiss(){
    state.strikes++;
    if(state.strikes>=3){const change=addOut();lastPlay.textContent='STRIKE OUT!';showMessage('STRIKE OUT!');setInfo(change?'THREE OUTS · CHANGE':'STRIKE OUT!','次の PITCH で新しい打席へ。');}
    else{hud();lastPlay.textContent='SWING & MISS!';showMessage('SWING & MISS!');setInfo('SWING & MISS!','次の投球を待ってください。');}
    endRound();
  }
  function recordFoul(){state.strikes=Math.min(2,state.strikes+1);hud();lastPlay.textContent='FOUL!';showMessage('FOUL!');setInfo('FOUL BALL','次の投球へ。');endRound();}
  // Two thirds of BATTED-BALL outs are ground outs. Strikeouts are
  // deliberately excluded. Draw without replacement from a 2:1 bag,
  // weighting low-angle swings toward a grounder for believable animation.
  function chooseBattedOut(vertical){
    if(!state.outBag.length) state.outBag=['GROUND OUT!','GROUND OUT!','OUT!'];
    const groundWeight=vertical<.55?3.4:vertical<.76?1.5:.72;
    const weights=state.outBag.map(kind=>kind==='GROUND OUT!'?groundWeight:1);
    const total=weights.reduce((a,b)=>a+b,0);
    let choice=Math.random()*total, index=weights.length-1;
    for(let i=0;i<weights.length;i++){choice-=weights[i];if(choice<=0){index=i;break;}}
    const result=state.outBag.splice(index,1)[0];
    state.battedOuts++;
    return result;
  }
  // 6-4-3 / 4-6-3 style ground-ball double play without fielder sprites.
  // Only possible with a runner on first and 0 or 1 out. Both the lead
  // runner and batter are out. With zero outs, the other runners may advance.
  function doublePlayEligible(){return state.bases[0] && state.outs<2;}
  function shouldTurnDoublePlay(vertical,quality){
    if(!doublePlayEligible())return false;
    const rate=clamp(.30+(vertical<.32?.17:vertical<.55?.08:0)+(quality<.25?.06:0),.25,.53);
    return Math.random()<rate;
  }
  function recordDoublePlay(){
    if(!doublePlayEligible())return false;
    const outsBefore=state.outs;
    const [first,second,third]=state.bases;
    // Turn the double play at second and first. On a non-ending play,
    // the runner on second takes third; the runner on third scores.
    let r=0;
    if(outsBefore===0){
      r=third?1:0;
      state.bases=[false,false,second];
      if(r){state.runs+=r;state.inningRuns[state.innings-1]=(state.inningRuns[state.innings-1]||0)+r;}
    }else{
      state.bases=[false,second,third]; // cleared by inning change below
    }
    const changed=addOut(2);
    if(r)playFireworks('score');
    lastPlay.textContent='DOUBLE PLAY!';
    showMessage('DOUBLE PLAY!', changed?'3 OUTS · CHANGE':(r?'+1 RUN':'2 OUTS'));
    setInfo('BALL IN PLAY · DOUBLE PLAY!');endRound();
    return true;
  }
  function recordHit(kind,dir,quality){
    if(kind==='DOUBLE PLAY!'){if(recordDoublePlay())return;kind='GROUND OUT!';}
    let extra='',r=0;
    if(kind==='OUT!' || kind==='GROUND OUT!'){
      const changed=addOut();if(changed)extra='3 OUTS · CHANGE';
    }else{
      state.hits++;clearCount();
      if(kind==='HOME RUN!'){state.homers++;r=advanceBatter(4);}
      if(kind==='DOUBLE!')r=advanceBatter(2);
      if(kind==='SINGLE!')r=advanceBatter(1);
      if(r>0)extra='+'+r+' RUN'+(r===1?'':'S');
      hud();
      if(kind==='HOME RUN!')playFireworks('homer');
      else if(r>0)playFireworks('score');
    }
    lastPlay.textContent=kind;
    showMessage(kind,extra||(kind==='GROUND OUT!'?'':dir));
    setInfo('BALL IN PLAY · '+kind);endRound();
  }
  function endRound(){
    cancelAnimationFrame(state.raf);state.raf=0;setPhase('result');
    pitchBall.style.opacity='0';setContactGlow(false);timingCircle.classList.remove('ready');
    if(state.pitch) $('pitchReadout').textContent=`${state.pitch.name} · ${state.pitch.speed} km/h`;
    const endingId=state.roundId;
    setTimeout(()=>{
      if(state.phase==='result'&&state.roundId===endingId){setPhase('idle');pitchBtn.disabled=false;pitcher.src='assets/pitch-ready.png';pitcher.classList.remove('release');bat.classList.remove('swing');}
    },740);
  }
  // Break coordinates are from the BATTER'S viewpoint:
  // positive X = screen right, positive Y = down toward home plate.
  // The end point stays inside/outside the strike zone as generated; only
  // the flight path leading to it changes. All names are English.
  const pitchTypes=[
    {name:'FASTBALL',        min:805, max:965,  km:[142,160],breakX: 0,    breakY:0},
    {name:'SLIDER',          min:980, max:1225, km:[122,139],breakX: .120,breakY:0},
    {name:'CURVEBALL',       min:1140,max:1395, km:[105,122],breakX: .090,breakY:.070},
    {name:'SINKER',          min:955, max:1160, km:[130,148],breakX:-.090,breakY:.070},
    {name:'TWO-SEAM FASTBALL',min:875,max:1060, km:[134,153],breakX:-.120,breakY:0},
    {name:'CHANGEUP',        min:1285,max:1550, km:[110,126],breakX: 0,   breakY:.025}
  ];
  function makePitch(){
    const kind=pitchTypes[Math.floor(Math.random()*pitchTypes.length)];
    const zone=Math.random()<.36?'ball':'strike';
    let endX,endY;
    if(zone==='strike'){endX=rand(.435,.565);endY=rand(.765,.845);}
    else{
      const direction=Math.floor(Math.random()*4);
      endX=direction===0?rand(.325,.395):direction===1?rand(.605,.675):rand(.43,.57);
      endY=direction===2?rand(.686,.722):direction===3?rand(.886,.924):rand(.755,.845);
    }
    const duration=rand(kind.min,kind.max);
    return {name:kind.name,duration,speed:Math.round(rand(...kind.km)),endX,endY,
      breakX:kind.breakX,breakY:kind.breakY,zone};
  }
  function pitchPosition(p){
    const data=state.pitch;
    const t=clamp(p,0,1);
    // Aim toward a pre-break target, then apply the break during the final
    // half of the pitch. At t=1, the position is EXACTLY endX/endY.
    const base=ease(t);
    const late=ease(clamp((t-.48)/.52,0,1));
    const bx=data.breakX||0, by=data.breakY||0;
    const x=.5+(data.endX-bx-.5)*base+bx*late;
    const y=.56+(data.endY-by-.56)*base+by*late;
    return [x,y];
  }
  // The contact cue and ideal impact are shifted 65ms earlier; pitch speed,
  // flight duration and cue width remain unchanged from v33.
  const SWEET_SPOT_MS=112;
  // v38: both red contour and perfect contact are 5ms earlier than v37.
  // Keep the pitch animation, contact-window width and swipe corridor unchanged.
  const CONTACT_EARLY_MS=65;
  function setContactGlow(on){
    if(state.contactGlow===on)return;
    state.contactGlow=on;
    pitchBall.classList.toggle('sweet-spot',on);
    pitchHalo.classList.toggle('visible',on);
  }
  // A wide, touch-friendly swipe corridor. Distance is measured between the
  // swipe segment and the ball's CURRENT center in the field, not merely
  // against the displayed strike-zone rectangle.
  function swipeToBallDistance(gesture, now=performance.now()){
    const rect=field.getBoundingClientRect();
    const progress=clamp((now-state.releaseAt)/state.pitch.duration,0,1);
    const [bx,by]=pitchPosition(progress);
    const ballX=rect.left+bx*rect.width, ballY=rect.top+by*rect.height;
    const vx=gesture.x2-gesture.x1,vy=gesture.y2-gesture.y1;
    const segSq=vx*vx+vy*vy;
    const t=segSq?clamp(((ballX-gesture.x1)*vx+(ballY-gesture.y1)*vy)/segSq,0,1):0;
    return Math.hypot(ballX-(gesture.x1+t*vx),ballY-(gesture.y1+t*vy));
  }
  function contactRadius(){
    // v33: visual ball radius + a generous allowance around the flick line.
    // The margin is intentionally small in appearance but generous to touch.
    const rect=field.getBoundingClientRect();
    return clamp(rect.width*0.13,44,58);
  }
  function pitch(){
    if(state.phase!=='idle')return;
    state.roundId++;const id=state.roundId;state.pitches++;state.pitch=makePitch();pitchBtn.disabled=true;
    setPhase('windup');pitcher.src='assets/pitch-ready.png';pitcher.classList.remove('release');bat.classList.remove('swing');
    pitchBall.style.opacity='0';setContactGlow(false);battedBall.style.opacity='0';feedback.classList.remove('show');
    timingCircle.classList.remove('ready');
    state.releaseAt=performance.now()+rand(470,720);state.impactAt=state.releaseAt+state.pitch.duration-CONTACT_EARLY_MS;
    setInfo('WINDUP...','球速とコースを見極めてください。');hud();
    function frame(now){
      if(id!==state.roundId)return;
      if(state.phase==='windup'&&now>=state.releaseAt){
        setPhase('pitching');pitcher.src='assets/pitch-release.png';pitcher.classList.add('release');
        setInfo('PITCH INCOMING!','ボールが来る瞬間を狙ってフリック！');
      }
      if(state.phase==='pitching'){
        const p=clamp((now-state.releaseAt)/state.pitch.duration,0,1);const [x,y]=pitchPosition(p);
        const ballScale=.2+.97*ease(p);
        setRelative(pitchBall,x,y,ballScale,p*100);
        setRelative(pitchHalo,x,y,ballScale);
        pitchBall.style.opacity='1';
        setContactGlow(Math.abs(now-state.impactAt)<=SWEET_SPOT_MS);
        timingCircle.classList.toggle('ready',p>.755);
        if(p>=1){pitchBall.style.opacity='0';ballOrCalledStrike();return;}
      }
      if(['windup','pitching'].includes(state.phase))state.raf=requestAnimationFrame(frame);
    }
    state.raf=requestAnimationFrame(frame);
  }
  function swingBat(){bat.classList.add('swing');setTimeout(()=>bat.classList.remove('swing'),230);}
  // Ground balls roll across the infield with no animated fielder.
  // Home runs now launch high into the night sky before the celebration.
  function launch(xn,yn,kind,quality,grounder=false){
    setPhase('flight');pitchBall.style.opacity='0';setContactGlow(false);battedBall.style.opacity='1';
    battedBall.style.filter='drop-shadow(1px 2px 2px #0007)';
    const started=performance.now();
    const isHomer=kind==='HOME RUN!';
    const duration=grounder?670:(isHomer?1240:(800+Math.round(quality*200)));
    const endX=clamp(isHomer ? (.5+(xn-.5)*1.15) : xn,-.28,1.28),endY=clamp(grounder?Math.min(yn,.675):(isHomer?-0.16:yn),-0.22,.83);
    const id=state.roundId;
    function tick(now){
      if(id!==state.roundId)return;
      const p=clamp((now-started)/duration,0,1),e=ease(p);
      const x=.5+(endX-.5)*e;
      let y,scale,rot;
      if(isHomer){
        y=.83+(endY-.83)*e-.28*Math.sin(Math.PI*p);
        scale=1.16-.96*p;
        rot=p*1180;
        battedBall.style.opacity=String(clamp(1-((p-.82)/.18),0,1));
        battedBall.style.filter='drop-shadow(0 0 10px rgba(255,245,196,.32)) drop-shadow(0 0 22px rgba(255,238,150,.18))';
      }else{
        y=.83+(endY-.83)*e-(grounder?.012:.19)*Math.sin(Math.PI*p);
        scale=grounder?(1.08-.72*p):(1.15-.95*p);
        rot=p*(grounder?1080:620);
        battedBall.style.opacity='1';
      }
      setRelative(battedBall,x,y,scale,rot);
      if(p<1)state.raf=requestAnimationFrame(tick);
      else{
        battedBall.style.opacity='0';
        battedBall.style.filter='drop-shadow(1px 2px 2px #0007)';
        const direction=grounder?'INFIELD':(endX<.34?'LEFT FIELD':endX>.66?'RIGHT FIELD':'CENTER FIELD');
        recordHit(kind,direction,quality);
      }
    }
    state.raf=requestAnimationFrame(tick);
  }
  function foul(dir){
    setPhase('flight');pitchBall.style.opacity='0';setContactGlow(false);battedBall.style.opacity='1';
    const begun=performance.now(),edge=dir<0?-.19:1.19,id=state.roundId;
    function tick(now){if(id!==state.roundId)return;const p=clamp((now-begun)/650,0,1);setRelative(battedBall,.5+(edge-.5)*p,.83-.38*ease(p)-Math.sin(Math.PI*p)*.1,1-p*.81,p*550);
      if(p<1)state.raf=requestAnimationFrame(tick);else{battedBall.style.opacity='0';recordFoul();}}
    state.raf=requestAnimationFrame(tick);
  }
  function swing(dx,dy,dt,gesture=null){
    if(!['windup','pitching'].includes(state.phase))return;
    cancelAnimationFrame(state.raf);swingBat();
    const delta=performance.now()-state.impactAt,err=Math.abs(delta),length=Math.hypot(dx,dy);
    const speed=length/Math.max(50,dt)*1000;
    const vertical=clamp(-dy/Math.max(1,length),-1,1);
    const horizontal=dx/Math.max(1,length);
    const maxErr=state.pitch.name==='FASTBALL'?252:state.pitch.name==='SLIDER'?270:295;
    if(length<20 || err>maxErr){swingMiss();return;}
    // Actual touch geometry (new in v33).  Do not shrink the timing window.
    // A slightly off-center flick still makes contact because of the wider
    // corridor. If the gesture misses far outside the ball, it's a miss.
    if(gesture && swipeToBallDistance(gesture)>contactRadius()){
      swingMiss();return;
    }
    // A wide swipe or a distinctly mistimed pull is a foul ball.
    if(Math.abs(horizontal)>.82||vertical<-.18||(err>175&&Math.abs(horizontal)>.62)){
      foul(horizontal||1);return;
    }
    // v37: narrower HIT window, but preserve the actual swingable timing
    // interval (maxErr), red ball cue, optimal impact instant, and swipe width.
    const HIT_TIMING_WIDTH_MS=116; // v36: 134ms → roughly 13% tighter
    const timingQuality=Math.exp(-Math.pow(delta/HIT_TIMING_WIDTH_MS,2));
    const flickPower=clamp((speed-250)/1100,0,1);
    const launchAngle=clamp((vertical-.25)/.55,0,1);
    const pitchInZone=state.pitch.zone==='strike';
    const locationFactor=pitchInZone?1:.75;
    // Centering the swing matters much more than swinging harder.
    const carry=36+72*Math.pow(timingQuality,1.75)
      +11*flickPower+8*launchAngle+7*locationFactor;
    const x=clamp(.5+horizontal*.48,.02,.98);
    if(x<.12||x>.88){foul(horizontal);return;}

    let kind,targetY;
    const weakGround=(vertical<.55)||(vertical<.76&&timingQuality<.35);
    if(weakGround||carry<96){
      // Approximately 2 of every 3 balls-in-play outs roll through the infield.
      kind=chooseBattedOut(vertical);
      targetY=kind==='GROUND OUT!'?.78:.51;
    }else if(carry>=131){kind='HOME RUN!';targetY=.14;}
    else if(carry>=117){kind='DOUBLE!';targetY=.38;}
    else{kind='SINGLE!';targetY=.58;}
    if(kind==='GROUND OUT!' && shouldTurnDoublePlay(vertical,timingQuality))kind='DOUBLE PLAY!';
    setInfo(timingQuality>.88?'PERFECT CONTACT!':timingQuality>.60?'GOOD CONTACT!':'CONTACT!');
    launch(x,targetY,kind,timingQuality,kind==='GROUND OUT!'||kind==='DOUBLE PLAY!');
  }
  let pointer=null;
  field.addEventListener('pointerdown',e=>{
    if(e.button!==undefined && e.button!==0)return;
    if(!['windup','pitching'].includes(state.phase))return;
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now()};
    field.setPointerCapture?.(e.pointerId);aimArrow.style.opacity='0';
  });
  field.addEventListener('pointermove',e=>{
    if(!pointer||e.pointerId!==pointer.id)return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    const r=field.getBoundingClientRect();
    aimArrow.style.left=pointer.x-r.left+'px';aimArrow.style.top=pointer.y-r.top+'px';
    aimArrow.style.width=Math.min(140,Math.hypot(dx,dy))+'px';
    aimArrow.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;aimArrow.style.opacity='1';
    if(Math.hypot(dx,dy)>12)e.preventDefault();
  },{passive:false});
  field.addEventListener('pointerup',e=>{
    if(!pointer||e.pointerId!==pointer.id)return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,dt=performance.now()-pointer.t;
    const gesture={x1:pointer.x,y1:pointer.y,x2:e.clientX,y2:e.clientY};
    pointer=null;aimArrow.style.opacity='0';swing(dx,dy,dt,gesture);
  });
  field.addEventListener('pointercancel',()=>{pointer=null;aimArrow.style.opacity='0'});
  function reset(){
    state.roundId++;cancelAnimationFrame(state.raf);stopFireworks();
    Object.assign(state,{strikes:0,balls:0,outs:0,innings:1,pitches:0,hits:0,homers:0,walks:0,runs:0,inningRuns:[0],bases:[false,false,false],pitch:null,battedOuts:0,outBag:[]});
    pitchBtn.disabled=false;setPhase('idle');pitcher.src='assets/pitch-ready.png';pitcher.classList.remove('release');bat.classList.remove('swing');
    pitchBall.style.opacity='0';setContactGlow(false);battedBall.style.opacity='0';feedback.classList.remove('show');timingCircle.classList.remove('ready');
    $('pitchReadout').textContent='LAST PITCH: —';lastPlay.textContent='—';lastPlay.removeAttribute('data-result');setInfo('READY • PITCH を押して開始','投球に合わせてフリック。ジャストミートで飛距離アップ！');hud();
  }
  document.querySelectorAll('[data-team]').forEach(button=>button.addEventListener('click',()=>{
    document.body.classList.toggle('red-sox',button.dataset.team==='red-sox');
    document.querySelectorAll('[data-team]').forEach(b=>b.setAttribute('aria-pressed',String(button===b)));
    reset();
  }));
  pitchBtn.addEventListener('click',pitch);resetBtn.addEventListener('click',reset);
  window.GameDayV43={state,pitchTypes,makePitch,pitchPosition,pitch,reset,swing,launch,advanceBatter,walk,addOut,hud,swipeToBallDistance,contactRadius,setContactGlow,chooseBattedOut,doublePlayEligible,shouldTurnDoublePlay,recordDoublePlay,recordHit,playFireworks};
  reset();
})();