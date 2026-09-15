from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
config=(root/'src/config.js').read_text()
combat=(root/'src/combat.js').read_text()
prog=(root/'src/progression.js').read_text()
know=(root/'src/knowledge-system.js').read_text()
dungeon=(root/'src/dungeon.js').read_text()
inv=(root/'src/inventory.js').read_text()
ui=(root/'src/ui.js').read_text()
main=(root/'src/main.js').read_text()
errors=[]
expected=['patternLock','compensationWave','blankLabels','boneMaze','fluxDrain','homeostasisCrash','falseDebuff','noceboSpike','redFlagTrap','caseShuffle','momentShift','resonanceBurst','sporeCloud','biomeShift','ruleFlip','paradoxBurst']
for move in expected:
    if move not in config: errors.append(f'boss move missing in config: {move}')
    if f"case '{move}'" not in combat: errors.append(f'boss move missing handler: {move}')
checks={
 'medicine healing wired': 'm.healing+=' in prog and 'healingPerRank' in prog,
 'daily bonus requires correct': 'if(!correct)return 0' in prog,
 'strict error review': 'if(!p.length)return null' in know,
 'glossary unlocking used': 'markRelatedGlossary(q)' in know,
 'reroll affix implemented': 'export function rerollAffix' in inv and 'craftTokens.rerollAffix--' in inv,
 'bestiary visible': 'function bestiaryView' in ui and "bestiary:'Bestiariusz'" in ui,
 'memory room visible': 'function memoryView' in ui and "memory:'Sala Pamięci'" in ui,
 'profession XP': "addProfession('diagnostician'" in combat and "addProfession('archivist'" in know,
 'run build carried deeper': 'carry={startAt:' in dungeon and 'relics:r.relics' in dungeon,
 'route choice': 'routeChoices()' in dungeon and 'showRouteChoice' in main,
 'short answer UI': "q.type==='short'" in ui and 'isShortAnswerCorrect' in ui,
 'sequence UI': "q.type==='sequence'" in ui and 'isSequenceCorrect' in ui,
 'boss win flag': 'boss:!!e.boss' in combat,
 'title selector': 'titleSelect' in ui and 'setSelectedTitle' in ui,
 'party anti-farm': 'lastBondRun' in prog and 'lastBondBosses' in prog,
 'legendary pity': 'state.pity.legendary' in inv,
 'physics sequence': 'targetSequence' in dungeon and 'leverSequence' in dungeon,
 'world knowledge resolution': 'resolveWorldKnowledgeEvent' in dungeon,
}
for name,ok in checks.items():
    if not ok: errors.append(name)
if 'FizjoRPG_v2_save.json' in ui: errors.append('old save filename')
if errors:
    print('TRUTH TEST FAILED')
    for e in errors: print('-',e)
    sys.exit(1)
print(f'TRUTH TEST OK — {len(expected)}/16 boss moves handled, {len(checks)} critical checks passed')
