from PIL import Image
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCES=ROOT.parent/'generated_images'
atlas=Image.open(SOURCES/'exec-783b3191-a75a-4344-b4ab-a68105baf991.png').convert('RGBA')
env=Image.open(SOURCES/'exec-7f12a6c6-e0d8-470c-b9c1-e4dbbdccd341.png').convert('RGBA')
walk=Image.open(SOURCES/'exec-7469401d-72a8-4d47-bea0-142f2ab915be.png').convert('RGBA')
def normalize(img,path,cell=128,terrain=False):
 out=Image.new('RGBA',(cell*4,cell*4))
 for i in range(16):
  x=i%4; y=i//4; s=img.width//4
  crop=img.crop((x*s,y*s,(x+1)*s,(y+1)*s))
  if terrain and i<4:
   crop=crop.crop((30,30,s-30,s-30)).resize((cell,cell),Image.Resampling.NEAREST)
   out.paste(crop,(x*cell,y*cell))
  else:
   box=crop.getbbox()
   if box:
    crop=crop.crop(box)
    # One common cell envelope; actors retain a consistent shared scale.
    scale=min((cell-12)/crop.width,(cell-10)/crop.height)
    crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
    out.alpha_composite(crop,(x*cell+(cell-crop.width)//2,y*cell+cell-crop.height-4))
 out.save(path,optimize=True)
normalize(atlas,ROOT/'assets/sprites/actors.png')
normalize(env,ROOT/'assets/environment/world.png',terrain=True)
# Shared scaling and baseline for the complete walk strip, never per-frame scaling.
s=walk.width//4; crops=[]
for i in range(16):
 c=walk.crop(((i%4)*s,(i//4)*s,(i%4+1)*s,(i//4+1)*s))
 b=c.getbbox(); crops.append(c.crop(b))
scale=min(72/max(c.width for c in crops),88/max(c.height for c in crops))
out=Image.new('RGBA',(384,384))
for i,c in enumerate(crops):
 c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
 out.alpha_composite(c,((i%4)*96+(96-c.width)//2,(i//4)*96+92-c.height))
out.save(ROOT/'assets/sprites/hero-walk.png',optimize=True)
# Icon is a crop of the actual original sprite, with a code-native background.
icon=Image.new('RGBA',(512,512),'#102b32')
hero=atlas.crop((0,0,atlas.width//4,atlas.height//4));hero.thumbnail((440,440))
icon.alpha_composite(hero,((512-hero.width)//2,(512-hero.height)//2))
icon.convert('RGB').save(ROOT/'assets/icon.png')
print('Normalized 16 actors, 16 environment cells and 16 walking frames.')
