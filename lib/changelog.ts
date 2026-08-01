const changelogHistories = [
  {
    version: "1.0.0",
    date: "1 Feb 2026",
    title: "Rilis Pertama",
    changes: ["Rilis pertama kali untuk publik"],
  },
  {
    version: "1.1.0",
    date: "2 Feb 2026",
    title: "Perang KRS",
    changes: [
      "Fitur baru Perang KRS untuk submit data jadwal ke server universitas",
      "Pengklasifikasian route terautentikasi dan non-autentikasi",
      "Peningkatan performa dan stabilitas aplikasi",
    ],
  },
  {
    version: "1.1.1",
    date: "3 Feb 2026",
    title: "Monitoring Event",
    changes: [
      "Penambahan monitoring request dan speed analytics sebagai evaluasi performa aplikasi",
    ],
  },
  {
    version: "1.1.2",
    date: "3 Mar 2026",
    title: "Pengecekan Site Off",
    changes: [
      "Penambahan pengecekan site off dari server universitas terhadap KeRaS",
    ],
  },
  {
    version: "1.1.3",
    date: "19 Mar 2026",
    title: "Penyesuaian Changelog UI",
    changes: ["Penyesuaian Changelog UI berbasis Timeline"],
  },
  {
    version: "1.2.1",
    date: "22 Apr 2026",
    title: "Perubahan Tema Sistem",
    changes: ["Perubahan tema dari minimalist ke bauhaus"],
  },
  {
    version: "2.0.0",
    date: "8 Jul 2026",
    title: "Refactor Arsitektur Modular",
    changes: [
      "Restrukturisasi backend menjadi arsitektur modular (service, controller, validator) per module: auth, schedule, submit, site",
      "Penambahan utilitas server bersama (session, https-agent, http-error) untuk mengurangi duplikasi",
      "Route API dibuat tipis dengan re-export controller tanpa mengubah path maupun perilaku",
      "Peningkatan keterbacaan dan reusabilitas kode",
    ],
  },
  {
    version: "2.1.0",
    date: "8 Jul 2026",
    title: "Integrasi Analitik PostHog",
    changes: [
      "Integrasi analitik penggunaan anonim menggunakan PostHog",
      "NIM mahasiswa selalu disamarkan (6 digit awal, sisanya bintang) sebelum dikirim",
      "Pencatatan aktivitas perang KRS: jumlah jadwal disiapkan vs berhasil didapatkan",
      "Revisi informasi keamanan dari 'No Tracking' menjadi 'Analitik Anonim'",
    ],
  },
  {
    version: "2.1.1",
    date: "8 Jul 2026",
    title: "Redesain Swiss Style",
    changes: [
      "Refactor UI ke Swiss International Typographic Style (grid, tipografi grotesque, monokrom + merah signal)",
      "Palet baru: putih, hitam, abu #F2F2F2, aksen Swiss Red #FF3000; font Inter menggantikan Outfit",
      "Tekstur pattern (grid, dots, diagonal, noise) untuk kedalaman tanpa bayangan",
      "Label section bernomor, layout asimetris, dan hover inversi warna",
      "Dashboard (jadwal & perang KRS), sidebar, header, dan state loading ikut diseragamkan Swiss",
    ],
  },
  {
    version: "2.1.2",
    date: "8 Jul 2026",
    title: "Mobile Responsive & PWA",
    changes: [
      "Desain responsif untuk landing dan dashboard (/schedule & /submit)",
      "Bottom navigation khusus mobile menggantikan sidebar pada dashboard",
      "Kalender jadwal disusun ulang menjadi tumpukan per-hari di layar kecil",
      "Dukungan PWA: dapat di-install sebagai app (manifest, service worker, ikon 192/512 + maskable + apple touch)",
    ],
  },
  {
    version: "2.1.3",
    date: "8 Jul 2026",
    title: "Local Setup",
    changes: [
      "Ada docker compose untuk yang mau setup di local",
      "Bisa memakai image ghcr di registry KeRaS.",
      "Tidak ada analitik yang disimpan"
    ],
  },
  {
    version: "2.2.0",
    date: "9 Jul 2026",
    title: "Cloudflare Challange",
    changes: [
      "Menambahkan deteksi robot menggunakan cloudflare ketika website di load",
    ],
  },
  {
    version: "2.3.1",
    date: "24 Jul 2026",
    title: "Berbagi Jadwal",
    changes: [
      "Menambahkan fitur berbagi jadwal antar mahasiswa sesama prodi",
      "Mendukung short URL untuk berbagi jadwal"
    ],
  },
  {
    version: "2.3.2",
    date: "25 Jul 2026",
    title: "Buat Jadwal dengan AI",
    changes: [
      "Buat jadwal dengan AI dengan formulir yang menyenangkan",
      "Membantu mahasiswa membentuk jadwal berdasarkan preferensi",
      "Bisa pakai prompt untuk memandu AI dalam menghasilkan jadwal yang sesuai"
    ],
  },
  {
    version: "2.3.3",
    date: "30 Jul 2026",
    title: "Pengoptimalan Perang KRS",
    changes: [
      "Pengoptimalan antrian submit untuk mengurangi waktu tunggu",
      "Mengurangi resiko rate limit yang diterapkan oleh server kampus",
      "Perbaikan state management activity, schedules, dan release schedule dengan sinkronisasi informasi dari krs kampus",
    ],
  },
];

export default changelogHistories.reverse();
