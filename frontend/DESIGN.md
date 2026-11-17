# PayBridge Design Direction (`DESIGN.md`)

**Konsep:** "Kertas, tinta, satu aksen". Invoice sebagai metafora visual. Tenang, rapi, bisa dipercaya.
**Design Read:** Dashboard & checkout tagihan freelancer Indonesia dengan nuansa lembar invoice kertas editorial, dial `ENERGY 1 / RHYTHM 1 / MOTION 1`.

---

## Dial Liveliness
- **ENERGY: 1 (Tenang):** Transaksi keuangan dan tagihan membutuhkan ketenangan dan kejelasan, bukan efek visual mencolok.
- **RHYTHM: 1 (Rapat dan teratur):** Struktur baris dan grid yang konsisten memudahkan freelancer memindai nominal, status, dan log audit secara cepat.
- **MOTION: 1 (Minimal):** Hanya transisi warna/border fungsional saat hover/focus tanpa animasi berulang atau dekoratif, serta menghormati `prefers-reduced-motion`.

## Palet Warna (Light Default, Dark Mode Opsional via Toggle)

### Mode Terang (Default)
- `paper` `#F5F1E8`: Warna kertas hangat mengurangi silau layar sekaligus membedakan PayBridge dari dashboard SaaS generik.
- `surface` `#FFFDF8`: Kontras permukaan lembar invoice di atas latar kertas agar kartu data terpisah tanpa shadow berlapis.
- `ink` `#14213D`: Tinta biru-hitam pekat memberikan keterbacaan tinggi (`14.17:1` di atas `paper`) dengan nuansa dokumen resmi.
- `ink-muted` `#5C5A52`: Teks sekunder bernada hangat yang tetap memenuhi WCAG AA (`6.13:1` di atas `paper`, `6.80:1` di atas `surface`).
- `line` `#D8D2C4`: Garis pemisah tipis menyerupai garis tabel invoice cetak agar batas struktur jelas namun tidak keras.
- `line-strong` `#8A8576`: Batas input dan kontrol interaktif yang mencapai kontras non-teks WCAG (`3.63:1` di atas `surface`).
- `stamp` `#C23B1E`: Satu aksen merah stempel untuk tombol aksi utama, penanda tab aktif mobile, dan stempel `LUNAS` (`5.25:1` teks putih di atasnya).
- `paid` `#2F6B4F`: Penanda status lunas yang tenang dan kontras (`6.19:1` di atas `surface`), selalu didampingi label teks dan ikon.
- `pending` `#8A5A00`: Penanda status menunggu yang hangat dan terbaca (`5.83:1` di atas `surface`), selalu didampingi label teks dan ikon.

### Mode Gelap (Opsional via Toggle)
- `paper` `#161614`, `surface` `#1F1F1B`, `ink` `#F2EDE2`, `ink-muted` `#B8B2A6`, `line` `#35342E`, `line-strong` `#7E796D`, `stamp` `#E35D3F` (teks `#161614`), `paid` `#66B88D`, `pending` `#E0A538`: Mempertahankan metafora tinta di atas kertas gelap hangat dengan rasio kontras terverifikasi >= `4.65:1` untuk semua teks.

## Tipografi
- **Heading (`Fraunces`):** Serif editorial untuk judul halaman dan angka tagihan utama agar terasa seperti kepala surat invoice resmi.
- **UI & Body (`DM Sans`):** Sans-serif netral dengan keterbacaan tinggi pada tabel, formulir, dan label status.
- **Angka & Kode (`IBM Plex Mono` + `tabular-nums`):** Menjaga perataan vertikal pada kolom nominal IDR, konversi BTC/ETH, nomor invoice, dan Order ID.
- **Skala Minimum:** Label minimal `12px`, isi tabel minimal `14px`, input minimal `16px` untuk mencegah zoom paksa di mobile dan menjaga keterbacaan.

## Aturan Komponen, Layout & Aksesibilitas
- **Kartu & Radius:** Border `1px solid var(--line)`, tanpa shadow berlapis, radius `4px`-`6px` menyerupai sudut kertas/kartu cetak; tidak menggunakan `rounded-full` untuk pill.
- **Tap Target & Fokus:** Semua tombol/tautan interaktif minimal `44x44px` (`min-h-11 min-w-11`), `:focus-visible` memakai garis luar `2px solid var(--ink)`, dan skip link tersedia di `App.tsx`.
- **Navigasi Mobile (`<768px`):** Bottom navigation 4 item (Dashboard, Invoice, Audit, Lab) dengan garis atas `2px` warna `stamp` pada item aktif agar mudah dijangkau ibu jari.
- **Tiga State Data:** Setiap tampilan data wajib menyediakan state loading (skeleton), kosong (pesan + aksi), dan error (pesan + tombol "Coba lagi").
- **Dashboard & Checkout Publik:** Dashboard menonjolkan satu angka fokus utama (total menunggu pembayaran) diikuti ringkasan berbaris rapi; halaman publik QRIS dirancang seperti lembar invoice utuh dengan kartu QR bertepi bergerigi dan stempel `LUNAS`.
