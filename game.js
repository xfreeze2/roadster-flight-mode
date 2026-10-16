'use strict';
/* Roadster: Flight Mode — a fan-made tribute to the Tesla Roadster unveiling (Oct 16 2026). */
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d');
const Q=new URLSearchParams(location.search);
const DEMO=Q.has('demo');
let W=0,H=0,DPR=1,S=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;S=Math.min(H/720,W/760);}
addEventListener('resize',resize);resize();

const G=1800, PX2MPH=0.06, PX2FT=0.0886;
const TRIMS=[
 {name:'PERFORMANCE',sub:'Road ready',acc:1100,max:2300,act:'SUCTION',obj:'DRIFT FOR POINTS · HOLD SUCTION THROUGH THE LOOPS',goal:12500},
 {name:'THRUST',sub:'Race ready',acc:1900,max:3000,act:'KICKFLIP',obj:'THRUSTERS UP · KICKFLIP OVER THE SEMIS',goal:10200},
 {name:'ROCKET',sub:'Air ready',acc:1900,max:3200,act:'BOOST',obj:'TAKE OFF OVER THE TRAFFIC JAM · WATCH GAS PRESSURE',goal:15000}
];

/* ---------------- input ---------------- */
const K={};
const KEYMAP={ArrowRight:'right',KeyD:'right',ArrowLeft:'left',KeyA:'left',ArrowUp:'up',KeyW:'up',KeyQ:'rotL',KeyE:'rotR',Space:'act',ShiftLeft:'drift',ShiftRight:'drift',ArrowDown:'drift',KeyS:'drift',KeyB:'boost'};
addEventListener('keydown',e=>{const k=KEYMAP[e.code];if(k){K[k]=true;e.preventDefault();}if(e.code==='KeyP'||e.code==='Escape')togglePause();audioInit();});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)K[k]=false;});
document.querySelectorAll('#touch button').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{e.preventDefault();K[k]=true;b.classList.add('on');audioInit();try{b.setPointerCapture(e.pointerId)}catch(_){} };
  const off=e=>{e.preventDefault();K[k]=false;b.classList.remove('on');};
  b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);
});

/* ---------------- audio ---------------- */
let AC=null,eng=null,engG=null,hiss=null,hissG=null,master=null;
function audioInit(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=AC.createGain();master.gain.value=.5;master.connect(AC.destination);
  eng=AC.createOscillator();eng.type='sawtooth';const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=900;
  engG=AC.createGain();engG.gain.value=0;eng.connect(f);f.connect(engG);engG.connect(master);eng.start();
  const e2=AC.createOscillator();e2.type='sine';e2.connect(engG);e2.start();eng._b=e2;
  const buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  hiss=AC.createBufferSource();hiss.buffer=buf;hiss.loop=true;const hf=AC.createBiquadFilter();hf.type='bandpass';hf.frequency.value=2500;hf.Q.value=.6;
  hissG=AC.createGain();hissG.gain.value=0;hiss.connect(hf);hf.connect(hissG);hissG.connect(master);hiss.start();
}
function beep(freq=880,dur=.15,type='triangle',vol=.25,slide=0){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=freq;
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*slide),AC.currentTime+dur);
  g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur);o.connect(g);g.connect(master);o.start();o.stop(AC.currentTime+dur);}
function boom(){beep(120,.5,'sawtooth',.4,.3);beep(60,.6,'square',.25,.5);}
function chime(){[660,880,1320].forEach((f,i)=>setTimeout(()=>beep(f,.25,'sine',.18),i*70));}

/* ---------------- game state ---------------- */
let st='title',lvl=0,car,parts=[],world,score=0,t=0,shake=0,paused=false,toastT=0,best=JSON.parse(localStorage.getItem('rfm_best')||'[0,0,0]');
function newCar(){return{x:0,y:0,vx:0,vy:0,a:0,w:0,ground:true,flip:0,flipping:false,airRot:0,airT:0,loop:null,gas:1,df:0,wheel:0,drift:false,crashT:0,zeroT:null,flipsDone:0,cleared:{}};}
function buildWorld(l){
  const w={loops:[],semis:[],jam:[],rings:[],cones:[],goal:TRIMS[l].goal};
  if(l===0){w.loops=[{x:2600,R:250,done:false},{x:6400,R:290,done:false},{x:10200,R:320,done:false}];for(let x=900;x<12000;x+=520)w.cones.push(x);}
  if(l===1){for(let i=0;i<6;i++)w.semis.push({x:1700+i*1400,len:380,h:150,done:false});}
  if(l===2){for(let x=1500;x<13000;x+=150+((x*7)%60))w.jam.push({x,c:['#b8bcc4','#2b2f38','#8c1520','#e8e8ea','#1b3c6e'][(x/150|0)%5]});
    for(let i=0;i<18;i++)w.rings.push({x:2200+i*700,y:380+Math.sin(i*1.3)*200+(i%3)*60,got:false});}
  return w;
}
function start(l){lvl=l;st='play';car=newCar();world=buildWorld(l);parts=[];score=0;t=0;paused=false;
  $('title').classList.add('hidden');$('result').classList.add('hidden');$('hud').classList.remove('hidden');$('touch').classList.remove('hidden');
  $('trim').textContent=TRIMS[l].name+' · '+TRIMS[l].sub.toUpperCase();$('obj').textContent=TRIMS[l].obj;$('tAct').textContent=TRIMS[l].act;
  $('tDrift').textContent=l===2?'BOOST':'DRIFT';$('tDrift').dataset.k=l===2?'boost':'drift';
  if(!Q.has('level'))audioInit();toast(TRIMS[l].name,l===0?'ROAD READY · DRIFT + SUCTION':l===1?'THRUST AUGMENT · 0–60 IN UNDER 1 SECOND':'FULL FLIGHT SYSTEM · "SO YES, IT CAN FLY"');}
function toast(a,b=''){const e=$('toast');e.innerHTML=a+(b?'<small>'+b+'</small>':'');e.style.opacity=1;toastT=1.8;}
function addScore(n,a,b){score+=n;if(a)toast(a+(n?' +'+n:''),b);chime();}
function crash(msg){if(car.crashT>0)return;car.crashT=1.2;shake=22;boom();score=Math.max(0,score-500);toast('CRASH −500',msg||'');
  car.vx*=.25;car.vy=0;car.a=0;car.w=0;car.flipping=false;car.flip=0;car.loop=null;car.y=Math.max(0,car.y);
  for(let i=0;i<40;i++)spark(car.x,car.y+20);for(let i=0;i<20;i++)smoke(car.x,car.y+10,1.6);}
function togglePause(){if(st!=='play')return;paused=!paused;if(paused)toast('PAUSED','TAP II OR PRESS P');else $('toast').style.opacity=0;}
$('pauseBtn').addEventListener('pointerdown',e=>{e.preventDefault();togglePause();});
document.querySelectorAll('.levels button').forEach(b=>b.addEventListener('click',()=>start(+b.dataset.l)));
$('rRetry').onclick=()=>start(lvl);$('rMenu').onclick=()=>menu();$('rNext').onclick=()=>lvl<2?start(lvl+1):menu();
function menu(){st='title';$('title').classList.remove('hidden');$('result').classList.add('hidden');$('hud').classList.add('hidden');$('touch').classList.add('hidden');}
function finish(){st='result';const tb=Math.max(0,Math.round((60-t)*50));score+=tb;
  if(score>best[lvl]){best[lvl]=score;try{localStorage.setItem('rfm_best',JSON.stringify(best))}catch(_){}}
  $('hud').classList.add('hidden');$('touch').classList.add('hidden');$('result').classList.remove('hidden');
  $('rKick').textContent=lvl===2?'FULL FLIGHT SYSTEM':'LEVEL COMPLETE';$('rTitle').textContent=lvl===2?'ROADSTER':TRIMS[lvl].name;
  $('rTitle').className=lvl===2?'logo':'';$('rScore').textContent=score.toLocaleString();
  $('rLine').innerHTML=(lvl===2?'<b style="color:#fff;font-size:19px">Turns out the future does have flying cars.</b><br><br>':'')+'Time '+t.toFixed(1)+'s · time bonus +'+tb+' · best '+best[lvl].toLocaleString();
  $('rNext').textContent='NEXT TRIM';$('rNext').style.display=lvl<2?'':'none';chime();}

/* ---------------- particles ---------------- */
function smoke(x,y,s=1){parts.push({x,y,vx:(Math.random()-.5)*120-car.vx*.05,vy:Math.random()*60+20,r:10*s,life:1.6,max:1.6,k:'s'});}
function spark(x,y){parts.push({x,y,vx:(Math.random()-.5)*900,vy:Math.random()*700,r:2,life:.6,max:.6,k:'p'});}
function jet(x,y,dx,dy){parts.push({x,y,vx:dx*900+(Math.random()-.5)*80+car.vx*.6,vy:dy*900+(Math.random()-.5)*80+car.vy*.6,r:7,life:.32,max:.32,k:'j'});}

/* ---------------- update ---------------- */
function input(){
  if(!DEMO)return K;
  const k={right:true},c=car;
  if(lvl===0){k.act=!!c.loop||nearLoop(400);k.drift=!c.loop&&((t%4)>2.6)&&c.vx>900;}
  if(lvl===1){const s=world.semis.find(s=>s.x+s.len>c.x-60);if(s&&s.x-c.x<Math.max(450,c.vx*.45)&&s.x-c.x>-s.len)k.up=c.y<260;if(!c.ground&&c.y>150&&c.vy>0&&!c.flipping&&c.flipsDone===0)k.act=true;}
  if(lvl===2){if(c.x>1000&&c.x<world.goal){k.up=c.y<420||c.vy<-150;k.rotL=c.a<-.05;k.rotR=c.a>.18;k.boost=c.gas>.5&&c.y>200;}if(c.x>world.goal-200){k.up=c.vy<-250;k.rotL=c.a<0;k.rotR=c.a>0;}}
  return k;
}
function nearLoop(d){return world.loops.some(L=>!L.done&&L.x-car.x<d&&L.x-car.x>-50);}
function gh(x){if(world)for(const s of world.semis)if(x>s.x-20&&x<s.x+s.len+20)return s.h;return 0;}
const norm=a=>{a%=Math.PI*2;if(a>Math.PI)a-=Math.PI*2;if(a<-Math.PI)a+=Math.PI*2;return a;};
function update(dt){
  t+=dt;const c=car,k=input(),T=TRIMS[lvl];
  if(c.crashT>0)c.crashT-=dt;
  const thrusting=(k.up||k.boost||(k.rotL||k.rotR)&&!c.ground)&&lvl>0&&c.gas>0.02;
  let gasUse=0;
  // ---- loop riding (suction) ----
  if(c.loop){
    const L=c.loop,th=c.loopT;const suction=!!k.act;
    let acc=-G*Math.sin(th)+(k.right?T.acc*.6:0)-(k.left?900:0);
    c.v+=acc*dt;
    const N=c.v*c.v/L.R+G*Math.cos(th),Sx=suction?3.2*G:0;
    c.df=Math.max(0,(N+Sx)/G*525);
    if(suction&&c.v<160)c.v=160;
    if(N+Sx<0||c.v<=0){ // detached
      c.vx=c.v*Math.cos(th);c.vy=c.v*Math.sin(th);c.loop=null;c.ground=false;c.airRot=0;c.airT=0;toast('NO SUCTION!','HOLD SPACE / SUCTION TO STICK');beep(200,.3,'square',.2,.5);
    }else{
      c.loopT+=c.v/L.R*dt;const nt=c.loopT;
      c.x=L.x+L.R*Math.sin(nt);c.y=L.R-L.R*Math.cos(nt);c.a=nt;c.vx=c.v*Math.cos(nt);c.vy=c.v*Math.sin(nt);c.wheel+=c.v*dt/17;
      if(suction&&Math.random()<.5)parts.push({x:c.x+(Math.random()-.5)*120,y:c.y,vx:0,vy:0,r:3,life:.3,max:.3,k:'f'});
      if(nt>=Math.PI*2){c.loop=null;c.x=L.x+2;c.y=0;c.a=0;c.vx=c.v;c.vy=0;c.ground=true;L.done=true;addScore(2500,'SUCTION LOOP','ENOUGH SUCTION TO HOLD THE VEHICLE UPSIDE DOWN');}
    }
  }else if(c.ground){
    // ---- driving ----
    let acc=0;
    if(k.right&&c.crashT<=0)acc+=T.acc*(1-Math.max(0,c.vx)/T.max);
    if(k.left)acc-=c.vx>0?2600:700;
    if(k.boost&&lvl>0&&c.gas>.02){acc+=2600;gasUse+=.45;if(Math.random()<.7)jet(c.x-85,c.y+28,-1,0);}
    c.drift=!!k.drift&&c.vx>400&&lvl<2;
    if(c.drift){acc-=250;score+=Math.round(c.vx*dt*.25);c.a=Math.sin(t*9)*.025;smoke(c.x-55,c.y+5,1.2);if(Math.random()<.5)smoke(c.x+50,c.y+5,.8);}
    else c.a*=.8;
    c.vx+=acc*dt;c.vx-=c.vx*.12*dt;if(c.vx<-400)c.vx=-400;
    if(Math.abs(c.vx)<3&&!k.right)c.vx=0;
    if(c.zeroT===null&&k.right&&c.vx<20)c.zeroT=t;
    if(c.zeroT!==null&&c.zeroT>=0&&c.vx*PX2MPH>=60){const z=t-c.zeroT;c.zeroT=-1;toast('0–60 MPH',z.toFixed(2)+' SECONDS');}
    c.df=lvl===0?(k.act?3.2*525+c.vx*.3:525+c.vx*.25):525+c.vx*.25;
    c.x+=c.vx*dt;c.wheel+=c.vx*dt/17;
    if(gh(c.x)<c.y-1){c.ground=false;c.vy=0;c.airRot=0;c.airT=0;}
    if(k.up&&lvl>0&&c.gas>.02){c.ground=false;c.vy=520;c.airRot=0;c.airT=0;beep(300,.2,'sine',.15,2);}
    // enter loop
    for(const L of world.loops)if(!L.done&&c.x>=L.x&&c.x-c.vx*dt<L.x&&c.vx>0){c.loop=L;c.loopT=0;c.v=c.vx;c.x=L.x;}
  }else{
    // ---- airborne ----
    c.airT+=dt;c.df=0;
    let ax=0,ay=-G;
    if(k.up&&lvl>0&&c.gas>.02){const f=lvl===2?3000:2400;ax+=-Math.sin(c.a)*f;ay+=Math.cos(c.a)*f;gasUse+=.32;
      if(Math.random()<.9){const ca=Math.cos(c.a),sa=Math.sin(c.a);for(const px of[-60,60])jet(c.x+px*ca,c.y+px*sa+6,Math.sin(c.a),-Math.cos(c.a));}}
    if(k.boost&&lvl>0&&c.gas>.02){ax+=Math.cos(c.a)*2200;ay+=Math.sin(c.a)*2200;gasUse+=.4;jet(c.x-85*Math.cos(c.a),c.y+24-85*Math.sin(c.a),-Math.cos(c.a),-Math.sin(c.a));}
    const rot=(k.rotL?1:0)-(k.rotR?1:0);
    if(rot&&(lvl>0?c.gas>.02:true)){c.w+=rot*(lvl===0?7:11)*dt;if(lvl>0){gasUse+=.12;}}
    c.w*=Math.pow(lvl===2?.15:.5,dt);
    if(k.act&&lvl===1&&!c.flipping&&c.y>40){c.flipping=true;c.flip=0;beep(500,.4,'sine',.2,2);}
    if(c.flipping){c.flip+=dt*Math.PI*2/0.75;if(c.flip>=Math.PI*2){c.flipping=false;c.flip=0;c.flipsDone++;}}
    if(k.right&&lvl===2&&!k.boost){ax+=Math.cos(c.a)*500;}
    c.vx+=ax*dt;c.vy+=ay*dt;c.vx-=c.vx*(lvl===2?.4:.02)*dt;
    c.a+=c.w*dt;c.airRot+=c.w*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.wheel+=c.vx*dt/40;
    if(c.y<0&&!c.ground){c.y=0;}if(c.y>3000){c.y=3000;c.vy=Math.min(c.vy,0);}
    const hh=gh(c.x);if(c.y<=hh&&c.y>hh-45&&c.vy<=0){ // landing
      c.y=hh;const ang=norm(c.a);
      if(Math.abs(ang)>.65||c.flipping||c.vy<-2600)crash(c.flipping?'FINISH THE KICKFLIP BEFORE LANDING':'LAND ON YOUR WHEELS');
      else{shake=Math.min(14,-c.vy/150);for(let i=0;i<8;i++)smoke(c.x+(Math.random()-.5)*140,0,1);beep(90,.15,'square',.2,.6);
        const flips=Math.floor(Math.abs(c.airRot)/(Math.PI*2)+.15);
        if(flips>0)addScore(1500*flips,(c.airRot>0?'BACKFLIP':'FRONTFLIP')+(flips>1?' ×'+flips:''),'COLD-GAS ROTATION');
        else if(c.airT>1.2)addScore(Math.round(c.airT*200),'AIRTIME','');
        if(lvl===2&&c.x>world.goal)c.landed=true;}
      c.ground=true;c.vy=0;c.a=0;c.w=0;c.flipping=false;c.flip=0;c.flipsDone=0;
    }
  }
  // gas
  if(gasUse>0)c.gas=Math.max(0,c.gas-gasUse*dt);else c.gas=Math.min(1,c.gas+(c.ground?.35:.12)*dt);
  // obstacles
  for(const s of world.semis){
    if(c.x+70>s.x&&c.x-70<s.x+s.len&&c.y<s.h-45&&c.crashT<=0){crash('JUMP THE SEMI WITH THRUSTERS (↑)');c.x=s.x-520;c.vx=0;c.y=0;c.vy=0;c.ground=true;}
    if(!c.cleared[s.x]&&c.x-80>s.x+s.len){c.cleared[s.x]=true;if(c.y>=s.h-5||!c.ground||c.crashT<=0){
      if(c.flipping||c.flipsDone>0)addScore(3000,'KICKFLIP!','TONY HAWK WOULD BE PROUD');else addScore(1000,'SEMI CLEARED','TRY A KICKFLIP (SPACE) FOR 3000');}}
  }
  if(lvl===2){
    for(const j of world.jam)if(Math.abs(c.x-j.x)<120&&c.y<62&&c.crashT<=0&&c.x<world.goal){crash('THRUSTERS UP (↑) TO FLY OVER THE JAM');c.y=160;c.vy=350;c.vx=300;c.ground=false;c.gas=Math.max(c.gas,.5);break;}
    for(const r of world.rings)if(!r.got&&Math.hypot(c.x-r.x,c.y+25-r.y)<95){r.got=true;addScore(750,'RING','');c.gas=Math.min(1,c.gas+.25);}
  }
  // engine audio
  if(AC&&engG){const sp=Math.abs(c.ground||c.loop?c.vx:c.vx*.6);eng.frequency.setTargetAtTime(40+sp*.08,AC.currentTime,.05);eng._b.frequency.setTargetAtTime(80+sp*.16,AC.currentTime,.05);
    engG.gain.setTargetAtTime(st==='play'&&!paused?.05+Math.min(.08,sp/30000):0,AC.currentTime,.1);hissG.gain.setTargetAtTime(gasUse>0&&!paused?.22:(c.drift?.1:0),AC.currentTime,.05);}
  // particles
  for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.k==='s'){p.r+=40*dt;p.vx*=.98;}if(p.k==='p')p.vy-=G*dt;}
  parts=parts.filter(p=>p.life>0);if(parts.length>600)parts.splice(0,parts.length-600);
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0;}
  shake*=Math.pow(.02,dt);
  const done=lvl===2?(c.x>world.goal&&c.ground&&c.landed):(c.x>world.goal&&!c.loop);
  if(done)finish();
}

/* ---------------- render ---------------- */
let camX=0,camY=0;
const stars=[...Array(160)].map(()=>[Math.random(),Math.random()*.7,Math.random()*1.5+.3]);
function drawCar(g,opt={}){
  // local coords: +x forward, ground y=0, up = negative
  const ws=opt.wheel||0;
  g.save();
  // shadow underglow
  g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(0,1,92,6,0,0,7);g.fill();
  // lower black sill
  g.fillStyle='#16171a';g.beginPath();g.moveTo(-86,-13);g.lineTo(86,-10);g.lineTo(84,-5);g.lineTo(-84,-6);g.closePath();g.fill();
  // body
  const bg=g.createLinearGradient(0,-52,0,-8);bg.addColorStop(0,'#f4f5f7');bg.addColorStop(.45,'#dfe2e6');bg.addColorStop(.8,'#a9aeb5');bg.addColorStop(1,'#6d7178');
  g.fillStyle=bg;g.beginPath();
  g.moveTo(88,-13);g.quadraticCurveTo(90,-20,80,-23);g.lineTo(30,-34);g.quadraticCurveTo(5,-48,-18,-51);g.quadraticCurveTo(-55,-49,-80,-42);
  g.quadraticCurveTo(-88,-40,-88,-32);g.lineTo(-87,-13);g.closePath();g.fill();
  // shoulder crease highlight
  g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.2;g.beginPath();g.moveTo(78,-22);g.lineTo(28,-31);g.moveTo(-30,-36);g.quadraticCurveTo(-60,-38,-84,-36);g.stroke();
  // side scoop / door cut
  g.strokeStyle='rgba(40,42,48,.55)';g.lineWidth=1;g.beginPath();g.moveTo(32,-30);g.lineTo(26,-14);g.moveTo(-34,-34);g.quadraticCurveTo(-30,-22,-36,-14);g.stroke();
  g.fillStyle='rgba(20,22,26,.7)';g.beginPath();g.moveTo(-36,-24);g.quadraticCurveTo(-24,-28,-8,-27);g.lineTo(-10,-22);g.quadraticCurveTo(-24,-21,-34,-17);g.closePath();g.fill();
  // canopy (gold glazed)
  const gg=g.createLinearGradient(-40,-52,30,-30);gg.addColorStop(0,'#3a2c12');gg.addColorStop(.5,'#b08a3e');gg.addColorStop(.75,'#e7c97a');gg.addColorStop(1,'#5b4520');
  if(!opt.door){g.fillStyle=gg;g.beginPath();g.moveTo(26,-33);g.quadraticCurveTo(4,-46,-18,-48.5);g.quadraticCurveTo(-44,-47,-58,-43);g.quadraticCurveTo(-36,-38,-22,-36);g.lineTo(18,-31);g.closePath();g.fill();
    g.strokeStyle='rgba(255,240,200,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(20,-34);g.quadraticCurveTo(0,-44,-20,-46);g.stroke();}
  else{ // doors open (gull-wing): cockpit visible + door raised
    g.fillStyle='#0b0b0d';g.beginPath();g.moveTo(26,-33);g.quadraticCurveTo(4,-46,-18,-48.5);g.quadraticCurveTo(-44,-47,-58,-43);g.lineTo(-30,-22);g.lineTo(18,-22);g.closePath();g.fill();
    g.fillStyle='#e9e9ea';g.beginPath();g.arc(-14,-38,5,0,7);g.fill();
    g.save();g.translate(-4,-49);g.rotate(-1.15);g.fillStyle=bg;g.beginPath();g.moveTo(0,0);g.lineTo(32,4);g.lineTo(28,26);g.lineTo(-4,22);g.closePath();g.fill();
    g.fillStyle=gg;g.beginPath();g.moveTo(2,2);g.lineTo(26,5);g.lineTo(24,13);g.lineTo(0,10);g.closePath();g.fill();g.restore();}
  // hidden headlight slit
  g.strokeStyle='#fff';g.shadowColor='#bfe6ff';g.shadowBlur=opt.lights?14:4;g.lineWidth=1.5;g.beginPath();g.moveTo(86,-17);g.lineTo(72,-21);g.stroke();
  // full-length red rear light bar (at tail)
  g.shadowColor='#ff1a2b';g.shadowBlur=18;g.strokeStyle='#ff2a3a';g.lineWidth=3;g.beginPath();g.moveTo(-88,-38);g.lineTo(-87.5,-28);g.stroke();
  g.lineWidth=1.4;g.beginPath();g.moveTo(-86,-39);g.lineTo(-70,-42.5);g.stroke();g.shadowBlur=0;
  // active rear wing hint
  if(opt.wing){g.fillStyle='#2a2b30';g.beginPath();g.moveTo(-82,-43);g.lineTo(-58,-46-opt.wing*6);g.lineTo(-60,-43);g.closePath();g.fill();}
  // wheels
  for(const wx of[55,-53]){
    g.fillStyle='#050506';g.beginPath();g.arc(wx,-17,19,Math.PI,0);g.fill(); // arch shadow
    g.fillStyle='#111';g.beginPath();g.arc(wx,-17,17,0,7);g.fill();
    const rg=g.createRadialGradient(wx,-17,2,wx,-17,13);rg.addColorStop(0,'#555');rg.addColorStop(1,'#1d1e22');g.fillStyle=rg;g.beginPath();g.arc(wx,-17,13,0,7);g.fill();
    g.strokeStyle='#c9ccd2';g.lineWidth=1;g.beginPath();
    for(let i=0;i<12;i++){const an=ws+i*Math.PI/6;g.moveTo(wx+Math.cos(an)*3,-17+Math.sin(an)*3);g.lineTo(wx+Math.cos(an)*12.5,-17+Math.sin(an)*12.5);}g.stroke();
    g.strokeStyle='#8a8d93';g.beginPath();g.arc(wx,-17,13,0,7);g.stroke();
  }
  g.restore();
}
function drawSemi(g,x,len,h){ // world-space semi drawn with y-down screen transform already
  g.save();g.translate(x,0);
  g.fillStyle='#d8dade';g.fillRect(0,-h,len-100,h-24);        // trailer
  g.fillStyle='#bfc2c8';g.fillRect(0,-h,len-100,6);
  g.fillStyle='#0d0d10';g.fillRect(4,-26,len-108,4);
  g.font='bold 22px Orbitron,sans-serif';g.fillStyle='#c8102e';g.fillText('T E S L A',30,-h/2);
  // cab (Semi style, faces right)
  const cx=len-96;g.fillStyle='#e9eaec';g.beginPath();g.moveTo(cx,-24);g.lineTo(cx,-h+6);g.quadraticCurveTo(cx+30,-h-4,cx+70,-h+40);g.lineTo(cx+96,-60);g.lineTo(cx+96,-24);g.closePath();g.fill();
  g.fillStyle='#1b1d22';g.beginPath();g.moveTo(cx+30,-h+8);g.quadraticCurveTo(cx+52,-h+10,cx+74,-h+52);g.lineTo(cx+40,-h+52);g.closePath();g.fill();
  g.strokeStyle='#fff';g.shadowColor='#fff';g.shadowBlur=8;g.lineWidth=2;g.beginPath();g.moveTo(cx+80,-62);g.lineTo(cx+95,-62);g.stroke();g.shadowBlur=0;
  for(const wx of[30,80,cx+20,cx+75]){g.fillStyle='#0a0a0a';g.beginPath();g.arc(wx,-14,14,0,7);g.fill();g.fillStyle='#777';g.beginPath();g.arc(wx,-14,5,0,7);g.fill();}
  g.restore();
}
function drawJamCar(g,x,col){g.save();g.translate(x,0);g.fillStyle=col;g.beginPath();g.moveTo(-60,-10);g.lineTo(-58,-34);g.quadraticCurveTo(-30,-58,10,-56);g.lineTo(40,-36);g.lineTo(60,-30);g.lineTo(60,-10);g.closePath();g.fill();
  g.fillStyle='rgba(20,24,30,.85)';g.beginPath();g.moveTo(-40,-38);g.quadraticCurveTo(-25,-52,8,-51);g.lineTo(30,-37);g.closePath();g.fill();
  g.fillStyle='#ff2030';g.shadowColor='#ff2030';g.shadowBlur=10;g.fillRect(-61,-30,4,7);g.shadowBlur=0;
  g.fillStyle='#090909';for(const wx of[-36,38]){g.beginPath();g.arc(wx,-10,11,0,7);g.fill();}g.restore();}

function render(dt){
  const g=ctx;g.setTransform(DPR,0,0,DPR,0,0);
  const vw=W/S,vh=H/S;
  // camera
  if(st==='play'||st==='result'){const tx=car.x-vw*.28+Math.max(-150,Math.min(140,car.vx*.06));if(Math.abs(tx-camX)>1500||Q.has("ff")&&t<+Q.get("ff")+.3)camX=tx;camX+=(tx-camX)*Math.min(1,dt*6);
    const ty=Math.max(0,car.y-vh*.42);camY+=(ty-camY)*Math.min(1,dt*4);}
  else{camX+=dt*60;camY=0;}
  const groundY=vh*.80;
  // sky
  const sk=g.createLinearGradient(0,0,0,H);sk.addColorStop(0,lvl===2&&st!=='title'?'#05070f':'#030304');sk.addColorStop(.6,'#0b0b10');sk.addColorStop(1,'#141418');
  g.fillStyle=sk;g.fillRect(0,0,W,H);
  for(const s of stars){const x=((s[0]*W-camX*S*.02)%W+W)%W,y=s[1]*H+camY*S*.03;g.fillStyle='rgba(255,255,255,'+(.3+.3*Math.sin(t*2+s[0]*50))+')';g.fillRect(x,y,s[2],s[2]);}
  g.save();
  const sh=shake*(Math.random()-.5);g.translate(sh,shake*(Math.random()-.5));
  g.scale(S,S);
  // parallax: distant red stage arches + light towers
  const gy=groundY+camY;
  for(let i=-1;i<12;i++){const px=i*700-((camX*.25)%700);g.save();g.translate(px,gy-40);
    g.strokeStyle='rgba(255,30,45,.55)';g.shadowColor='#ff1a2b';g.shadowBlur=20;g.lineWidth=5;
    g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(10,-180,60,-260);g.moveTo(26,0);g.quadraticCurveTo(36,-170,80,-250);g.stroke();g.shadowBlur=0;
    g.fillStyle='rgba(255,40,40,.06)';g.beginPath();g.ellipse(40,-30,160,40,0,0,7);g.fill();g.restore();}
  for(let i=-1;i<20;i++){const px=i*260-((camX*.5)%260);g.fillStyle='#0e0e12';g.fillRect(px,gy-120,6,120);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(px-6,gy-124,18,4);
    g.fillStyle='rgba(255,255,255,.025)';g.beginPath();g.moveTo(px-6,gy-122);g.lineTo(px-80,gy);g.lineTo(px+90,gy);g.closePath();g.fill();}
  // world transform: x - camX, y up
  g.translate(-camX,gy);
  // ground
  g.fillStyle='#1a1a1e';g.fillRect(camX-50,0,vw+100,vh);
  const grd=g.createLinearGradient(0,0,0,60);grd.addColorStop(0,'#2a2a30');grd.addColorStop(1,'#141417');g.fillStyle=grd;g.fillRect(camX-50,0,vw+100,60);
  g.fillStyle='rgba(255,255,255,.55)';for(let x=Math.floor(camX/200)*200;x<camX+vw+200;x+=200)g.fillRect(x,22,90,3);
  g.fillStyle='rgba(255,40,50,.8)';g.fillRect(camX-50,0,vw+100,2);
  if(world){
    // goal gate
    const gx=world.goal;g.strokeStyle='#e9d39a';g.lineWidth=4;g.shadowColor='#e9d39a';g.shadowBlur=20;g.strokeRect(gx,-260,10,260);g.shadowBlur=0;
    g.font='900 34px Orbitron,sans-serif';g.fillStyle='#e9d39a';g.save();g.translate(gx+30,-200);g.transform(1,0,-.25,1,0,0);g.fillText('FINISH',0,0);g.restore();
    // cones
    for(const x of world.cones){g.fillStyle='#ff5a1f';g.beginPath();g.moveTo(x-9,0);g.lineTo(x,-26);g.lineTo(x+9,0);g.fill();g.fillStyle='#fff';g.fillRect(x-5,-14,10,3);}
    // loops
    for(const L of world.loops){g.save();g.translate(L.x,-L.R);
      g.strokeStyle='#2c2d33';g.lineWidth=18;g.beginPath();g.arc(0,0,L.R+9,0,7);g.stroke();
      g.strokeStyle=L.done?'#e9d39a':'#ff2a3a';g.shadowColor=g.strokeStyle;g.shadowBlur=18;g.lineWidth=2.5;
      g.beginPath();g.arc(0,0,L.R+18,0,7);g.stroke();g.beginPath();g.arc(0,0,L.R,0,7);g.stroke();g.shadowBlur=0;
      g.fillStyle='#0c0c10';g.fillRect(-14,L.R,28,8);g.font='800 14px Orbitron';g.fillStyle='#888';g.textAlign='center';g.fillText('SUCTION ZONE',0,L.R+40);g.textAlign='left';g.restore();
      if(!L.done&&car.x<L.x){g.fillStyle='rgba(255,42,58,.9)';g.font='900 18px Orbitron';g.fillText('HOLD SUCTION ▶',L.x-280,-30);}}
    for(const s of world.semis)drawSemi(g,s.x,s.len,s.h);
    if(lvl===2)for(const j of world.jam)drawJamCar(g,j.x,j.c);
    for(const r of world.rings)if(!r.got){g.strokeStyle='#4cc3ff';g.shadowColor='#4cc3ff';g.shadowBlur=16;g.lineWidth=5;g.beginPath();g.ellipse(r.x,-r.y,22,70,0,0,7);g.stroke();g.shadowBlur=0;}
  }
  // particles behind car
  for(const p of parts){const a=p.life/p.max;
    if(p.k==='s'){g.fillStyle='rgba(200,200,205,'+(a*.28)+')';g.beginPath();g.arc(p.x,-p.y,Math.max(.5,p.r),0,7);g.fill();}
    else if(p.k==='j'){g.fillStyle='rgba(220,240,255,'+(a*.8)+')';g.beginPath();g.arc(p.x,-p.y,Math.max(.5,p.r*(1.4-a)),0,7);g.fill();}
    else if(p.k==='p'){g.fillStyle='rgba(255,200,90,'+a+')';g.fillRect(p.x,-p.y,3,3);}
    else{g.fillStyle='rgba(76,195,255,'+a+')';g.fillRect(p.x,-p.y,2,6);}}
  // car
  if(st==='play'||st==='result'){const c=car;
    if(c.y>4&&!c.loop){g.fillStyle='rgba(0,0,0,'+Math.max(.05,.4-c.y/1500)+')';g.beginPath();g.ellipse(c.x,2,90*Math.max(.3,1-c.y/1200),6,0,0,7);g.fill();}
    g.save();g.translate(c.x,-c.y);g.rotate(-c.a);
    const fs=Math.cos(c.flip);g.scale(1,Math.abs(fs)<.12?.12*Math.sign(fs||1):fs);
    if(c.crashT>0&&Math.floor(t*20)%2)g.globalAlpha=.5;
    drawCar(g,{wheel:c.wheel,wing:lvl===0&&K.act||c.loop?1:(c.vx>1500?.6:0),lights:true});
    if(fs<0){g.fillStyle='rgba(10,10,12,.55)';g.fillRect(-88,-52,176,46);}
    g.restore();}
  g.restore();
  // title car showcase
  if(st==='title'){g.save();g.scale(S,S);const cx=vw*.5,cy=vh*.985;g.translate(cx,cy);g.scale(1.8,1.8);
    const sp=g.createRadialGradient(0,0,10,0,0,220);sp.addColorStop(0,'rgba(255,255,255,.18)');sp.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sp;g.beginPath();g.ellipse(0,0,220,30,0,0,7);g.fill();
    drawCar(g,{door:true,wheel:0,lights:true});g.restore();}
}

/* ---------------- HUD ---------------- */
function hud(){const c=car;
  $('spd').textContent=Math.round(Math.abs(c.loop?c.v:Math.hypot(c.vx,c.ground?0:c.vy))*PX2MPH);
  $('score').textContent=score.toLocaleString();$('time').textContent=t.toFixed(1);$('prog').textContent=Math.min(100,Math.round(c.x/world.goal*100));
  $('df').textContent=Math.round(c.df);let p=((c.a*180/Math.PI)%360+360)%360;$('pitch').textContent=Math.round(p);
  $('alt').textContent=(c.y*PX2FT).toFixed(1);$('gas').style.width=(c.gas*100)+'%';$('gas').style.background=c.gas<.25?'#ff2a3a':'';}

/* ---------------- loop ---------------- */
let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;
  if(st==='play'&&!paused){update(dt);hud();}
  render(st==='play'&&!paused?dt:dt*.5);
  requestAnimationFrame(frame);}
requestAnimationFrame(frame);
car=newCar();
if(Q.has('level')){start(+Q.get('level')||0);}
// test hook: fast-forward simulation (?ff=seconds)
if(Q.has('ff')){const n=+Q.get('ff')*60;for(let i=0;i<n&&st==='play';i++){update(1/60);}if(st==='play')hud();}
