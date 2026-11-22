const {mkLevel, solve} = require('./gen.js');
const tut = [
 ["#######","#@-$-.#","#######"],
 [" #####","##-.-#","#@$--#","#----#","######"],
];
const gen = require('./levels.json').map(l=>l.rows);
const all = [...tut, ...gen];
const out=[];
all.forEach((rows,i)=>{
  const w=Math.max(...rows.map(r=>r.length)), h=rows.length;
  const g=[];const boxes=[],goals=[];let player=-1;
  for(let y=0;y<h;y++){g.push([]);for(let x=0;x<w;x++){const c=rows[y][x]||' ';const p=y*w+x;
    g[y].push(c==='#'||c===' '?1:0);
    if('$*'.includes(c))boxes.push(p); if('.*+'.includes(c))goals.push(p); if('@+'.includes(c))player=p;}}
  // pad: ensure outer void treated as wall (border check)
  const L=mkLevel(g); const t=Date.now();
  const r=solve(L,boxes,player,goals);
  if(r<=0) {console.log('FAIL',i+1,r); process.exitCode=1}
  out.push({rows,pushes:r,boxes:boxes.length});
  console.log(i+1, 'boxes',boxes.length,'pushes',r, (Date.now()-t)+'ms');
});
require('fs').writeFileSync('final.json',JSON.stringify(out));
