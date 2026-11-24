/* ---------- palet, font, gaya ---------- */
const C={hijau:'#003418',emas:'#F5B800',krem:'#F7EFDF',bata:'#B5462F',hitam:'#1A1A1A'};
const U=Math.min(CFG.W,CFG.H)/1080;
(function(){
  const f=(fam,src,w,st='normal')=>src?`@font-face{font-family:'${fam}';src:url(${src});font-weight:${w};font-style:${st};font-display:block}`:'';
  const css=[
    f('Zing Rust Base',ASSET.zing,400),
    f('Anton',ASSET.anton,400),
    f('Lato',ASSET.lato400,400),f('Lato',ASSET.lato700,700),f('Lato',ASSET.lato900,900),
    f('Amiri',ASSET.amiriAr,700),f('Amiri',ASSET.amiriLat,700),f('Geist',ASSET.geist,'100 900'),
    `.z{font-family:'Zing Rust Base','Anton',Impact,sans-serif;font-weight:400;text-transform:uppercase;line-height:.9;letter-spacing:.005em}
     .l{font-family:'Lato',Arial,sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:.02em}
     .stk{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center}
     .stk.left{align-items:flex-start;text-align:left}
     .ln{white-space:nowrap;line-height:.95}
     .w{display:inline-block;transform-origin:50% 85%}
     .box{padding:.12em .32em .08em;display:inline-block;transform-origin:0 50%}
     .ab{position:absolute}
     .ring{position:absolute;border-radius:50%;overflow:hidden}
     .vert{position:absolute;transform-origin:0 0;white-space:nowrap}
     .phone{position:absolute;width:420px;height:860px;border-radius:64px;background:#17191a;padding:14px;box-shadow:0 40px 80px rgba(0,0,0,.35), inset 0 0 0 3px #3a3d3f}
     .screen{width:100%;height:100%;border-radius:52px;overflow:hidden;background:#F6F7F6;font-family:'Geist',system-ui,sans-serif;color:#0f1a14;position:relative}
     .sb{height:46px;background:#0B5A3A;color:#fff;font-size:17px;font-weight:600;line-height:46px;padding:0 30px;display:flex;justify-content:space-between}
     .card{margin-top:16px;border-radius:30px;padding:24px;background:#0B5A3A;color:#fff}
     .row{display:flex;justify-content:space-between;align-items:center}
     .bar{height:12px;border-radius:9px;background:#043322;margin-top:12px;overflow:hidden}
     .bar>b{display:block;height:100%;width:0;background:#4FD69A;border-radius:9px}
     .mini{flex:1;background:rgba(255,255,255,.08);border-radius:14px;padding:10px 12px}
     .mini small{display:block;font-size:11px;letter-spacing:.12em;color:#9BD8BC;font-weight:600}
     .mini span{font-size:17px;font-weight:700}
     .tx{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid #e8ece9;font-size:16px}
     .tx b{color:#0E9F5B}
     .ok{font-size:13px;color:#0E7A47;background:#DDF5E7;border-radius:99px;padding:4px 10px;font-weight:600}
     .notif{position:absolute;left:12px;right:12px;top:58px;background:#fff;border-radius:22px;padding:14px 16px;box-shadow:0 18px 40px rgba(0,0,0,.25);display:flex;gap:12px}`
  ].join('\n');
  const s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  // muat font sekarang supaya document.fonts.ready menunggunya
  if(document.fonts){['Zing Rust Base','Anton','Lato','Geist'].forEach(n=>document.fonts.load(`900 40px "${n}"`).catch(()=>{}));
    document.fonts.load(`400 40px "Anton"`).catch(()=>{});document.fonts.load(`400 40px "Zing Rust Base"`).catch(()=>{});
    document.fonts.load(`700 40px "Amiri"`,'فَصَلِّ').catch(()=>{});}
})();

/* ---------- waktu ----------
   Waktu animasi ditulis memakai jam pratinjau v2 (VO berjeda 0,5 dtk di awal dan 2,3 dtk sebelum "Kini hadir").
   V() mengubahnya ke detik lokal adegan pada audio gabungan; M() untuk waktu audio gabungan langsung. */
const st0=no=>T.find(x=>x.no==no).start;
const V=(no,v)=>(v<22.3?v-0.5:v-1.06)-st0(no);
const M=(no,m)=>m-st0(no);

/* ---------- pembangun ---------- */
function mk(html,parent){const d=document.createElement('div');d.innerHTML=html.trim();const e=d.firstChild;parent.appendChild(e);return e;}
function scene(r,bg){r.style.background=bg||'transparent';r.style.overflow='hidden';
  const cam=h('div',{style:'position:absolute;inset:0;transform-origin:50% 50%'},r);
  cam.box=h('div',{style:'position:absolute;inset:0;transform-origin:50% 50%'},cam);return cam;}
// lines: [{t,f:'z'|'l',s,c,bg,times(v2),mt}]
function stack(no,parent,lines,{x=960,y=540,align='center',gap=6}={}){
  const outer=h('div',{class:'stk'+(align==='left'?' left':''),style:`left:${x}px;top:${y}px;transform:${align==='left'?'translate(0,-50%)':'translate(-50%,-50%)'}`},parent);
  const inner=h('div',{class:'stk'+(align==='left'?' left':''),style:'position:relative'},outer);
  const words=[],boxes=[];
  lines.forEach(L=>{
    const ln=h('div',{class:'ln '+(L.f==='z'?'z':'l'),style:`font-size:${L.s}px;color:${L.c||C.hitam};margin-top:${L.mt??gap}px`},inner);
    let host=ln;
    if(L.bg){host=h('span',{class:'box',style:`background:${L.bg}`},ln);}
    const ps=L.t.split(' ');
    ps.forEach((p,i)=>{const w=h('span',{class:'w',text:p},host);if(i<ps.length-1)host.appendChild(document.createTextNode(' '));
      const v=L.times?(L.times[i]??L.times[L.times.length-1]):null;
      words.push({el:w,at:v==null?null:V(no,v)});
      if(L.bg&&i===0)boxes.push({el:host,at:V(no,v)});});
  });
  return {outer,inner,words,boxes};
}
function popW(e,t,at,d=.32){if(at==null)return;const k=prog(t,at,at+d),b=ease.back(k);
  e.style.opacity=clamp(k*3);e.style.transform=`translateY(${(1-b)*40}px) scale(${lerp(.35,1,b)})`;}
function upStack(s,t){s.words.forEach(w=>popW(w.el,t,w.at));s.boxes.forEach(b=>{b.el.style.transform=`scaleX(${ease.out(prog(t,b.at-.05,b.at+.2))})`;});}
const EX={up:[0,-260,1],down:[0,260,1],left:[-700,0,1],right:[700,0,1],zoom:[0,0,2.4],shrink:[0,0,.2],none:[0,0,1]};
// masuk + keluar dalam satu transform. from: {x,y,s,r,o}; o=0 berarti memudar masuk
function ent(el,t,{at=null,from={},d=.4,e=ease.back,out=null,type='up',od=.28,base='',extra=''}={}){
  const ki=at==null?1:prog(t,at,at+d),k=e(ki);
  let tx=lerp(from.x||0,0,k),ty=lerp(from.y||0,0,k),sc=lerp(from.s??1,1,k),rot=lerp(from.r||0,0,k);
  let op=(from.o===0&&at!=null)?clamp(ki*2.5):1;
  if(out!=null&&t>=out){const ko=prog(t,out,out+od),q=ko*ko*ko,m=EX[type];tx+=m[0]*q;ty+=m[1]*q;sc*=lerp(1,m[2],q);op*=1-ko;}
  el.style.transform=`${base} translate(${tx}px,${ty}px) scale(${sc}) rotate(${rot}deg) ${extra}`;el.style.opacity=op;
}
function outOnly(el,t,out,type='up',od=.28,base=''){ent(el,t,{out,type,od,base});}
function burst(parent,x,y,r,color,n=12,len=60){
  const s=r+len,svg=h('svg',{viewBox:`${-s} ${-s} ${2*s} ${2*s}`,style:`position:absolute;left:${x-s}px;top:${y-s}px;width:${2*s}px;height:${2*s}px;overflow:visible`},parent);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2+.13;h('line',{x1:Math.cos(a)*r,y1:Math.sin(a)*r,x2:Math.cos(a)*(r+len),y2:Math.sin(a)*(r+len),stroke:color,'stroke-width':9,'stroke-linecap':'round'},svg);}
  return svg;
}
function upBurst(svg,t,at){const k=prog(t,at,at+.3),ko=prog(t,at+.9,at+1.3);
  svg.style.opacity=at!=null&&t>=at?clamp(k*3)*(1-ko):0;svg.style.transform=`scale(${lerp(.6,1,ease.back(k))*lerp(1,1.25,ko)})`;}
function vert(parent,text,x,y,size,color){return h('div',{class:'vert l',text,style:`left:${x}px;top:${y}px;font-size:${size}px;color:${color};transform:rotate(-90deg)`},parent);}
function upVert(el,t,at){const k=ease.out(prog(t,at,at+.35));el.style.opacity=at!=null&&t>=at?k:0;el.style.transform=`rotate(-90deg) translateY(${(1-k)*-30}px)`;}
// kamera adegan: hentakan zoom, drift, getar
const punchZ=(t,at,z=1.08,d=.5)=>t<at?1:1+(z-1)*(1-ease.out(prog(t,at,at+d)));
const driftZ=(t,a,d,z)=>lerp(1,z,prog(t,a,a+d));
const shakeX=(t,at,dur,amp)=>(t>=at&&t<at+dur)?amp*Math.sin((t-at)*Math.PI*2*12.5):0;
function setCam(cam,z,x=0){cam.style.transform=`translate(${x}px,0) scale(${z})`;}
const rp=v=>'Rp '+Math.round(v).toLocaleString('id-ID');
