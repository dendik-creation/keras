const changelogHistories = [
  {
    version: "1.0.0",
    date: "1 Jan 2026",
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
    version: "1.3.0",
    date: "8 Jul 2026",
    title: "Refactor Arsitektur Modular",
    changes: [
      "Restrukturisasi backend menjadi arsitektur modular (service, controller, validator) per module: auth, schedule, submit, site",
      "Penambahan utilitas server bersama (session, https-agent, http-error) untuk mengurangi duplikasi",
      "Route API dibuat tipis dengan re-export controller tanpa mengubah path maupun perilaku",
      "Peningkatan keterbacaan dan reusabilitas kode",
    ],
  },
];

export default changelogHistories.reverse();
