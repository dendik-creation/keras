export interface OnboardingStepConfig {
  id: string;
  target: string;
  title: string;
  text: string;
  attachToOptions?: {
    element: string;
    on?: "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end" | "right-start" | "right-end" | "auto";
  };
}

export interface RouteOnboardingConfig {
  route: string;
  steps: OnboardingStepConfig[];
}

export const ONBOARDING_CONFIGS: Record<string, RouteOnboardingConfig> = {
  "/schedule": {
    route: "/schedule",
    steps: [
      {
        id: "schedule-page-title",
        target: '[data-tour="schedule-page-title"]',
        title: "Jadwal KRS-MU",
        text: "Ini adalah halaman Jadwal KRS-MU. Kamu sedang berada di ruang utama untuk menyusun jadwal kuliah.",
        attachToOptions: { element: '[data-tour="schedule-page-title"]', on: "bottom" },
      },
      {
        id: "schedule-course-list",
        target: '[data-tour="schedule-course-list"]',
        title: "Daftar Mata Kuliah",
        text: "Di sini kamu akan melihat daftar mata kuliah yang tersedia sesuai prodi kamu.",
        attachToOptions: { element: '[data-tour="schedule-course-list"]', on: "right" },
      },
      {
        id: "schedule-refresh-button",
        target: '[data-tour="schedule-refresh-button"]',
        title: "Perbarui Ketersediaan",
        text: "KeRaS akan mengambil jadwal terbaru dari KRS kampus agar daftar tetap akurat.",
        attachToOptions: { element: '[data-tour="schedule-refresh-button"]', on: "bottom" },
      },
      {
        id: "schedule-timetable",
        target: '[data-tour="schedule-timetable"]',
        title: "Tabel Jadwal",
        text: "Ruang ini menampilkan jadwal yang sudah kamu bentuk.",
        attachToOptions: { element: '[data-tour="schedule-timetable"]', on: "left" },
      },
      {
        id: "schedule-actions",
        target: '[data-tour="schedule-actions"]',
        title: "Aksi Jadwal",
        text: "Di sini kamu bisa simpan jadwal, hapus jadwal, berbagi jadwal sesama prodi, dan membuat jadwal dengan AI.",
        attachToOptions: { element: '[data-tour="schedule-actions"]', on: "bottom" },
      },
      {
        id: "schedule-sidebar-toggle",
        target: '[data-tour="schedule-sidebar-toggle"]',
        title: "Navigasi Menu",
        text: "Klik di sini untuk membuka menu lain dan berpindah ke halaman lain.",
        attachToOptions: { element: '[data-tour="schedule-sidebar-toggle"]', on: "bottom" },
      },
    ],
  },
  "/submit": {
    route: "/submit",
    steps: [
      {
        id: "war-control-panel",
        target: '[data-tour="war-control-panel"]',
        title: "Pusat Kendali Perang",
        text: "Ini adalah pusat kendali untuk memulai submit jadwal yang sudah kamu siapkan.",
        attachToOptions: { element: '[data-tour="war-control-panel"]', on: "bottom" },
      },
      {
        id: "war-schedule-table",
        target: '[data-tour="war-schedule-table"]',
        title: "Tabel Jadwal Perang",
        text: "Bagian ini menampilkan jadwal final dan status setiap kelas.",
        attachToOptions: { element: '[data-tour="war-schedule-table"]', on: "left" },
      },
      {
        id: "war-activity-log",
        target: '[data-tour="war-activity-log"]',
        title: "Aktivitas Perang",
        text: "Semua histori aksi perang KRS dicatat di sini.",
        attachToOptions: { element: '[data-tour="war-activity-log"]', on: "right" },
      },
      {
        id: "war-remove-selected",
        target: '[data-tour="war-remove-selected"]',
        title: "Hapus Terpilih",
        text: "Gunakan ini untuk melepas mata kuliah yang sudah didapat atau menghapus mata kuliah yang belum berhasil.",
        attachToOptions: { element: '[data-tour="war-remove-selected"]', on: "bottom" },
      },
    ],
  },
};
