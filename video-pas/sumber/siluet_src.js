/* ================= SILUET ================= */
(function(){const d=document.createElement('div');d.innerHTML=SILSYM;document.body.appendChild(d.firstChild);
 const s=document.createElement('style');s.textContent=`
 .tb{position:absolute;left:0;right:0;top:120px;text-align:center;z-index:10}
 .eb{font:700 30px Lato;letter-spacing:.38em;text-transform:uppercase}
 .tt{font:400 96px/1.1 Lato;margin-top:22px}.tt b{font-weight:900}
 .rl{width:120px;height:3px;margin:34px auto 0;background:#F5B800;transform-origin:50% 50%}
 .sbt{font:400 46px/1.35 Lato;margin-top:28px}
 .tw{display:inline-block}
 svg.u{position:absolute;overflow:visible}`;document.head.appendChild(s);})();
const SIL='#120f1c';
const VB={'sil-masjid':[3124,1746],'sil-kambing':[2152,1964],'sil-sapi':[2858,1912]};
function mk2(html,p){const d=document.createElement('div');d.innerHTML=html.trim();const e=d.firstChild;p.appendChild(e);return e;}
// langit: gradasi 3 warna; bisa diinterpolasi antara dua langit
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const mix=(a,b,k)=>'rgb('+hex(a).map((v,i)=>Math.round(lerp(v,hex(b)[i],k))).join(',')+')';
function langit(r,A,B=null,k=0){const c=B?A.map((x,i)=>mix(x,B[i],k)):A;r.style.background=`linear-gradient(${c[0]} 0%,${c[1]} 55%,${c[2]} 100%)`;}
function sil(B,id,x,base,w,col,flip=false,z=2){const [vw,vh]=VB[id],hh=w*vh/vw;
 const e=mk2(`<div style="position:absolute;left:${x}px;top:${base-hh}px;width:${w}px;height:${hh}px;z-index:${z}"><svg class="u" style="width:100%;height:100%;color:${col};${flip?'transform:scaleX(-1)':''}"><use href="#${id}"/></svg></div>`,B);e._w=w;return e;}
function masjid(B,cx,base,w,col,glow,z=2){const hh=w*1746/3124;
 const g=glow?mk2(`<div style="position:absolute;left:${cx-w*.42}px;top:${base-hh*.86}px;width:${w*.84}px;height:${hh*.8}px;border-radius:50% 50% 0 0;background:radial-gradient(ellipse at 50% 70%,${glow} 0%,${glow}cc 40%,transparent 75%);z-index:${z-1}"></div>`,B):null;
 const m=sil(B,'sil-masjid',cx-w/2,base,w,col,false,z);m.glow=g;return m;}
function bukit(B,y,col,amp=24,seed=1,z=3){let d=`M-200 1080 L-200 ${y}`;for(let x=-200;x<=2120;x+=160)d+=` Q${x+80} ${y-amp-((x+400+seed*37)%23)} ${x+160} ${y+((x*3+seed+999)%11)}`;
 return mk2(`<svg class="u" style="left:0;top:0;width:1920px;height:1080px;z-index:${z}" viewBox="0 0 1920 1080"><path d="${d} L2120 1080Z" fill="${col}"/></svg>`,B);}
function bintang(B,n=46,seed=3){const L=[];for(let i=0;i<n;i++){const x=(i*397+seed*91)%1920,y=(i*211+seed*53)%560;L.push(mk2(`<i style="position:absolute;left:${x}px;top:${y}px;width:${i%4?3:5}px;height:${i%4?3:5}px;border-radius:50%;background:#fff"></i>`,B));}return L;}
function upBintang(L,t,op=1){L.forEach((e,i)=>e.style.opacity=op*(.35+.4*(.5+.5*Math.sin(t*1.3+i*1.7))));}
const bulan=(B,x,y,s,c)=>mk2(`<div style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;box-shadow:${s*.22}px ${-s*.12}px 0 0 ${c};transform:rotate(-20deg);z-index:1"></div>`,B);
const matahari=(B,x,y,s,c)=>mk2(`<div style="position:absolute;left:${x-s/2}px;top:${y-s/2}px;width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle,${c} 0%,${c} 55%,${c}00 72%);z-index:1"></div>`,B);
// blok teks elegan: label · judul · garis · sub ; muncul halus per kata
function blok(no,B,{eb,ebAt,tt,sb,sbAt,col='#FFF3E2',ebc='#F5B800',top=120,fs=96,align='center',left=0,width=1920}){
 const el=mk2(`<div class="tb" style="top:${top}px;left:${left}px;width:${width}px;right:auto;color:${col};text-align:${align}"><div class="eb" style="color:${ebc}"></div><div class="tt" style="font-size:${fs}px"></div><div class="rl" style="${align=='left'?'margin-left:0':''}"></div>${sb?'<div class="sbt"></div>':''}</div>`,B);
 const ebE=el.children[0],ttE=el.children[1],rl=el.children[2],sbE=el.children[3];ebE.textContent=eb;if(sb)sbE.innerHTML=sb;
 const W=[];tt.forEach(([txt,at,b])=>{if(txt==='\n'){ttE.appendChild(document.createElement('br'));return;}const s=document.createElement('span');s.className='tw';s.innerHTML=b?`<b>${txt}</b>`:txt;ttE.appendChild(s);ttE.appendChild(document.createTextNode(' '));W.push({s,at:V(no,at)});});
 return {el,ebE,rl,sbE,W,ebAt:V(no,ebAt),sbAt:sb?V(no,sbAt):null};}
function fadeUp(e,t,at,d=.55,dy=24){const k=ease.out(prog(t,at,at+d));e.style.opacity=t>=at?k:0;e.style.transform=`translateY(${(1-k)*dy}px)`;}
function upBlok(b,t,out=null){fadeUp(b.ebE,t,b.ebAt,.6,14);b.W.forEach(w=>fadeUp(w.s,t,w.at));
 const ra=b.W.length?b.W[b.W.length-1].at+.25:b.ebAt+.3;b.rl.style.transform=`scaleX(${ease.inOut(prog(t,ra,ra+.5))})`;
 if(b.sbE)fadeUp(b.sbE,t,b.sbAt,.6,16);
 b.el.style.opacity=out!=null?1-prog(t,out,out+.4):1;}
// parallax pelan untuk lapisan
const drift=(e,t,k)=>{e.style.transform=`translateX(${-t*k}px)`;};
// mockup aplikasi Tabungan Qurban MAKT
function hp(B,x,y,{sc=1,z=6}={}){const e=mk2(`<div style="position:absolute;left:${x}px;top:${y}px;width:330px;height:660px;border-radius:48px;background:#141414;padding:11px;z-index:${z};box-shadow:0 0 130px rgba(255,214,140,.7),0 30px 60px rgba(0,0,0,.45);transform-origin:50% 100%">
  <div style="position:relative;width:100%;height:100%;border-radius:38px;overflow:hidden;background:#F6F7F6;font-family:Geist,Lato,sans-serif;color:#0f1a14">
   <div style="height:34px;background:#0B5A3A;color:#fff;font:600 13px/34px Geist;padding:0 22px;display:flex;justify-content:space-between"><span>9:41</span><span>●●●</span></div>
   <div style="padding:16px 18px"><div style="font-size:14px;color:#5c6b63">Halo, Jamaah</div><div style="font-size:26px;font-weight:800">Buku Tabungan</div>
    <div style="margin-top:12px;border-radius:22px;padding:18px;background:#0B5A3A;color:#fff"><div style="font-size:11px;letter-spacing:.1em;color:#A9DDC5">TOTAL TABUNGAN</div><div class="sal" style="font-size:32px;font-weight:800;font-variant-numeric:tabular-nums">Rp 0</div>
     <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:12px;color:#cfe9dd"><span>Progress Qurban</span><b class="pc" style="color:#fff">0%</b></div><div style="height:9px;border-radius:6px;background:#043322;margin-top:6px"><div class="br" style="width:0;height:100%;border-radius:6px;background:#4FD69A"></div></div></div>
    <div style="margin-top:14px;font-weight:800;font-size:15px">Riwayat Transaksi</div>
    ${['5.000','500.000','750.000','500.000'].map(v=>`<div class="tx" style="display:flex;justify-content:space-between;font-size:13px;padding:10px 0;border-bottom:1px solid #e8ece9"><span>Setoran QRIS</span><b style="color:#0E9F5B">+Rp ${v}</b></div>`).join('')}</div>
   <div class="lk" style="position:absolute;inset:0;background:rgba(0,52,24,.97);display:grid;place-items:start center;padding-top:110px;opacity:0"><div style="text-align:center;color:#F5B800"><svg viewBox="0 0 200 240" style="width:120px"><path d="M50 110 V70 a50 50 0 0 1 100 0 V110" fill="none" stroke="#F5B800" stroke-width="22" stroke-linecap="round"/><rect x="20" y="105" width="160" height="125" rx="26" fill="#F5B800"/></svg><div style="font:900 22px Lato;margin-top:10px;color:#fff">Rekening khusus<br>qurban masjid</div></div></div>
   <div class="nt" style="position:absolute;left:10px;right:10px;top:42px;background:#fff;border-radius:18px;padding:12px;box-shadow:0 14px 30px rgba(0,0,0,.3);display:flex;gap:10px;opacity:0"><div style="width:36px;height:36px;border-radius:50%;background:#25D366;flex:none"></div><div style="font-size:12px;line-height:1.35"><b>WhatsApp</b> · sekarang<br>Setoran Rp 500.000 diterima ✓</div></div>
  </div></div>`,B);
 e.q={sal:e.querySelector('.sal'),pc:e.querySelector('.pc'),br:e.querySelector('.br'),tx:[...e.querySelectorAll('.tx')],lk:e.querySelector('.lk'),nt:e.querySelector('.nt')};return e;}
function setSaldo(e,v){e.q.sal.textContent=rp(v);const p=Math.min(100,Math.round(v/35000));e.q.pc.textContent=p+'%';e.q.br.style.width=p+'%';}
// langit per babak
const SKY={senja:['#1f1b3d','#6b3a6e','#ee9460'],malam:['#0b1026','#1b2246','#2e2a52'],pekat:['#06060c','#120f20','#26152a'],
 fajar:['#2b2a5c','#c46a7a','#ffc27a'],pagi:['#f2a865','#ffd49a','#fff0d4'],penutup:['#1d2a4a','#7a466a','#f2a259']};
