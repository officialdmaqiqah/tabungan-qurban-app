const lay=r=>{r.style.overflow='hidden';return h('div',{style:'position:absolute;inset:0'},r);};
// 1 HOOK — senja, jendela masjid menyala
S(1,{fadeIn:0,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.senja);
  o.sun=matahari(B,1360,840,360,'#ffcf7a');o.h1=bukit(B,900,'#3a2547',30,2,1);o.m=masjid(B,960,930,1050,SIL,'#ffc46b');o.h2=bukit(B,960,'#0d0a14',18,5);
  o.b=blok(1,B,{eb:'Tahun ini',ebAt:.57,tt:[['Sudah',1.86],['siap',2.18],['berqurban?',2.46,1]]});},
update(t,r){const o=r._;o.sun.style.transform=`translateY(${t*14}px)`;o.m.glow.style.opacity=.35+.65*ease.out(prog(t,V(1,2.46),V(1,3.2)));
  drift(o.h1,t,4);upBlok(o.b,t);}});

// 2 PROBLEM — malam, kambing berjalan sendirian
S(2,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.malam);o.st=bintang(B);o.mo=bulan(B,1580,170,110,'#f4ecd8');
  o.h1=bukit(B,930,'#141a33',40,3,1);o.k=sil(B,'sil-kambing',1180,950,360,SIL,false,4);o.h2=bukit(B,975,'#07080f',14,7);
  o.b=blok(2,B,{eb:'Rasanya berat',ebAt:3.5,tt:[['Rp 0',4.7,1]],sb:'harus keluar <b>sekaligus?</b>',sbAt:6.5});o.num=o.b.W[0].s.firstChild;},
update(t,r){const o=r._;upBintang(o.st,t);o.k.style.transform=`translateX(${(1-ease.out(prog(t,0,3.5)))*260}px)`;drift(o.h1,t,5);
  o.num.textContent=rp(Math.round(3500000*ease.out(prog(t,V(2,4.75),V(2,6.2)))/50000)*50000);upBlok(o.b,t);}});

// 3 PROBLEM — koin berjatuhan (tabungan bocor)
S(3,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.malam);o.st=bintang(B);o.mo=bulan(B,1580,170,110,'#f4ecd8');
  o.h1=bukit(B,930,'#141a33',40,3,1);o.k=sil(B,'sil-kambing',1180,950,360,SIL,false,4);o.h2=bukit(B,975,'#07080f',14,7);
  o.c=[0,1,2,3,4,5].map(i=>mk2(`<div style="position:absolute;left:${520+i*90}px;top:560px;width:36px;height:36px;border-radius:50%;background:#F5B800;box-shadow:0 0 18px #F5B80099;z-index:5"></div>`,B));
  o.b=blok(3,B,{eb:'Niat menabung sudah ada',ebAt:7.54,tt:[['Tapi',9.22],['uangnya',9.94],['sering',10.26,1],['terpakai',10.54,1]],sb:'untuk hal lain',sbAt:11.2});},
update(t,r){const o=r._;upBintang(o.st,t);drift(o.h1,t+3.5,5);
  o.c.forEach((c,i)=>{const a=V(3,8.4+i*.12),f=prog(t,V(3,10.6+i*.1),V(3,11.6+i*.1));c.style.opacity=t>=a?clamp(prog(t,a,a+.3))*(1-f):0;c.style.transform=`translateY(${f*f*420}px)`;});
  upBlok(o.b,t);}});

// 4 PROBLEM — awan menutup bulan, ragu
S(4,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.malam);o.st=bintang(B);o.mo=bulan(B,1580,170,110,'#f4ecd8');
  o.cl=mk2(`<div style="position:absolute;left:1900px;top:150px;width:520px;height:150px;border-radius:80px;background:#232845;box-shadow:120px 30px 0 -20px #232845,-140px 40px 0 -30px #232845;z-index:2"></div>`,B);
  o.h1=bukit(B,930,'#141a33',40,3,1);o.k=sil(B,'sil-kambing',1180,950,360,SIL,false,4);o.h2=bukit(B,975,'#07080f',14,7);
  o.b=blok(4,B,{eb:'Dicatat seadanya',ebAt:12.1,tt:[['Tak',13.54],['terpantau…',13.7,1]],sb:'akhirnya ragu sendiri',sbAt:14.66});},
update(t,r){const o=r._;upBintang(o.st,t,1-.5*prog(t,1.5,3.5));o.cl.style.transform=`translateX(${-ease.inOut(prog(t,.5,3.8))*560}px)`;drift(o.h1,t+8,5);upBlok(o.b,t);}});

// 5 AGITATE — malam pekat, jendela padam
S(5,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._={B:lay(r)},B=o.B;langit(r,SKY.pekat);o.st=bintang(B,22,8);
  o.h1=bukit(B,920,'#120d1b',26,4,1);o.m=masjid(B,960,950,860,'#271f38','#ffb35a');o.h2=bukit(B,975,'#050408',12,9);
  o.b1=blok(5,B,{eb:'Niat sudah lama',ebAt:16.66,tt:[['tapi',17.99],['selalu',18.5],['ditunda',18.94,1]],col:'#E9E1EE',ebc:'#c98a8a'});
  o.b2=blok(5,B,{eb:'Tahun depan…',ebAt:19.83,tt:[['mau',20.71],['dengan',20.9],['alasan',21.14,1],['yang',21.46,1],['sama?',21.62,1]],col:'#E9E1EE',ebc:'#c98a8a'});},
update(t,r){const o=r._;upBintang(o.st,t,.7);o.m.glow.style.opacity=.08*Math.max(0,Math.sin(t*2));drift(o.h1,t,3);
  upBlok(o.b1,t,V(5,19.6));upBlok(o.b2,t,V(5,22.2));}});

// 6 SOLUTION — fajar menyingsing, jendela menyala lagi
S(6,{fadeIn:.3,fadeOut:0,
setup(r){const o=r._={B:lay(r),r},B=o.B;o.st=bintang(B,22,8);
  o.sun=matahari(B,960,1060,560,'#ffe2a0');o.h1=bukit(B,920,'#120d1b',26,4,1);o.m=masjid(B,960,950,860,'#1d1729','#ffd27a');o.h2=bukit(B,975,'#050408',12,9);
  o.b=blok(6,B,{eb:'Kini hadir',ebAt:24.46,tt:[['Tabungan',25.37],['Qurban',25.74],['MAKT',26.0,1]],sb:'Masjid Agung Kubah Timah',sbAt:26.22});},
update(t,r){const o=r._,m=x=>M(6,x);const k=ease.inOut(prog(t,m(22.0),m(23.6)));
  langit(r,SKY.pekat,SKY.fajar,k);upBintang(o.st,t,1-k);o.sun.style.transform=`translateY(${-ease.out(prog(t,m(22.2),m(24.5)))*170}px)`;o.sun.style.opacity=k;
  o.m.glow.style.opacity=ease.out(prog(t,m(23.3),m(24.0)));o.h1.querySelector('path').setAttribute('fill',mix('#120d1b','#4a2f4f',k));o.m.firstChild.style.color=mix('#1d1729','#2a1b30',k);
  upBlok(o.b,t,V(6,27.75));}});
