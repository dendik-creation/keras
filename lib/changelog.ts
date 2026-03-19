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
];

export default changelogHistories.reverse();
