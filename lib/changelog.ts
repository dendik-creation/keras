const changelogHistories = [
  {
    version: "1.0.0",
    date: "2026-1-31",
    title: "Rilis Pertama",
    changes: ["Rilis pertama kali untuk publik"],
  },
  {
    version: "1.1.0",
    date: "2026-02-01",
    title: "Perang KRS",
    changes: [
      "Fitur baru Perang KRS untuk submit data jadwal ke server universitas",
      "Pengklasifikasian route terautentikasi dan non-autentikasi",
      "Peningkatan performa dan stabilitas aplikasi",
    ],
  },
  {
    version: "1.1.1",
    date: "2026-03-02",
    title: "Monitoring Event",
    changes: [
      "Penambahan monitoring request dan speed analytics sebagai evaluasi performa aplikasi",
    ],
  },
  {
    version: "1.1.2",
    date: "2026-03-07",
    title: "Pengecekan Site Off",
    changes: [
      "Penambahan pengecekan site off dari server universitas terhadap KeRaS",
    ],
  },
];

export default changelogHistories.reverse();
