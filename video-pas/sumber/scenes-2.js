// panggung fajar yang dipakai adegan 7–9 (posisi sama supaya pergantian tak terasa)
function panggungFajar(r){const B=lay(r);langit(r,SKY.fajar);const sun=matahari(B,1360,890,520,'#ffe2a0');
  const h1=bukit(B,900,'#4a2f4f',30,2,1);const m=masjid(B,1330,945,760,'#2a1b30','#ffd27a');const k=sil(B,'sil-kambing',1660,960,210,'#2a1b30',true,4);const h2=bukit(B,965,'#1a1020',16,6);
  const p=hp(B,HPX,HPY,{z:8});p.style.transformOrigin='0 0';p.style.boxShadow='0 0 40px rgba(255,214,140,.55),0 24px 40px rgba(0,0,0,.4)';return {B,sun,h1,m,k,h2,p};}
// HP besar di kiri (sebagian terpotong di bawah layar supaya saldo terbaca)
const HPX=150,HPY=330,HPS=1.75,HPR=-3;
const TXT={top:120,left:800,width:1060};
// 7 FLEKSIBEL — HP muncul dari cakrawala
S(7,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._=panggungFajar(r);
  o.b=blok(7,o.B,{eb:'Fleksibel',ebAt:28.0,tt:[['Setor',28.06],['berapa',28.38,1],['pun',28.62,1]],sb:'lima ribu pun <b>boleh</b>',sbAt:29.13,...TXT});
  o.p.q.tx.forEach(x=>x.style.opacity=0);},
update(t,r){const o=r._,v=x=>V(7,x);const k=ease.out(prog(t,v(28.0),v(28.9)));o.p.style.transform=`translateY(${(1-k)*900}px) rotate(${HPR*k}deg) scale(${HPS})`;o.p.style.opacity=clamp(k*2);
  setSaldo(o.p,t>=v(29.3)?5000:0);o.p.q.tx[0].style.opacity=ease.out(prog(t,v(29.3),v(29.6)));drift(o.h1,t,3);upBlok(o.b,t);}});

// 8 AMAN — layar HP terkunci di rekening masjid
S(8,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._=panggungFajar(r);o.p.style.transform=`rotate(${HPR}deg) scale(${HPS})`;setSaldo(o.p,5000);o.p.q.tx.slice(1).forEach(x=>x.style.opacity=0);
  o.b=blok(8,o.B,{eb:'Aman',ebAt:30.38,tt:[['Dana',30.38],['tersimpan',30.74],['aman',31.26,1]],sb:'di rekening khusus <b>qurban masjid</b>',sbAt:31.74,...TXT});},
update(t,r){const o=r._,v=x=>V(8,x);o.p.q.lk.style.opacity=ease.out(prog(t,v(31.26),v(31.6)))*(1-prog(t,v(33.25),v(33.45)));
  o.p.style.transform=`rotate(${HPR}deg) scale(${HPS*(1+.03*Math.sin(Math.PI*prog(t,v(31.9),v(32.2))))})`;drift(o.h1,t+2.4,3);upBlok(o.b,t);}});

// 9 TRANSPARAN — saldo naik, notifikasi WhatsApp
S(9,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._=panggungFajar(r);o.p.style.transform=`rotate(${HPR}deg) scale(${HPS})`;
  o.b=blok(9,o.B,{eb:'Transparan',ebAt:33.42,tt:[['Saldo',33.42],['dipantau',34.03],['dari',34.78,1],['HP',35.02,1]],sb:'lengkap dengan <b>notifikasi WhatsApp</b>',sbAt:35.5,...TXT});},
update(t,r){const o=r._,v=x=>V(9,x);const val=5000+Math.round(1745000*ease.out(prog(t,v(34.1),v(35.6)))/1000)*1000;setSaldo(o.p,val);
  o.p.q.tx.forEach((x,i)=>x.style.opacity=i==0?1:ease.out(prog(t,v(34.3+i*.2),v(34.6+i*.2))));
  const n=ease.back(prog(t,v(35.5),v(35.95)));o.p.q.nt.style.opacity=clamp(n*2);o.p.q.nt.style.transform=`translateY(${(1-n)*-80}px)`;
  drift(o.h1,t+5.4,3);upBlok(o.b,t,v(37.2));}});

// 10 PENGIKAT — pagi keemasan, sapi & kambing datang
S(10,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.pagi);o.sun=matahari(B,1500,640,300,'#fff6dc');o.h1=bukit(B,880,'#c98f5a',30,3,1);
  o.s=sil(B,'sil-sapi',230,915,560,'#2a1d18',false,4);o.k=sil(B,'sil-kambing',1300,925,300,'#2a1d18',true,4);o.h2=bukit(B,940,'#3a281e',16,8);
  o.b=blok(10,B,{eb:'Cukup Rp 10.000 sehari',ebAt:37.39,tt:[['Setahun',39.1],['terkumpul',39.58],['Rp 0',40.14,1]],col:'#2a1d18',ebc:'#8a4a1a'});o.num=o.b.W[2].s.firstChild;},
update(t,r){const o=r._,v=x=>V(10,x);o.sun.style.transform=`translateY(${-t*10}px)`;
  o.s.style.transform=`translateX(${-(1-ease.out(prog(t,0,3)))*500}px)`;o.k.style.transform=`translateX(${(1-ease.out(prog(t,.4,3.4)))*500}px)`;
  o.num.textContent=rp(Math.round(3650000*ease.out(prog(t,v(40.14),v(42.0)))/10000)*10000);drift(o.h1,t,3);upBlok(o.b,t);}});

// 11 INSYA ALLAH CUKUP
S(11,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.pagi);o.sun=matahari(B,1500,590,300,'#fff6dc');o.h1=bukit(B,880,'#c98f5a',30,3,1);
  o.s=sil(B,'sil-sapi',230,915,560,'#2a1d18',false,4);o.k=sil(B,'sil-kambing',1300,925,300,'#2a1d18',true,4);o.h2=bukit(B,940,'#3a281e',16,8);
  o.b=blok(11,B,{eb:'Insya Allah',ebAt:42.3,tt:[['cukup',43.18,1],['untuk',43.58,1],['berqurban',43.82,1]],col:'#2a1d18',ebc:'#8a4a1a'});},
update(t,r){const o=r._;o.sun.style.transform=`translateY(${-t*10}px) scale(${1+.08*prog(t,1.8,2.3)})`;drift(o.h1,t+4.9,3);upBlok(o.b,t);}});

// 12 PENUTUP — QR besar di kiri, ayat, masjid menyala
S(12,{fadeIn:.4,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.penutup);o.h1=bukit(B,930,'#3a2547',26,2,1);o.m=masjid(B,1560,965,600,SIL,'#ffc46b');o.h2=bukit(B,985,'#0d0a14',14,5);
  o.qr=mk2(`<div style="position:absolute;left:150px;top:90px;width:600px;padding:34px 34px 28px;background:#fff;border-radius:34px;text-align:center;z-index:10;box-shadow:0 0 90px rgba(255,196,107,.5)"><div style="font:700 34px Lato;letter-spacing:.3em;color:#003418">SCAN &amp; DAFTAR</div><img src="${ASSET.qr}" style="width:500px;margin-top:20px"><div style="font:700 30px Lato;color:#003418;margin-top:16px">tabunganqurban.kubahtimah.com</div></div>`,B);
  o.b=blok(12,B,{eb:'Tabungan Qurban MAKT',ebAt:44.61,tt:[['Yuk,',44.61],['mulai',45.05],['menabung',45.26],['\n'],['hari',45.66,1],['ini',45.82,1]],sb:'Daftar sekarang',sbAt:47.9,align:'left',left:860,width:1000,top:150,fs:84});
  o.ay=mk2(`<div style="position:absolute;left:860px;top:640px;z-index:10;color:#FFE3B0"><div style="font:700 70px/1.3 Amiri;text-align:left" dir="rtl">فَصَلِّ لِرَبِّكَ وَانْحَرْ</div><div style="font:400 32px Lato;color:#FFF3E2;margin-top:4px">QS. Al-Kautsar: 2</div></div>`,B);},
update(t,r){const o=r._,v=x=>V(12,x);const k=ease.out(prog(t,v(46.4),v(47.1)));o.qr.style.opacity=k;o.qr.style.transform=`translateY(${(1-k)*40}px) scale(${lerp(.94,1,k)})`;
  fadeUp(o.ay,t,v(48.93),.8,20);o.m.glow.style.opacity=.6+.4*Math.sin(t*1.2)**2;drift(o.h1,t,2);upBlok(o.b,t);}});
