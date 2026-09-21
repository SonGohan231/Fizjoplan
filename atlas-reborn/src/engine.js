import {WORLDS,CLASSES,RELICS,CONCEPTS,ORDERS} from './content.js';
export const SAVE_KEY='atlas-echa-ruchu-v1';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function rng(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function shuffle(a,r=Math.random){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').toLowerCase().replace(/[^a-z0-9]/g,'');
export function freshProfile(){return {version:1,classId:'guardian',xp:0,gold:0,unlocked:0,cleared:[],relics:[],talents:{vitality:0,power:0},knowledge:{},quests:{},history:[],counter:0,settings:{sound:true,music:true,motion:true,mode:'learning',text:1},run:null};}
const isRecord=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function validProfile(p){
 if(!isRecord(p)||p.version!==1||!CLASSES.some(c=>c.id===p.classId)||!number(p.xp,0,1e8)||!number(p.gold,0,1e8)||!number(p.unlocked,0,7)||!Number.isInteger(p.unlocked)||!number(p.counter,0,1e9))return false;
 if(!Array.isArray(p.cleared)||p.cleared.some(x=>!WORLDS.some(w=>w.id===x))||!Array.isArray(p.relics)||p.relics.some(x=>!RELICS.some(r=>r.id===x)))return false;
 if(!isRecord(p.settings)||!['learning','adventure'].includes(p.settings.mode)||!isRecord(p.talents)||!['vitality','power'].every(k=>Number.isInteger(p.talents[k])&&number(p.talents[k],0,10))||!isRecord(p.knowledge)||!isRecord(p.quests)||!Array.isArray(p.history)||p.history.length>30)return false;
 for(const [id,k] of Object.entries(p.knowledge)){if(!CONCEPTS.some(c=>c.id===id)||!isRecord(k)||!number(k.right,0,1e6)||!number(k.wrong,0,1e6)||!number(k.streak,0,1e6)||!number(k.due,0,1e16))return false;}
 if(p.run){const r=p.run;if(!isRecord(r)||!WORLDS.some(w=>w.id===r.world)||!number(r.stage,0,4)||!Number.isInteger(r.stage)||!number(r.hp,0,999)||!number(r.maxHp,1,999)||r.hp>r.maxHp||!number(r.focus,0,6)||!number(r.seed,0,4294967295)||!number(r.potions,0,20)||!number(r.challenge,0,3)||!number(r.gold,0,1e6)||!number(r.xp,0,1e6)||!isRecord(r.done)||!Array.isArray(r.relics)||r.relics.some(id=>!RELICS.some(x=>x.id===id))||!Array.isArray(r.seen)||!Array.isArray(r.quizUsed)||!isRecord(r.pos)||!number(r.pos.x,0,24)||!number(r.pos.y,0,18))return false;
  if(r.reward&&(!isRecord(r.reward)||typeof r.reward.title!=='string'||!Array.isArray(r.reward.choices)||r.reward.choices.some(id=>!RELICS.some(x=>x.id===id))))return false;
  if(r.battle){const b=r.battle;if(!isRecord(b)||!number(b.hp,0,10000)||!number(b.maxHp,1,10000)||b.hp>b.maxHp||!number(b.turn,0,100000)||!number(b.attack,1,999)||!number(b.armor,0,100)||!Array.isArray(b.log)||!['strike','guard','heavy','drain','charge','heal'].includes(b.intent))return false;
   if(b.quiz&&(!isRecord(b.quiz)||!CONCEPTS.some(c=>c.id===b.quiz.id&&c.world===r.world)||!['choice','recall','order'].includes(b.quiz.type)||!Array.isArray(b.quiz.options)||b.quiz.options.some(x=>typeof x!=='string')))return false;
   if(b.feedback&&(!isRecord(b.feedback)||!CONCEPTS.some(c=>c.id===b.feedback.conceptId)||typeof b.feedback.expected!=='string'||typeof b.feedback.correct!=='boolean'))return false;
  }
 }
 return true;
}
export class SaveStore{
 constructor(storage){this.storage=storage;this.recovered=false;this.error=null;}
 load(){for(const key of [SAVE_KEY,SAVE_KEY+'-backup']){try{const s=this.storage.getItem(key);if(s){const p=JSON.parse(s);if(validProfile(p)){this.recovered=key.endsWith('backup');return p;}}}catch{}}return freshProfile();}
 save(p){if(!validProfile(p))throw new Error('Nieprawidłowy zapis gry.');try{const old=this.storage.getItem(SAVE_KEY);if(old){try{if(validProfile(JSON.parse(old)))this.storage.setItem(SAVE_KEY+'-backup',old);}catch{}}this.storage.setItem(SAVE_KEY,JSON.stringify(p));this.error=null;return true;}catch{this.error='Brak miejsca na zapis. Wyeksportuj postęp w ustawieniach.';return false;}}
 import(text){if(text.length>2e6)throw new Error('Plik zapisu jest za duży.');const p=JSON.parse(text);if(!validProfile(p))throw new Error('To nie jest zgodny zapis Echa Ruchu 1.x.');this.save(p);return p;}
}
export function makeMap(worldId,seed=1,stage=0,hub=false){
 const world=WORLDS.find(w=>w.id===worldId)||WORLDS[0];const r=rng(seed+stage*117);const width=25,height=19;
 const tiles=Array.from({length:height},()=>Array(width).fill(0));
 const put=(x,y)=>{if(x>0&&y>0&&x<width-1&&y<height-1)tiles[y][x]=1;};
 const rect=(x,y,w,h)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j);};
 const line=(x1,y1,x2,y2)=>{while(x1!==x2){rect(x1-1,y1-1,3,3);x1+=Math.sign(x2-x1);}while(y1!==y2){rect(x1-1,y1-1,3,3);y1+=Math.sign(y2-y1);}rect(x1-1,y1-1,3,3);};
 const shape=hub?'cloister':world.shape;
 if(shape==='cloister'){rect(3,3,19,13);if(!hub){rect(10,7,5,5);for(let y=7;y<12;y++)for(let x=10;x<15;x++)tiles[y][x]=0;}}
 if(shape==='lanes'){rect(2,3,21,4);rect(2,12,21,4);rect(2,5,4,9);rect(10,5,4,9);rect(19,5,4,9);}
 if(shape==='branch'){line(12,16,12,3);line(4,5,20,5);line(4,12,20,12);rect(2,3,5,5);rect(18,10,5,5);rect(9,1,7,5);}
 if(shape==='islands'){for(const [x,y]of [[3,3],[16,3],[3,11],[16,11],[10,7]])rect(x,y,6,5);line(6,5,19,5);line(6,13,19,13);line(12,15,12,4);}
 if(shape==='mirror'){rect(2,2,8,15);rect(15,2,8,15);line(6,4,19,4);line(6,14,19,14);line(12,15,12,2);}
 if(shape==='grove'){for(let y=2;y<17;y++)for(let x=2;x<23;x++)if(((x-12)/10)**2+((y-9)/7)**2<1)put(x,y);for(let i=0;i<8;i++){let x=4+Math.floor(r()*16),y=4+Math.floor(r()*10);if(Math.abs(x-12)>2)tiles[y][x]=0;}}
 if(shape==='ring'){for(let y=2;y<17;y++)for(let x=2;x<23;x++){let d=Math.hypot((x-12)*.8,y-9);if(d<8&&d>3)put(x,y);}line(12,16,12,2);line(3,9,21,9);}
 if(shape==='star'){line(3,9,21,9);line(12,16,12,2);rect(9,6,7,7);rect(2,6,5,7);rect(18,6,5,7);rect(9,1,7,5);}
 // The central route and all interaction approaches are connected in every topology.
 const spawn={x:12,y:15},exit={x:12,y:3};line(spawn.x,spawn.y,12,13);line(12,13,6,13);line(6,13,6,5);line(6,5,12,5);line(12,5,exit.x,exit.y);
 const objects=hub?[
  {id:'portal',kind:'portal',x:12,y:4,label:'Wyrusz w podróż',sprite:14},
  {id:'mentor',kind:'mentor',x:8,y:11,label:'Porozmawiaj z Orinem',sprite:12},
  {id:'forge',kind:'forge',x:17,y:10,label:'Rozwiń postać',sprite:13},
  {id:'library',kind:'library',x:6,y:5,label:'Otwórz Atlas',env:9}
 ]:[
  {id:'exit',kind:'exit',...exit,label:stage===4?'Zamknij wyprawę':'Przejdź dalej',sprite:14},
  {id:'enemy',kind:'enemy',x:12,y:6,label:stage===4?'Zmierz się ze Strażnikiem':'Podejmij walkę',sprite:world.sprite,boss:stage===4},
  {id:'chest',kind:'chest',x:19,y:12,label:'Otwórz skrzynię',sprite:13},
  {id:'lore',kind:'lore',x:5,y:6,label:'Odczytaj echo',env:10},
  {id:'secret',kind:'secret',x:4,y:14,label:'Odkryj sekretną skrytkę',sprite:15,secret:true},
  ...(stage===2?[{id:'merchant',kind:'merchant',x:18,y:5,label:'Porozmawiaj z Orinem',sprite:12}]:[])
 ];
 for(const o of objects){line(6,13,o.x,o.y);rect(o.x-1,o.y-1,3,3);} // reserve accessible positions
 const props=[];for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){if(tiles[y][x]===0&&r()<.43)props.push({x,y,frame:world.props[Math.floor(r()*world.props.length)]});}
 if(!hub){for(let n=0;n<3;n++){const ax=2+Math.floor(r()*20),ay=2+Math.floor(r()*14);line(6,13,ax,ay);rect(ax-1,ay-1,3,3);}}
 // Remove decoration where a generated alcove has opened walkable ground.
 const visibleProps=props.filter(p=>!tiles[p.y][p.x]);
 const sig=tiles.map(row=>row.join('')).join('|');return {width,height,tiles,spawn,objects,props:visibleProps,signature:sig,world:world.id};
}
export function pathTo(map,from,to){const sx=Math.round(from.x),sy=Math.round(from.y),tx=Math.round(to.x),ty=Math.round(to.y);if(!map.tiles[ty]?.[tx])return [];
 const q=[[sx,sy]],seen=new Set([`${sx},${sy}`]),parent={};for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){let p=[x,y],out=[];while(p[0]!==sx||p[1]!==sy){out.unshift({x:p[0],y:p[1]});p=parent[p.join(',')];}return out;}
 for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(map.tiles[ny]?.[nx]&&!seen.has(k)){seen.add(k);parent[k]=[x,y];q.push([nx,ny]);}}}return [];}
export class Engine{
 constructor(profile=freshProfile(),onChange=()=>{}){this.p=profile;this.onChange=onChange;this.last=null;this.map=null;this.hubPos={x:12,y:14};this.makeMap();}
 get r(){return this.p.run;}get world(){return WORLDS.find(w=>w.id===this.r?.world)||WORLDS[0];}get level(){return 1+Math.floor(Math.sqrt(this.p.xp/70));}
 makeMap(){this.map=makeMap(this.r?.world||'bones',this.r?.seed||22,this.r?.stage||0,!this.r);}
 emit(event='change',data={}){this.last={event,...data};this.onChange(this.last);return this.last;}
 has(id){return !!this.r?.relics.includes(id);}
 stats(){const c=CLASSES.find(c=>c.id===this.p.classId);return {maxHp:c.hp+this.p.talents.vitality*8,power:c.power+this.p.talents.power*2};}
 start(worldId,seed=(Date.now()>>>0),challenge=0){const wi=WORLDS.findIndex(w=>w.id===worldId);if(wi<0||wi>this.p.unlocked||this.r)return false;
  const s=this.stats();this.p.counter++;this.rng=rng(seed);this.p.run={id:this.p.counter,seed,world:worldId,stage:0,challenge:clamp(challenge,0,3),hp:s.maxHp,maxHp:s.maxHp,focus:4,potions:2,gold:0,xp:0,done:{},seen:[],quizUsed:[],relics:[],pos:{x:12,y:15},battle:null,answers:0,correct:0,secrets:0,route:'balanced',finished:false};this.makeMap();this.emit('start');return true;
 }
 objectDone(id){return !!this.r?.done[`${this.r.stage}:${id}`];}
 mark(id){this.r.done[`${this.r.stage}:${id}`]=true;}
 get position(){return this.r?this.r.pos:this.hubPos;}
 move(dx,dy,dt){if(this.r?.battle||this.r?.finished)return;const p=this.position;const l=Math.hypot(dx,dy);if(!l)return;const speed=4.2*clamp(dt,0,.05);dx=dx/l*speed;dy=dy/l*speed;
 const can=(x,y)=>{const pad=.23;return [[-pad,-pad],[pad,-pad],[-pad,pad],[pad,pad]].every(([a,b])=>this.map.tiles[Math.round(y+b)]?.[Math.round(x+a)]);};
 if(can(p.x+dx,p.y))p.x+=dx;if(can(p.x,p.y+dy))p.y+=dy;
 }
 nearest(){return this.map.objects.filter(o=>!this.objectDone(o.id)&&(!o.secret||Math.hypot(o.x-this.position.x,o.y-this.position.y)<2)).map(o=>({...o,d:Math.hypot(o.x-this.position.x,o.y-this.position.y)})).filter(o=>o.d<1.65).sort((a,b)=>a.d-b.d)[0];}
 interact(o=this.nearest()){if(!o||this.r?.battle)return null;if(!this.r)return this.emit(o.kind);
  if(this.objectDone(o.id))return null;
  if(o.kind==='enemy')return this.beginBattle(o.boss);
  if(o.kind==='exit'){if(!this.objectDone('enemy'))return this.emit('notice',{text:'Najpierw ucisz echo strzegące przejścia.'});return this.emit('route');}
  if(o.kind==='chest'){this.mark(o.id);this.r.gold+=20;return this.reward('Skrzynia wędrowca');}
  if(o.kind==='secret'){this.mark(o.id);this.r.gold+=35;this.r.secrets++;this.r.hp=clamp(this.r.hp+10,0,this.r.maxHp);return this.emit('secret',{text:'Sekret odnaleziony. +35 monet i 10 zdrowia.'});}
  if(o.kind==='lore'){this.mark(o.id);const c=CONCEPTS.filter(c=>c.world===this.r.world)[this.r.stage%8];this.discover(c.id);this.r.focus=6;return this.emit('lore',{concept:c});}
  return this.emit(o.kind);
 }
 reward(title='Wybierz relikt'){const available=RELICS.filter(x=>!this.has(x.id));const choices=shuffle(available,rng(this.r.seed+this.r.stage*31+this.r.relics.length)).slice(0,3).map(x=>x.id);if(!choices.length){this.r.gold+=20;return this.emit('notice',{text:'Kolekcja pełna. +20 monet.'});}this.r.reward={title,choices};return this.emit('reward');}
 chooseRelic(id){if(!this.r?.reward?.choices.includes(id))return false;this.r.relics.push(id);if(!this.p.relics.includes(id))this.p.relics.push(id);this.r.reward=null;this.emit('relic',{id});return true;}
 advance(route='balanced'){if(!this.r||this.r.battle||this.r.finished||!this.objectDone('enemy'))return false;if(this.r.stage===4)return this.finish(true);
 this.r.stage++;this.r.route=route;if(route==='rest')this.r.hp=clamp(this.r.hp+20,0,this.r.maxHp);if(route==='risk')this.r.gold+=15;this.r.pos={x:12,y:15};this.r.seen=[];this.r.battle=null;this.makeMap();this.emit('stage');return true;}
 beginBattle(boss=false){if(!this.r||this.r.battle||this.objectDone('enemy'))return null;const s=this.r.stage,c=this.r.challenge;const hp=(boss?110:38+s*13)+c*25+(this.r.route==='risk'?16:0);
 this.r.battle={hp,maxHp:hp,attack:(boss?17:8+s*2)+c*3,armor:this.r.world==='bones'?5:0,turn:0,attacks:0,boss,intent:this.world.pattern[0],log:['Przeciwnik zdradza swój zamiar. Wybierz reakcję.'],shield:0,enemyShield:0,charged:false,analysisUsed:0,analysisReady:0,quiz:null,feedback:null,phase:1};this.r.focus=this.has('spark')?6:4;if(this.has('spark'))this.r.battle.shield=12;return this.emit('battle');}
 intent(){const b=this.r?.battle;if(!b)return null;const labels={strike:['Natarcie','Zwykły cios',b.attack],heavy:['Ciężki cios','Osłona znacznie zmniejszy obrażenia',Math.round(b.attack*1.8)+(b.charged?5:0)],guard:['Pancerz','Technika przebija osłonę',0],drain:['Zakłócenie','Utrata 2 skupienia bez osłony',Math.round(b.attack*.65)],charge:['Ładowanie','Przygotowanie silnego uderzenia',0],heal:['Regeneracja','Wróg odzyska zdrowie',0]};return {type:b.intent,name:labels[b.intent][0],hint:labels[b.intent][1],damage:labels[b.intent][2]};}
 discover(id){if(!this.p.knowledge[id])this.p.knowledge[id]={right:0,wrong:0,streak:0,due:0};}
 question(){const b=this.r?.battle;if(!b||b.quiz||b.feedback||b.turn<b.analysisReady)return null;
 const pool=CONCEPTS.filter(c=>c.world===this.r.world&&!this.r.quizUsed.includes(c.id));if(!pool.length)return this.emit('notice',{text:'W tej wyprawie wykorzystano już wszystkie echa wiedzy.'});
 pool.sort((a,c)=>{let ak=this.p.knowledge[a.id],ck=this.p.knowledge[c.id];return (ak?ak.due:0)-(ck?ck.due:0);});
 const concept=pool[0];let type=['choice','recall','order'][b.analysisUsed%3];if(type==='order'&&this.r.quizUsed.includes('order:'+this.r.world))type='choice';const random=rng(this.r.seed+b.turn+this.r.stage*21);
 b.quiz={id:concept.id,type,options:type==='order'?shuffle(ORDERS[this.r.world].steps,random):shuffle([concept.answer,...concept.wrong],random)};this.emit('quiz');return b.quiz;}
 answer(value){const b=this.r?.battle;if(!b?.quiz||b.feedback)return null;const q=b.quiz,c=CONCEPTS.find(c=>c.id===q.id);const correct=q.type==='order'?JSON.stringify(value)===JSON.stringify(ORDERS[this.r.world].steps):normal(value)===normal(c.answer);
  if(q.type!=='order'){this.discover(c.id);const k=this.p.knowledge[c.id];k[correct?'right':'wrong']++;k.streak=correct?k.streak+1:0;k.due=Date.now()+(correct?[1,3,7,14,30][Math.min(k.streak-1,4)]*86400000:60000);this.r.quizUsed.push(c.id);}else this.r.quizUsed.push('order:'+this.r.world);
  this.r.answers++;if(correct)this.r.correct++;b.analysisUsed++;b.analysisReady=b.turn+2;b.quiz=null;b.feedback={correct,conceptId:c.id,type:q.type,expected:q.type==='order'?ORDERS[this.r.world].steps.join(' → '):c.answer};return this.emit('feedback');}
 resolveAnswer(){const b=this.r?.battle;if(!b?.feedback)return null;const ok=b.feedback.correct;b.feedback=null;return this.action(ok?'insight':'miss',true);}
 action(type,internal=false){const r=this.r,b=r?.battle;if(!b||b.quiz||b.feedback)return null;if(!['attack','guard','tech','potion','insight','miss'].includes(type)||(['insight','miss'].includes(type)&&!internal))return null;
  const cost=this.p.classId==='seeker'?2:3;if(type==='tech'&&r.focus<cost)return this.emit('notice',{text:'Brak skupienia. Atak lub osłona odnowi zasób.'});if(type==='potion'&&r.potions<1)return null;
  const log=[];let damage=0,interrupt=false;const power=this.stats().power+(this.has('edge')&&r.hp<r.maxHp/2?7:0);let pierce=false;
  if(type==='attack'){b.attacks++;damage=power;if(this.has('echo')&&b.attacks%3===0){damage+=power;log.push('Echo kroku: drugie uderzenie!');}r.focus=clamp(r.focus+1,0,6);}
  if(type==='tech'){r.focus-=cost;damage=Math.round(power*1.9);pierce=true;if(this.has('flow'))r.focus=clamp(r.focus+1,0,6);log.push('Technika omija pancerz.');}
  if(type==='guard'){b.shield+=Math.round(this.intent().damage*.8)+5;r.focus=clamp(r.focus+2,0,6);damage=(this.p.classId==='guardian'?6:0)+(this.has('thorn')?8:0);pierce=true;if(this.has('rhythm'))r.hp=clamp(r.hp+5,0,r.maxHp);log.push('Przyjmujesz stabilną pozycję.');}
  if(type==='potion'){r.potions--;r.hp=clamp(r.hp+38+(this.has('pulse')?15:0),0,r.maxHp);log.push('Eliksir przywraca zdrowie.');}
  if(type==='insight'){damage=power+12+(this.p.classId==='scholar'?8:0)+(this.has('lens')?9:0);pierce=true;interrupt=true;r.focus=clamp(r.focus+2,0,6);if(this.has('lumen'))r.hp=clamp(r.hp+10,0,r.maxHp);log.push('Trafna analiza przerywa zamiar wroga!');}
  if(type==='miss')log.push('Echo zapisane do powtórki. Przeciwnik wykonuje swój ruch.');
  if(damage>0){damage=Math.max(1,damage-(pierce?0:b.armor+b.enemyShield));b.hp=clamp(b.hp-damage,0,b.maxHp);log.push(`Zadajesz ${damage} obrażeń.`);}b.enemyShield=0;
  if(b.hp<=0)return this.winBattle(log,damage);
  let taken=0;
  if(!interrupt){const intent=this.intent();if(['strike','heavy','drain'].includes(b.intent)){taken=Math.max(0,intent.damage-b.shield-(this.has('bastion')?3:0));r.hp=clamp(r.hp-taken,0,r.maxHp);log.push(taken?`Otrzymujesz ${taken} obrażeń.`:'Osłona zatrzymuje cios.');if(b.intent==='drain'&&b.shield===0)r.focus=clamp(r.focus-2,0,6);if(b.intent==='heavy')b.charged=false;}
   if(b.intent==='guard'){b.enemyShield=12;log.push('Wróg otacza się pancerzem.');}
   if(b.intent==='charge'){b.charged=true;log.push('Wróg gromadzi energię.');}
   if(b.intent==='heal'){const heal=Math.round(b.maxHp*.15);b.hp=clamp(b.hp+heal,0,b.maxHp);log.push(`Wróg regeneruje ${heal} zdrowia.`);}}
  b.shield=0;b.turn++;b.phase=b.boss?(b.hp<b.maxHp*.33?3:b.hp<b.maxHp*.67?2:1):1;
  const pattern=this.world.pattern;b.intent=pattern[(b.turn+(b.boss?b.phase-1:0))%pattern.length];b.log=log.slice(-4);
  if(r.hp<=0)return this.finish(false);return this.emit('turn',{damage,taken,type,interrupt});
 }
 winBattle(log,damage){const b=this.r.battle;this.mark('enemy');const xp=b.boss?90:25+this.r.stage*5;const gold=(b.boss?65:20)+this.r.challenge*5+(this.has('gold')?12:0);this.r.xp+=xp;this.r.gold+=gold;if(this.has('roots'))this.r.hp=clamp(this.r.hp+12,0,this.r.maxHp);this.r.battle=null;
 if(b.boss)return this.finish(true);return this.emit('victory',{xp,gold,damage,text:log.join(' ')});}
 finish(win){if(!this.r||this.r.finished)return false;const r=this.r;r.finished=true;r.battle=null;this.p.xp+=r.xp;this.p.gold+=r.gold;
 if(win){if(!this.p.cleared.includes(r.world))this.p.cleared.push(r.world);const i=WORLDS.findIndex(w=>w.id===r.world);this.p.unlocked=Math.max(this.p.unlocked,Math.min(7,i+1));if(!this.p.quests.first){this.p.quests.first=true;this.p.gold+=60;}}
 const report={world:r.world,win,xp:r.xp,gold:r.gold,answers:r.answers,correct:r.correct,secrets:r.secrets,relics:[...r.relics],challenge:r.challenge,date:Date.now()};this.p.history.unshift(report);this.p.history=this.p.history.slice(0,30);return this.emit('summary',{report});}
 abandon(){if(!this.r)return;this.finish(false);}
 home(){if(this.r&&!this.r.finished)return false;this.p.run=null;this.makeMap();this.emit('home');return true;}
 buy(type){if(!this.r||this.r.battle||this.r.finished)return false;const key=`bought:${type}`;if(this.objectDone(key))return false;const cost=type==='potion'?25:40;if(this.r.gold<cost)return false;this.r.gold-=cost;this.mark(key);if(type==='potion')this.r.potions++;else{this.r.hp=clamp(this.r.hp+45,0,this.r.maxHp);}this.emit('purchase');return true;}
 upgrade(type){if(this.r||!['vitality','power'].includes(type)||this.p.talents[type]>=10)return false;const cost=60+this.p.talents[type]*35;if(this.p.gold<cost)return false;this.p.gold-=cost;this.p.talents[type]++;this.emit('upgrade');return true;}
}
