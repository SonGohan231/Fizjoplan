(() => {
'use strict';
const C = window.FIZJO_RPG_CONTENT;
const DB = window.FIZJO_DB || {test_library:[],entries:[]};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const canvas=$('#gameCanvas'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const TILE=32,COLS=30,ROWS=20;
const SAVE='fizjorpg_atlas_v1';

const baseState=()=>({
 version:1,selectedWorld:'physio',unlockedWorlds:['physio'],bossesDefeated:[],
 level:1,xp:0,xpNext:100,hp:40,maxHp:40,atk:6,def:2,insight:0,maxInsight:6,gold:20,
 domainXP:Object.fromEntries(C.worlds.map(w=>[w.id,0])),domainLevel:Object.fromEntries(C.worlds.map(w=>[w.id,1])),
 skillPoints:Object.fromEntries(C.worlds.map(w=>[w.id,0])),skillRanks:Object.fromEntries(C.worlds.map(w=>[w.id,C.skillTrees[w.id].map(()=>0)])),
 inventory:[],equipment:{weapon:null,armor:null,charm:null},codexUnlocked:[],glossaryUnlocked:[],
 discoveredSecrets:0,chestsOpened:0,enemiesDefeated:0,correctAnswers:0,wrongAnswers:0,bestCombo:0,combo:0,runs:0,
 quests:{firstBoss:false,scholar:false,secretHunter:false,collector:false},
 settings:{music:true,sfx:true,screenShake:true,learningIntensity:'balanced',difficulty:'normal'},
 lastWorld:'physio',tutorialDone:false
});
let state=load();
let map=null,player={x:2,y:2},combat=null,quizCallback=null,currentTab='character',lastTime=0,shake=0;

function load(){try{const x=JSON.parse(localStorage.getItem(SAVE));return Object.assign(baseState(),x||{})}catch(e){return baseState()}}
function save(){localStorage.setItem(SAVE,JSON.stringify(state));updateHud()}
function xpNeed(l){return 80+Math.floor(l*35+l*l*4)}
function addXP(n){state.xp+=n;while(state.xp>=state.xpNext){state.xp-=state.xpNext;state.level++;state.xpNext=xpNeed(state.level);state.maxHp+=5;state.hp=state.maxHp;state.atk+=1;if(state.level%2===0)state.def+=1;toast(`POZIOM ${state.level}! +HP +siła`,'gold');audio.level();burst(canvas.width/2,150,'#ffd166',28)}save()}
function addDomainXP(world,n){state.domainXP[world]=(state.domainXP[world]||0)+n;let lv=state.domainLevel[world]||1;let need=60+lv*35;while(state.domainXP[world]>=need){state.domainXP[world]-=need;lv++;state.domainLevel[world]=lv;state.skillPoints[world]=(state.skillPoints[world]||0)+1;toast(`${worldName(world)}: poziom wiedzy ${lv} • +1 punkt talentu`,'rare');audio.unlock();need=60+lv*35}save()}
function worldName(id){return C.worlds.find(w=>w.id===id)?.name||id}
function worldColor(id){return C.worlds.find(w=>w.id===id)?.color||'#51d6c3'}

const audio={
 ac:null,master:null,musicTimer:null,musicStep:0,
 init(){if(this.ac)return;try{this.ac=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ac.createGain();this.master.gain.value=.18;this.master.connect(this.ac.destination);if(state.settings.music)this.startMusic()}catch(e){}},
 tone(freq=440,d=.08,type='sine',vol=.08,when=0){if(!this.ac||!state.settings.sfx)return;const o=this.ac.createOscillator(),g=this.ac.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,this.ac.currentTime+when);g.gain.exponentialRampToValueAtTime(.001,this.ac.currentTime+when+d);o.connect(g);g.connect(this.master);o.start(this.ac.currentTime+when);o.stop(this.ac.currentTime+when+d)},
 sample(name,fallback){if(!state.settings.sfx)return;try{const a=new Audio(`audio/${name}.wav`);a.volume=.48;a.play().catch(()=>fallback?.())}catch(e){fallback?.()}},
 hit(){this.sample('hit',()=>{this.tone(120,.08,'square',.12);this.tone(80,.12,'sawtooth',.07,.03)})},
 correct(){this.tone(523,.1,'sine',.08);this.tone(659,.11,'sine',.08,.09);this.tone(784,.14,'sine',.08,.18)},
 wrong(){this.tone(190,.18,'sawtooth',.07);this.tone(150,.2,'square',.05,.08)},
 chest(){this.sample('chest',()=>[392,523,659,784].forEach((f,i)=>this.tone(f,.12,'triangle',.06,i*.07)))},
 secret(){this.sample('secret',()=>[880,1175,1320].forEach((f,i)=>this.tone(f,.2,'sine',.05,i*.11)))},
 level(){this.sample('level',()=>[262,330,392,523,659].forEach((f,i)=>this.tone(f,.16,'triangle',.07,i*.08)))},
 unlock(){this.sample('level',()=>{this.tone(440,.12,'sine',.06);this.tone(660,.2,'sine',.07,.11);this.tone(990,.25,'sine',.06,.24)})},
 boss(){this.sample('boss',()=>{this.tone(72,.34,'sawtooth',.11);this.tone(49,.55,'sine',.09,.08)})},
 startMusic(){if(!this.ac||this.musicTimer||!state.settings.music)return;const patterns={physio:[110,165,220,247],anatomy:[98,147,196,220],physiology:[123,185,247,277],psychology:[104,156,208,233],medicine:[92,138,184,207],physics:[130,195,260,292],nature:[110,147,196,262],curiosity:[147,220,294,330]};this.musicTimer=setInterval(()=>{if(!state.settings.music||combat)return;const p=patterns[state.selectedWorld]||patterns.physio;const f=p[this.musicStep%p.length];this.tone(f,.45,'sine',.018);if(this.musicStep%2===0)this.tone(f*2,.24,'triangle',.012,.02);this.musicStep++},520)},
 stopMusic(){clearInterval(this.musicTimer);this.musicTimer=null}
};
window.addEventListener('pointerdown',()=>audio.init(),{once:true});window.addEventListener('keydown',()=>audio.init(),{once:true});

function updateHud(){
 $('#hpBar').style.width=`${100*state.hp/state.maxHp}%`;$('#hpText').textContent=`HP ${state.hp}/${state.maxHp}`;
 $('#xpBar').style.width=`${100*state.xp/state.xpNext}%`;$('#xpText').textContent=`LV ${state.level} • ${state.xp}/${state.xpNext}`;
 $('#atkText').textContent=totalAtk();$('#defText').textContent=totalDef();$('#insightText').textContent=`${state.insight}/${state.maxInsight}`;$('#goldText').textContent=state.gold;
}
function itemStat(slot,key){const id=state.equipment[slot];const it=state.inventory.find(x=>x.id===id);return it?.[key]||0}
function totalAtk(){return state.atk+itemStat('weapon','atk')+itemStat('charm','atk')}
function totalDef(){return state.def+itemStat('armor','def')+itemStat('charm','def')}
function totalMaxHp(){return state.maxHp+itemStat('armor','hp')+itemStat('charm','hp')}

function generateMap(worldId){
 const g=Array.from({length:ROWS},()=>Array(COLS).fill(1));const rooms=[];
 for(let r=0;r<12;r++){
  const w=4+Math.floor(Math.random()*6),h=3+Math.floor(Math.random()*5),x=1+Math.floor(Math.random()*(COLS-w-2)),y=1+Math.floor(Math.random()*(ROWS-h-2));
  if(rooms.some(a=>x<a.x+a.w+1&&x+w+1>a.x&&y<a.y+a.h+1&&y+h+1>a.y)){r--;if(r<-10)break;continue}
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)g[yy][xx]=0;
  const room={x,y,w,h,cx:Math.floor(x+w/2),cy:Math.floor(y+h/2)};
  if(rooms.length){const prev=rooms[rooms.length-1];if(Math.random()<.5){carveH(g,prev.cx,room.cx,prev.cy);carveV(g,prev.cy,room.cy,room.cx)}else{carveV(g,prev.cy,room.cy,prev.cx);carveH(g,prev.cx,room.cx,room.cy)}}rooms.push(room)
 }
 if(rooms.length<2)return generateMap(worldId);
 player={x:rooms[0].cx,y:rooms[0].cy};const occupied=new Set([key(player.x,player.y)]);
 const enemies=[];const count=9+Math.min(7,state.domainLevel[worldId]||1);
 for(let i=0;i<count;i++){const p=randomFloor(g,occupied,rooms,2);if(p){occupied.add(key(p.x,p.y));enemies.push(makeEnemy(worldId,p.x,p.y,false))}}
 const chests=[];for(let i=0;i<5;i++){const p=randomFloor(g,occupied,rooms,1);if(p){occupied.add(key(p.x,p.y));chests.push({...p,opened:false})}}
 const secrets=[];for(let i=0;i<3;i++){const p=randomFloor(g,occupied,rooms,1);if(p){occupied.add(key(p.x,p.y));secrets.push({...p,found:false})}}
 const last=rooms[rooms.length-1],boss=makeEnemy(worldId,last.cx,last.cy,true);occupied.add(key(boss.x,boss.y));
 const shrines=[];const sp=randomFloor(g,occupied,rooms,1);if(sp)shrines.push({...sp,used:false});
 return {grid:g,rooms,enemies,chests,secrets,shrines,boss,steps:0,worldId,discovered:new Set([key(player.x,player.y)])}
}
function carveH(g,x1,x2,y){for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)g[y][x]=0}
function carveV(g,y1,y2,x){for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)g[y][x]=0}
function key(x,y){return `${x},${y}`}
function randomFloor(g,occupied,rooms,minRoom=1){for(let n=0;n<300;n++){const room=rooms[minRoom+Math.floor(Math.random()*Math.max(1,rooms.length-minRoom))]||rooms[0],x=room.x+Math.floor(Math.random()*room.w),y=room.y+Math.floor(Math.random()*room.h);if(g[y][x]===0&&!occupied.has(key(x,y))&&Math.abs(x-player.x)+Math.abs(y-player.y)>4)return{x,y}}return null}
function makeEnemy(world,x,y,boss){const base=pick(C.enemies[world]||C.enemies.physio),scale=1+(state.domainLevel[world]-1)*.08+(state.level-1)*.04;return{id:uid(),x,y,name:boss?(C.worlds.find(w=>w.id===world)?.boss||'Boss'):base[0],hp:Math.floor((boss?base[1]*3.4:base[1])*scale),maxHp:Math.floor((boss?base[1]*3.4:base[1])*scale),atk:Math.floor((boss?base[2]*1.5:base[2])*scale),def:boss?3:Math.floor(state.domainLevel[world]/3),boss,alive:true}}

function enterWorld(id,newRun=true){if(!state.unlockedWorlds.includes(id)){toast('Ta kraina jest jeszcze zamknięta.','rare');return}state.selectedWorld=id;state.lastWorld=id;if(newRun)state.runs++;state.hp=Math.min(state.hp,totalMaxHp());map=generateMap(id);combat=null;$('#combatPanel').classList.add('hidden');$('#worldModal').classList.add('hidden');if(state.settings.music){audio.stopMusic();audio.startMusic()}toast(`Wyprawa: ${worldName(id)}`,'good');save();renderWorldGrid();draw()}

function move(dx,dy){if(!map||combat||!$('#quizModal').classList.contains('hidden')||!$('#sidePanel').classList.contains('hidden'))return;const nx=player.x+dx,ny=player.y+dy;if(nx<0||ny<0||nx>=COLS||ny>=ROWS||map.grid[ny][nx]!==0)return;player.x=nx;player.y=ny;map.steps++;revealAround();checkTile();roamEnemies();draw();if(map.steps%14===0&&state.hp<totalMaxHp())state.hp=Math.min(totalMaxHp(),state.hp+1);save()}
function revealAround(){for(let y=player.y-2;y<=player.y+2;y++)for(let x=player.x-2;x<=player.x+2;x++)if(x>=0&&y>=0&&x<COLS&&y<ROWS)map.discovered.add(key(x,y))}
function roamEnemies(){for(const e of map.enemies){if(!e.alive||Math.random()>.28)continue;const d=pick([[1,0],[-1,0],[0,1],[0,-1]]),nx=e.x+d[0],ny=e.y+d[1];if(map.grid[ny]?.[nx]===0&&Math.abs(nx-player.x)+Math.abs(ny-player.y)>1&&!map.enemies.some(o=>o.alive&&o!==e&&o.x===nx&&o.y===ny)){e.x=nx;e.y=ny}}const adjacent=map.enemies.find(e=>e.alive&&Math.abs(e.x-player.x)+Math.abs(e.y-player.y)===0);if(adjacent)startCombat(adjacent)}
function checkTile(){
 const e=map.enemies.find(e=>e.alive&&e.x===player.x&&e.y===player.y);if(e){startCombat(e);return}
 if(map.boss.alive&&map.boss.x===player.x&&map.boss.y===player.y){startCombat(map.boss);return}
 const c=map.chests.find(c=>!c.opened&&c.x===player.x&&c.y===player.y);if(c){c.opened=true;openChest(false)}
 const s=map.secrets.find(s=>!s.found&&s.x===player.x&&s.y===player.y);if(s){s.found=true;state.discoveredSecrets++;state.combo++;openChest(true);toast('SEKRET ODKRYTY! Ukryta komnata reaguje na ciekawość.','rare');audio.secret();burst(player.x*TILE+16,player.y*TILE+16,'#d6a2ff',22)}
 const sh=map.shrines.find(s=>!s.used&&s.x===player.x&&s.y===player.y);if(sh){sh.used=true;const heal=Math.ceil(totalMaxHp()*.28);state.hp=Math.min(totalMaxHp(),state.hp+heal);state.insight=Math.min(state.maxInsight,state.insight+2);toast(`Sanktuarium: +${heal} HP, +2 Insight`,'good');audio.correct()}
}

function openChest(secret){state.chestsOpened++;const item=generateItem(secret?2:0);state.inventory.push(item);const gold=secret?25+Math.floor(Math.random()*30):8+Math.floor(Math.random()*16);state.gold+=gold;toast(`${secret?'Sekretny łup':'Skrzynia'}: ${item.name} + ${gold}◈`,item.rarity==='legendary'?'gold':item.rarity==='epic'?'rare':'good');audio.chest();if(state.inventory.length>=10)state.quests.collector=true;if(state.discoveredSecrets>=3)state.quests.secretHunter=true;save()}
function generateItem(bonus=0){const roll=Math.random()+bonus*.08;let rarity=roll>.97?'legendary':roll>.84?'epic':roll>.62?'rare':roll>.34?'uncommon':'common';const mult={common:1,uncommon:1.35,rare:1.8,epic:2.5,legendary:3.4}[rarity];const type=pick(['weapon','armor','charm']),name=pick(C.itemNames[type]);const lvl=Math.max(1,state.level+Math.floor(Math.random()*3)-1);const it={id:uid(),type,name:`${name} +${lvl}`,rarity,lvl,atk:0,def:0,hp:0};if(type==='weapon')it.atk=Math.max(1,Math.floor((1+lvl*.55)*mult));if(type==='armor'){it.def=Math.max(1,Math.floor((.7+lvl*.35)*mult));it.hp=Math.floor((2+lvl)*mult)}if(type==='charm'){it.atk=Math.floor((.5+lvl*.2)*mult);it.def=Math.floor((.4+lvl*.18)*mult);it.hp=Math.floor((1+lvl*.6)*mult)}return it}

function startCombat(enemy){if(combat)return;combat={enemy,turn:0};$('#combatPanel').classList.remove('hidden');$('#enemyName').textContent=(enemy.boss?'☠ ':'')+enemy.name;combatLog(enemy.boss?'Boss blokuje przejście. Jego słabość można odkryć wiedzą.':'Przeciwnik staje na drodze.');updateEnemyHp();if(enemy.boss){const b=$('#bossBanner');b.textContent=enemy.name;b.classList.remove('hidden');setTimeout(()=>b.classList.add('hidden'),2300);shake=10;audio.boss()}else{audio.hit()}}
function combatLog(t){$('#combatLog').textContent=t}
function updateEnemyHp(){if(!combat)return;const e=combat.enemy;$('#enemyHpBar').style.width=`${100*e.hp/e.maxHp}%`}
function damageEnemy(n,crit=false){const e=combat.enemy;e.hp=Math.max(0,e.hp-n);updateEnemyHp();floatText(player.x*TILE+28,player.y*TILE-5,`${crit?'✦ ':''}-${n}`,crit?'#ffd166':'#ff9c8f');if(state.settings.screenShake)shake=crit?9:4;if(e.hp<=0)winCombat()}
function enemyTurn(){if(!combat)return;const e=combat.enemy;let dmg=Math.max(1,e.atk-totalDef()+Math.floor(Math.random()*3)-1);state.hp=Math.max(0,state.hp-dmg);floatText(player.x*TILE+8,player.y*TILE-5,`-${dmg}`,'#ff6678');combatLog(`${e.name} zadaje ${dmg} obrażeń.`);audio.hit();if(state.hp<=0){loseRun();return}save()}
function winCombat(){const e=combat.enemy;e.alive=false;state.enemiesDefeated++;const xp=e.boss?60+state.domainLevel[map.worldId]*12:12+state.domainLevel[map.worldId]*3,g=e.boss?45:4+Math.floor(Math.random()*8);state.gold+=g;addXP(xp);if(Math.random()<(e.boss?.95:.26)){const it=generateItem(e.boss?2:0);state.inventory.push(it);toast(`ŁUP: ${it.name}`,it.rarity==='legendary'?'gold':it.rarity==='epic'?'rare':'good')}combat=null;$('#combatPanel').classList.add('hidden');toast(`Pokonano • +${xp} XP • +${g}◈`,'good');if(e.boss)bossDefeated(map.worldId);save();draw()}
function bossDefeated(world){if(!state.bossesDefeated.includes(world))state.bossesDefeated.push(world);state.skillPoints[world]=(state.skillPoints[world]||0)+1;state.quests.firstBoss=true;const idx=C.worlds.findIndex(w=>w.id===world),next=C.worlds[idx+1];if(next&&!state.unlockedWorlds.includes(next.id)){state.unlockedWorlds.push(next.id);toast(`NOWY ŚWIAT: ${next.name}`,'gold');audio.unlock()}state.hp=Math.min(totalMaxHp(),state.hp+Math.ceil(totalMaxHp()*.35));renderWorldGrid();save()}
function loseRun(){combat=null;$('#combatPanel').classList.add('hidden');state.hp=totalMaxHp();state.insight=0;state.combo=0;state.gold=Math.max(0,state.gold-Math.floor(state.gold*.1));toast('Wyprawa zakończona. Zachowujesz wiedzę, sprzęt i rozwój domen.','rare');openWorldModal();save()}

function combatAction(a){if(!combat)return;audio.init();if(a==='attack'){const dmg=Math.max(1,totalAtk()-combat.enemy.def+Math.floor(Math.random()*4));damageEnemy(dmg,false);if(combat)enemyTurn()}
 else if(a==='focus'){openQuiz(map.worldId,(ok)=>{if(!combat)return;if(ok){const dmg=Math.floor(totalAtk()*.8)+5+(state.domainLevel[map.worldId]||1);damageEnemy(dmg,true);combatLog(`Wiedza odsłania słabość: ${dmg} obrażeń.`)}else enemyTurn()})}
 else if(a==='skill'){if(state.insight<2){combatLog('Potrzebujesz 2 Insight. Zdobywaj je poprawnymi odpowiedziami.');return}state.insight-=2;const dmg=Math.floor(totalAtk()*1.8)+state.level;damageEnemy(dmg,true);combatLog(`Technika specjalna: ${dmg} obrażeń.`);audio.correct();if(combat)enemyTurn();save()}
 else if(a==='item'){const heal=Math.max(7,Math.floor(totalMaxHp()*.22));if(state.gold<5){combatLog('Brakuje 5◈ na awaryjny zestaw regeneracyjny.');return}state.gold-=5;state.hp=Math.min(totalMaxHp(),state.hp+heal);combatLog(`Regeneracja +${heal} HP.`);audio.correct();enemyTurn();save()}
 else if(a==='flee'){if(combat.enemy.boss){combatLog('Od bossa nie można uciec.');return}if(Math.random()<.65){combat=null;$('#combatPanel').classList.add('hidden');toast('Udało się wycofać.');player.x=Math.max(1,player.x-1)}else{combatLog('Ucieczka nieudana.');enemyTurn()}}}

function buildPhysioQuestions(){const tests=DB.test_library||[];const qs=[];for(const t of tests){if(!t?.name||!t?.positive)continue;const pool=shuffle(tests.filter(x=>x.name&&x.id!==t.id)).slice(0,3).map(x=>x.name);const answers=shuffle([t.name,...pool]);qs.push({world:'physio',question:`Który test najlepiej pasuje do dodatniego wyniku: „${t.positive}”?`,answers,correct:answers.indexOf(t.name),explain:`${t.name}: ${t.positive}`,term:t.name,tag:'testy'})}
 const entries=DB.entries||[];for(const e of entries.slice(0,25)){const names=shuffle(entries.filter(x=>x.problem&&x.id!==e.id)).slice(0,3).map(x=>x.problem);const ans=shuffle([e.problem,...names]);qs.push({world:'physio',question:`Który problem kliniczny ma cel: „${e.goal||e.category||'ocena funkcjonalna'}”?`,answers:ans,correct:ans.indexOf(e.problem),explain:`${e.problem} — ${e.goal||e.category||''}`,term:e.problem,tag:'klinika'})}return qs}
const physioQuestions=buildPhysioQuestions();
function questionPool(world){let pool=C.questions.filter(q=>q.world===world);if(world==='physio')pool=[...pool,...physioQuestions];return pool.length?pool:C.questions}
function openQuiz(world,cb){audio.init();quizCallback=cb;const q=pick(questionPool(world));const m=$('#quizModal');m.classList.remove('hidden');$('#quizDomain').textContent=worldName(world).toUpperCase();$('#quizDomain').style.color=worldColor(world);$('#quizReward').textContent='Wiedza = moc + trwały rozwój';$('#quizQuestion').textContent=q.question;$('#quizHint').textContent=q.tag?`Dziedzina: ${q.tag}`:'';$('#quizExplain').classList.add('hidden');const a=$('#quizAnswers');a.innerHTML='';q.answers.forEach((txt,i)=>{const b=document.createElement('button');b.textContent=txt;b.onclick=()=>answerQuiz(q,i,b);a.appendChild(b)})}
function answerQuiz(q,i,btn){const buttons=$$('#quizAnswers button');buttons.forEach(b=>b.disabled=true);const ok=i===q.correct;buttons[q.correct].classList.add('correct');if(!ok)btn.classList.add('wrong');const ex=$('#quizExplain');ex.textContent=q.explain;ex.classList.remove('hidden');if(ok){state.correctAnswers++;state.combo++;state.bestCombo=Math.max(state.bestCombo,state.combo);state.insight=Math.min(state.maxInsight,state.insight+1);const bonus=state.combo>=5?4:0;addDomainXP(q.world,10+bonus);addXP(4+bonus);if(q.term)unlockTerm(q.term,q.world,q.explain);toast(`POPRAWNIE • combo x${state.combo} • +${10+bonus} KXP`,'good');audio.correct();burst(canvas.width/2,canvas.height/2,'#55e0b4',18)}else{state.wrongAnswers++;state.combo=0;toast('Błąd zapisany do pamięci runu — spróbuj ponownie później.','rare');audio.wrong()}if(state.correctAnswers>=25)state.quests.scholar=true;save();setTimeout(()=>{ $('#quizModal').classList.add('hidden');const cb=quizCallback;quizCallback=null;if(cb)cb(ok)},ok?900:1500)}
function unlockTerm(term,world,definition){const id=`auto:${world}:${term}`;if(!state.codexUnlocked.includes(id)){state.codexUnlocked.push(id);window._autoCodex=window._autoCodex||{};window._autoCodex[id]={term,world,definition};toast(`Kodeks: ${term}`,'rare')}const g=C.glossary.find(x=>x.term===term);if(g&&!state.glossaryUnlocked.includes(g.id))state.glossaryUnlocked.push(g.id)}

function draw(){if(!map)return;const w=C.worlds.find(x=>x.id===map.worldId);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#061019';ctx.fillRect(0,0,canvas.width,canvas.height);
 const offX=shake?(Math.random()-.5)*shake:0,offY=shake?(Math.random()-.5)*shake:0;shake*=.82;if(shake<.3)shake=0;ctx.save();ctx.translate(offX,offY);
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const seen=map.discovered.has(key(x,y)),tile=map.grid[y][x];if(!seen){ctx.fillStyle='#020608';ctx.fillRect(x*TILE,y*TILE,TILE,TILE);continue}if(tile===1){ctx.fillStyle='#0b1d27';ctx.fillRect(x*TILE,y*TILE,TILE,TILE);ctx.fillStyle='rgba(255,255,255,.025)';ctx.fillRect(x*TILE+2,y*TILE+2,TILE-4,3)}else{ctx.fillStyle='#102832';ctx.fillRect(x*TILE,y*TILE,TILE,TILE);ctx.strokeStyle='rgba(255,255,255,.025)';ctx.strokeRect(x*TILE+.5,y*TILE+.5,TILE-1,TILE-1)}}
 // ambience particles / floor runes
 ctx.globalAlpha=.13;ctx.fillStyle=w.color;for(let i=0;i<12;i++){const x=(i*79+map.steps*3)%canvas.width,y=(i*53+map.steps)%canvas.height;ctx.fillRect(x,y,2,2)}ctx.globalAlpha=1;
 for(const c of map.chests)if(!c.opened&&map.discovered.has(key(c.x,c.y)))drawIcon(c.x,c.y,'▣','#d8aa52');
 for(const s of map.shrines)if(!s.used&&map.discovered.has(key(s.x,s.y)))drawIcon(s.x,s.y,'✧','#7ad9c8');
 for(const e of map.enemies)if(e.alive&&map.discovered.has(key(e.x,e.y)))drawEnemy(e);
 if(map.boss.alive&&map.discovered.has(key(map.boss.x,map.boss.y)))drawEnemy(map.boss);
 drawPlayer();ctx.restore()}

function drawIcon(x,y,ch,color){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(x*TILE+6,y*TILE+7,20,20);ctx.fillStyle=color;ctx.font='bold 19px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ch,x*TILE+16,y*TILE+17)}
function drawPlayer(){const x=player.x*TILE,y=player.y*TILE;ctx.fillStyle='#58dbc6';ctx.fillRect(x+8,y+7,16,19);ctx.fillStyle='#dffcf5';ctx.fillRect(x+11,y+3,10,9);ctx.fillStyle='#153842';ctx.fillRect(x+11,y+14,10,4);ctx.fillStyle='#ffd166';ctx.fillRect(x+23,y+12,5,12)}
function drawEnemy(e){const x=e.x*TILE,y=e.y*TILE,c=e.boss?'#d94a60':'#bd6673';ctx.fillStyle=c;ctx.fillRect(x+7,y+9,18,16);ctx.fillStyle=e.boss?'#ffd166':'#ffd5d8';ctx.fillRect(x+10,y+5,12,9);ctx.fillStyle='#1a0a0e';ctx.fillRect(x+11,y+9,3,3);ctx.fillRect(x+19,y+9,3,3);if(e.boss){ctx.strokeStyle='#ffbf5d';ctx.lineWidth=2;ctx.strokeRect(x+3,y+2,26,27)}}

function toast(text,type=''){const d=document.createElement('div');d.className=`toast ${type}`;d.textContent=text;$('#toastLayer').appendChild(d);setTimeout(()=>d.remove(),2700)}
function floatText(x,y,text,color){const d=document.createElement('div');d.className='float-text';d.style.left=`${100*x/canvas.width}%`;d.style.top=`${100*y/canvas.height}%`;d.style.color=color;d.textContent=text;$('#floatLayer').appendChild(d);setTimeout(()=>d.remove(),950)}
function burst(x,y,color,n){for(let i=0;i<n;i++){const d=document.createElement('i');d.style.cssText=`position:absolute;left:${100*x/canvas.width}%;top:${100*y/canvas.height}%;width:4px;height:4px;border-radius:50%;background:${color};pointer-events:none;z-index:20;transition:transform .75s ease-out,opacity .75s;`;$('#floatLayer').appendChild(d);requestAnimationFrame(()=>{d.style.transform=`translate(${(Math.random()-.5)*180}px,${(Math.random()-.5)*160}px)`;d.style.opacity=0});setTimeout(()=>d.remove(),800)}}

function openWorldModal(){renderWorldGrid();$('#worldModal').classList.remove('hidden')}
function renderWorldGrid(){const grid=$('#worldGrid');if(!grid)return;grid.innerHTML='';for(const w of C.worlds){const unlocked=state.unlockedWorlds.includes(w.id),done=state.bossesDefeated.includes(w.id);const b=document.createElement('button');b.className=`world-tile ${unlocked?'':'locked'} ${state.selectedWorld===w.id?'active':''}`;b.style.setProperty('--worldGlow',w.color+'33');b.innerHTML=`<span class="world-level">Wiedza ${state.domainLevel[w.id]||1}${done?' • BOSS ✓':''}</span><div class="world-icon">${w.icon}</div><h3>${w.name}</h3><p>${unlocked?w.desc:'🔒 Pokonaj bossa poprzedniej krainy, aby odblokować.'}</p>`;b.onclick=()=>{if(!unlocked){toast('Kraina zamknięta.','rare');return}state.selectedWorld=w.id;$$('.world-tile').forEach(x=>x.classList.remove('active'));b.classList.add('active');save()};grid.appendChild(b)}}

function openPanel(tab='character'){currentTab=tab;$('#sidePanel').classList.remove('hidden');renderPanel();}
function closePanel(){$('#sidePanel').classList.add('hidden')}
function renderPanel(){$$('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab));const body=$('#panelBody');const f={character:characterView,skills:skillsView,inventory:inventoryView,codex:codexView,worlds:worldsView,quests:questsView,settings:settingsView}[currentTab]||characterView;body.innerHTML=f();bindPanel()}
function characterView(){return `<div class="card"><h3>Wędrowiec Atlasu • poziom ${state.level}</h3><p class="muted">Rozwój bojowy i rozwój wiedzy są niezależne. Możesz grać bez quizów, ale wiedza otwiera skróty, sekrety i silniejsze techniki.</p><div class="stats-grid"><div class="stat"><b>${totalAtk()}</b><small>Atak</small></div><div class="stat"><b>${totalDef()}</b><small>Obrona</small></div><div class="stat"><b>${totalMaxHp()}</b><small>HP</small></div><div class="stat"><b>${state.bestCombo}</b><small>Najlepsze combo</small></div></div></div><div class="card"><h3>Statystyki kroniki</h3><p>Pokonani: <b>${state.enemiesDefeated}</b> • Skrzynie: <b>${state.chestsOpened}</b> • Sekrety: <b>${state.discoveredSecrets}</b> • Runy: <b>${state.runs}</b></p><p>Odpowiedzi: <b>${state.correctAnswers}</b> poprawnych / ${state.wrongAnswers} błędnych</p></div>`}
function skillsView(){return C.worlds.filter(w=>state.unlockedWorlds.includes(w.id)).map(w=>{const ranks=state.skillRanks[w.id]||[];return `<section class="skill-domain"><div class="skill-domain-head"><div><h3>${w.icon} ${w.name}</h3><small class="muted">Poziom wiedzy ${state.domainLevel[w.id]} • punkty: ${state.skillPoints[w.id]||0}</small></div><span>${state.domainXP[w.id]||0}/${60+(state.domainLevel[w.id]||1)*35} KXP</span></div><div class="progress"><span style="width:${Math.min(100,100*(state.domainXP[w.id]||0)/(60+(state.domainLevel[w.id]||1)*35))}%"></span></div><div class="skill-nodes">${C.skillTrees[w.id].map((s,i)=>`<button class="skill-node ${ranks[i]>0?'unlocked':''} ${ranks[i]>=3?'max':''}" data-skill="${w.id}:${i}"><b>${s[0]}</b><small>${s[1]}</small><em>${ranks[i]||0}/3 • koszt 1</em></button>`).join('')}</div></section>`}).join('')}
function inventoryView(){const eq=state.equipment;return `<div class="card"><h3>Założony ekwipunek</h3><div class="equipment">${['weapon','armor','charm'].map(s=>{const it=state.inventory.find(x=>x.id===eq[s]);return `<div class="slot"><small>${{weapon:'Broń',armor:'Pancerz',charm:'Relikt'}[s]}</small><b>${it?.name||'—'}</b>${it?`<span>ATK +${it.atk} DEF +${it.def} HP +${it.hp}</span>`:''}</div>`}).join('')}<div class="slot"><small>Waluta</small><b>${state.gold} ◈</b><span>Insight ${state.insight}/${state.maxInsight}</span></div></div></div><div class="inv-grid">${state.inventory.length?state.inventory.map(it=>`<button class="item ${it.rarity}" data-item="${it.id}"><div class="rarity">${it.rarity}</div><b>${it.name}</b><small>${it.type} • ATK +${it.atk} DEF +${it.def} HP +${it.hp}</small></button>`).join(''):'<p class="muted">Jeszcze nic. Szukaj skrzyń i sekretów.</p>'}</div>`}
function codexView(){const auto=window._autoCodex||{};const entries=[...C.glossary.map(g=>({...g,unlocked:state.glossaryUnlocked.includes(g.id)})),...state.codexUnlocked.map(id=>auto[id]?({...auto[id],id,unlocked:true}):null).filter(Boolean)];return `<div class="card"><h3>Kodeks i słownik</h3><p class="muted">Hasła odblokowujesz przez poprawne odpowiedzi, sekrety i bossów. Nieodkryte wpisy pozostają ukryte.</p></div>${entries.length?entries.map(e=>`<div class="codex-entry ${e.unlocked?'':'locked'}"><h4>${e.unlocked?e.term:'Nieodkryte hasło'}</h4><p>${e.unlocked?e.definition:'????????????????????????'}</p><small>${worldName(e.world)}</small></div>`).join(''):'<p class="muted">Kodeks jest pusty.</p>'}`}
function worldsView(){return C.worlds.map(w=>`<div class="card"><h3>${w.icon} ${w.name} ${state.unlockedWorlds.includes(w.id)?'':'🔒'}</h3><p>${w.desc}</p><small class="muted">Boss: ${w.boss} • wiedza ${state.domainLevel[w.id]||1} • ${state.bossesDefeated.includes(w.id)?'oczyszczona':'boss aktywny'}</small>${state.unlockedWorlds.includes(w.id)?`<p><button class="primary" data-enter="${w.id}">Rozpocznij wyprawę</button></p>`:''}</div>`).join('')}
function questsView(){const qs=[['firstBoss','Pierwsza pieczęć','Pokonaj pierwszego bossa','Relikt + punkt talentu'],['scholar','Głód wiedzy','Odpowiedz poprawnie na 25 pytań','Tytuł Uczonego'],['secretHunter','Szept ścian','Odkryj 3 sekrety','Większa szansa na rzadki loot'],['collector','Kolekcjoner','Zdobądź 10 przedmiotów','Bonus do złota']];return qs.map(q=>`<div class="card quest ${state.quests[q[0]]?'done':''}"><div><h3>${state.quests[q[0]]?'✓ ':''}${q[1]}</h3><p class="muted">${q[2]}</p></div><span class="reward">${q[3]}</span></div>`).join('')}
function settingsView(){return `<div class="card"><h3>Gra i nauka</h3><div class="setting-row"><span>Muzyka proceduralna</span><input type="checkbox" data-setting="music" ${state.settings.music?'checked':''}></div><div class="setting-row"><span>Dźwięki</span><input type="checkbox" data-setting="sfx" ${state.settings.sfx?'checked':''}></div><div class="setting-row"><span>Wstrząsy ekranu</span><input type="checkbox" data-setting="screenShake" ${state.settings.screenShake?'checked':''}></div><div class="setting-row"><span>Intensywność nauki</span><select data-setting="learningIntensity"><option value="light" ${state.settings.learningIntensity==='light'?'selected':''}>Lekka</option><option value="balanced" ${state.settings.learningIntensity==='balanced'?'selected':''}>Zbalansowana</option><option value="hard" ${state.settings.learningIntensity==='hard'?'selected':''}>Intensywna</option></select></div></div><div class="card"><h3>Dane</h3><button id="exportSave">Eksport zapisu</button> <button id="importSave">Import zapisu</button> <button id="resetSave" class="danger-btn">Reset gry</button></div>`}
function bindPanel(){
 $$('[data-skill]').forEach(b=>b.onclick=()=>{const [w,iS]=b.dataset.skill.split(':'),i=+iS;if((state.skillPoints[w]||0)<1){toast('Brak punktów talentu.','rare');return}if((state.skillRanks[w][i]||0)>=3){toast('Talent maksymalny.');return}state.skillPoints[w]--;state.skillRanks[w][i]++;applyTalentSideEffects(w,i);audio.unlock();save();renderPanel()});
 $$('[data-item]').forEach(b=>b.onclick=()=>{const it=state.inventory.find(x=>x.id===b.dataset.item);if(!it)return;state.equipment[it.type]=it.id;state.hp=Math.min(state.hp,totalMaxHp());toast(`Założono: ${it.name}`,'good');save();renderPanel()});
 $$('[data-enter]').forEach(b=>b.onclick=()=>{closePanel();enterWorld(b.dataset.enter,true)});
 $$('[data-setting]').forEach(el=>el.onchange=()=>{const k=el.dataset.setting;state.settings[k]=el.type==='checkbox'?el.checked:el.value;if(k==='music'){if(el.checked){audio.init();audio.startMusic()}else audio.stopMusic()}save()});
 $('#exportSave')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='FizjoRPG_save.json';a.click();URL.revokeObjectURL(a.href)});
 $('#importSave')?.addEventListener('click',()=>{const input=document.createElement('input');input.type='file';input.accept='.json';input.onchange=()=>{const f=input.files[0],r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);state=Object.assign(baseState(),d);save();renderPanel();toast('Zapis wczytany.','good')}catch(e){toast('Nieprawidłowy zapis.','rare')}};r.readAsText(f)};input.click()});
 $('#resetSave')?.addEventListener('click',()=>{if(confirm('Usunąć cały postęp FizjoRPG?')){localStorage.removeItem(SAVE);state=baseState();save();location.reload()}})
}
function applyTalentSideEffects(w,i){const r=state.skillRanks[w][i];if(w==='physiology'&&i===4)state.maxInsight=6+r;if(w==='physiology'&&i===2)state.maxHp+=2;if(w==='physics'&&i===4)state.def+=1;if(w==='physio'&&i===1)state.atk+=1}

function interact(){if(combat||!map)return;const adj=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];for(const [dx,dy] of adj){const s=map.secrets.find(s=>!s.found&&s.x===player.x+dx&&s.y===player.y+dy);if(s&&Math.random()<.7){s.found=true;state.discoveredSecrets++;openChest(true);toast('Ukryty mechanizm!','rare');audio.secret();save();draw();return}}openQuiz(map.worldId,()=>{})}

function keyboard(e){if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(!$('#worldModal').classList.contains('hidden'))return;const k=e.key.toLowerCase();if(k==='arrowup'||k==='w')move(0,-1);else if(k==='arrowdown'||k==='s')move(0,1);else if(k==='arrowleft'||k==='a')move(-1,0);else if(k==='arrowright'||k==='d')move(1,0);else if(k==='e'||k===' ')interact();else if(k==='i')openPanel('inventory');else if(k==='k')openPanel('skills');else if(k==='c')openPanel('codex')}
window.addEventListener('keydown',keyboard);
$$('[data-move]').forEach(b=>b.addEventListener('pointerdown',()=>{const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.move];move(...m)}));$('#mobileInteract').onclick=interact;
$('#menuBtn').onclick=()=>openPanel('character');$$('[data-close]').forEach(b=>b.onclick=closePanel);$$('.tabs button').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;renderPanel()});$$('[data-action]').forEach(b=>b.onclick=()=>combatAction(b.dataset.action));
$('#continueBtn').onclick=()=>enterWorld(state.selectedWorld||state.lastWorld||'physio',true);$('#newRunBtn').onclick=()=>{state.hp=totalMaxHp();state.insight=0;enterWorld(state.selectedWorld,true)};

function init(){state.xpNext=state.xpNext||xpNeed(state.level);state.hp=Math.min(state.hp,totalMaxHp());updateHud();renderWorldGrid();openWorldModal();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});setInterval(()=>{if(map&&!combat)draw()},3000);save()}
init();
})();
