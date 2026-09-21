import test from 'node:test';import assert from 'node:assert/strict';
import {Engine,SaveStore,SAVE_KEY,freshProfile,validProfile,makeMap,pathTo} from '../src/engine.js';
import {WORLDS,CONCEPTS,ORDERS,RELICS} from '../src/content.js';
test('Every generated object is reachable across eight biomes and varied seeds',()=>{let signatures=new Set();for(const w of WORLDS){const local=new Set();for(let seed=1;seed<=25;seed++){const m=makeMap(w.id,seed,seed%5);for(const o of m.objects)assert.ok(pathTo(m,m.spawn,o).length,`${w.id}/${seed}/${o.id}`);local.add(m.signature);}assert.ok(local.size>5);signatures.add(makeMap(w.id,7).signature);}assert.equal(signatures.size,8);});
test('Seed reproduces topology and decoration',()=>assert.deepEqual(makeMap('neuro',1987,3),makeMap('neuro',1987,3)));
test('Questions have unique IDs, balanced worlds, references and distinct options',()=>{assert.equal(new Set(CONCEPTS.map(c=>c.id)).size,64);for(const w of WORLDS)assert.equal(CONCEPTS.filter(c=>c.world===w.id).length,8);for(const c of CONCEPTS){assert.equal(new Set([c.answer,...c.wrong]).size,3);assert.ok(c.explain&&c.source);}});
test('Wrong answers persist and do not farm XP; duplicate answer ignored',()=>{const e=new Engine();e.start('bones',1);e.beginBattle();e.question();const id=e.r.battle.quiz.id;e.answer('wrong');assert.equal(e.p.knowledge[id].wrong,1);assert.equal(e.r.xp,0);assert.equal(e.answer('wrong'),null);assert.equal(e.p.knowledge[id].wrong,1);e.resolveAnswer();assert.equal(e.r.xp,0);assert.equal(e.r.battle.analysisReady,2);});
test('Correct insight interrupts heavy attack and is saved mid-feedback',()=>{const e=new Engine();e.start('bones',9);e.beginBattle(true);e.r.battle.intent='heavy';const hp=e.r.hp;e.question();let c=CONCEPTS.find(c=>c.id===e.r.battle.quiz.id);e.answer(c.answer);assert.ok(validProfile(e.p));let restored=new Engine(JSON.parse(JSON.stringify(e.p)));restored.resolveAnswer();assert.equal(restored.r.hp,hp);assert.ok(restored.r.battle.hp<restored.r.battle.maxHp);});
test('Sequential task does not falsely raise mastery of unrelated concept',()=>{const e=new Engine();e.p.unlocked=3;e.start('breath',9);e.beginBattle(true);e.r.battle.analysisUsed=2;e.question();const id=e.r.battle.quiz.id;e.answer(ORDERS.breath.steps);assert.equal(e.p.knowledge[id],undefined);assert.ok(e.r.quizUsed.includes('order:breath'));});
test('Relic selection, chest and merchant are single-use',()=>{const e=new Engine();e.start('bones',4);e.interact(e.map.objects.find(o=>o.id==='chest'));const id=e.r.reward.choices[0];e.chooseRelic(id);assert.equal(e.chooseRelic(id),false);assert.equal(e.r.relics.length,1);const gold=e.r.gold;e.interact(e.map.objects.find(o=>o.id==='chest'));assert.equal(e.r.gold,gold);e.r.gold=100;assert.equal(e.buy('potion'),true);assert.equal(e.buy('potion'),false);assert.equal(e.r.potions,3);});
test('Guard mitigates damage; technique ignores enemy armor',()=>{const a=new Engine(),b=new Engine();for(const e of [a,b]){e.start('bones',1);e.beginBattle(true);e.r.battle.intent='heavy';}a.action('attack');b.action('guard');assert.ok(b.r.hp>a.r.hp);const c=new Engine();c.start('bones',1);c.beginBattle(true);c.r.battle.enemyShield=20;let before=c.r.battle.hp;c.action('tech');assert.equal(before-c.r.battle.hp,Math.round(c.stats().power*1.9));});
test('Recovery restores valid previous state, rejects malformed imports',()=>{const map=new Map(),mem={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},s=new SaveStore(mem),p=freshProfile();s.save(p);p.gold=77;s.save(p);map.set(SAVE_KEY,'{broken');const q=s.load();assert.equal(q.gold,0);assert.ok(s.recovered);assert.throws(()=>s.import('{"version":99}'));});
test('Invalid coordinates, HP and unknown classes cannot be imported',()=>{const e=new Engine();e.start('bones',10);for(const mutate of [p=>p.classId='bad',p=>p.run.hp=Infinity,p=>p.run.pos.x=1e12,p=>p.run.relics=['nope'],p=>p.talents.power=-5]){const p=structuredClone(e.p);mutate(p);assert.equal(validProfile(p),false);}});
test('Ending rewards and unlocking are idempotent; in-progress run persists',()=>{const e=new Engine();e.start('bones',3);e.r.xp=20;e.r.gold=30;e.finish(true);const xp=e.p.xp,gold=e.p.gold;e.finish(true);assert.equal(e.p.xp,xp);assert.equal(e.p.gold,gold);assert.equal(e.p.unlocked,1);assert.ok(validProfile(e.p));e.home();assert.equal(e.start('care'),false);});
function simulate(world,mode,classId='guardian'){
 const p=freshProfile();p.unlocked=7;p.settings.mode=mode;p.classId=classId;const e=new Engine(p);e.start(world,61);let turns=0;
 while(!e.r.finished&&turns<300){
  e.interact(e.map.objects.find(o=>o.id==='chest'));if(e.r.reward){const picks=e.r.reward.choices;e.chooseRelic(picks.includes('roots')?'roots':picks.includes('bastion')?'bastion':picks[0]);}
  if(e.r.stage===2&&e.r.gold>=40)e.buy('rest');e.beginBattle(e.r.stage===4);
  while(e.r.battle&&!e.r.finished&&turns++<300){const b=e.r.battle;
   if(mode==='learning'&&b.turn>=b.analysisReady&&e.r.quizUsed.filter(x=>!x.startsWith('order:')).length<8){e.question();if(b.quiz){const q=b.quiz;e.answer(q.type==='order'?ORDERS[world].steps:CONCEPTS.find(c=>c.id===q.id).answer);e.resolveAnswer();continue;}}
   if(e.r.hp<e.r.maxHp*.48&&e.r.potions){e.action('potion');continue;}
   if(b.intent==='heavy'){e.action('guard');continue;}
   if(e.r.focus>=(classId==='seeker'?2:3)){e.action('tech');continue;}
   e.action('attack');
  }
  if(!e.r.finished)e.advance('rest');
 }
 return {win:e.p.history[0]?.win,turns,world,mode,classId};
}
test('All eight campaigns can be completed with deliberate play in both modes',()=>{for(const w of WORLDS)for(const mode of ['learning','adventure']){const result=simulate(w.id,mode);assert.ok(result.turns<300,JSON.stringify(result));assert.ok(result.win,JSON.stringify(result));}});
test('All three classes can complete first campaign',()=>{for(const cls of ['guardian','seeker','scholar'])assert.ok(simulate('bones','learning',cls).win,cls);});
