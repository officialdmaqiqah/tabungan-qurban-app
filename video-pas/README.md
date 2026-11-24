# Video PAS — Tabungan Qurban MAKT

Video motion graphic Problem–Agitate–Solution untuk TV display Masjid Agung Kubah Timah.

- `tabungan-qurban-pas-4k.mp4` — video final, 3840×2160, 30 fps, 54 detik, suara Bang Yoyok (ElevenLabs).
- `tabungan-qurban-pas.html` — animasi HTML (style siluet), bisa dibuka langsung di browser (tanpa suara).
- `vo-gabungan.m4a` — voiceover yang dipakai video.
- `tabungan-qurban-pas.srt` — caption.
- `CHECKPOINT-tabungan-qurban-pas.md` — naskah, timing, dan keputusan proyek (skill konten-animasi).
- `storyboard-siluet-12.png` — storyboard 12 adegan.
- `sumber/` — kode adegan untuk dirakit ulang; `aset/` — siluet vektor & QR.

## Merakit ulang

Pakai skill konten-animasi: gabungkan `sumber/_assets.js`, `_sil.js`, `shared_src.js`, `siluet_src.js`
menjadi `shared.js`, taruh bersama `scenes-1.js` dan `scenes-2.js`, lalu jalankan
`build_anim.py CHECKPOINT-tabungan-qurban-pas.md --dir <folder> --out tabungan-qurban-pas.html`
dan `render_mp4.py tabungan-qurban-pas.html --audio vo-gabungan.m4a --scale 2` untuk 4K.

QR mengarah ke https://tabunganqurban.kubahtimah.com/ (alur: daftar dulu, baru setor via QRIS).
