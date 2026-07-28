import { RouteOnboardingConfig } from "./types";

export const ONBOARDING_CONFIGS: Record<string, RouteOnboardingConfig> = {
  "/schedule": {
    route: "/schedule",
    steps: [
      {
        id: "schedule-page-title",
        title: "Jadwal KRS-MU",
        text: "Ini adalah halaman Jadwal KRS-MU. Kamu sedang berada di ruang utama untuk menyusun jadwal kuliah.",
        desktopTarget: '[data-tour-desktop="schedule-page-title"]',
        mobileTarget: '[data-tour-mobile="schedule-page-title"]',
        desktopPlacement: "bottom-start",
        mobilePlacement: "bottom",
      },
      {
        id: "schedule-course-list",
        title: "Daftar Mata Kuliah",
        text: "Di sini kamu akan melihat daftar mata kuliah yang tersedia sesuai prodi kamu.",
        desktopTarget: '[data-tour-desktop="schedule-course-list"]',
        mobileTarget: '[data-tour-mobile="schedule-course-list"]',
        desktopPlacement: "right",
        mobilePlacement: "top",
      },
      {
        id: "schedule-refresh-button",
        title: "Perbarui Ketersediaan",
        text: "KeRaS akan mengambil jadwal terbaru dari KRS kampus agar daftar tetap akurat.",
        desktopTarget: '[data-tour-desktop="schedule-refresh-button"]',
        mobileTarget: '[data-tour-mobile="schedule-refresh-button"]',
        desktopPlacement: "bottom",
        mobilePlacement: "bottom",
      },
      {
        id: "schedule-timetable",
        title: "Tabel Jadwal",
        text: "Ruang ini menampilkan jadwal yang sudah kamu bentuk.",
        desktopTarget: '[data-tour-desktop="schedule-timetable"]',
        mobileTarget: '[data-tour-mobile="schedule-timetable"]',
        desktopPlacement: "left",
        mobilePlacement: "top",
      },
      {
        id: "schedule-actions",
        title: "Aksi Jadwal",
        text: "Di sini kamu bisa simpan jadwal, hapus jadwal, berbagi jadwal sesama prodi, dan membuat jadwal dengan AI.",
        desktopTarget: '[data-tour-desktop="schedule-actions"]',
        mobileTarget: '[data-tour-mobile="schedule-actions"]',
        desktopPlacement: "bottom",
        mobilePlacement: "top",
        async beforeShow() {
          const desktopBtn = document.querySelector<HTMLElement>('[data-tour-desktop="schedule-actions"]');
          const mobileBtn = document.querySelector<HTMLElement>('[data-tour-mobile="schedule-actions"]');
          const isDropdownOpen = !!document.querySelector('[role="menu"]');
          if (desktopBtn && desktopBtn.offsetParent !== null && !isDropdownOpen) {
            desktopBtn.click();
          } else if (mobileBtn && mobileBtn.offsetParent !== null && !isDropdownOpen) {
            mobileBtn.click();
          }
        },
        async beforeHide() {
          const isDropdownOpen = !!document.querySelector('[role="menu"]');
          if (isDropdownOpen) {
            const desktopBtn = document.querySelector<HTMLElement>('[data-tour-desktop="schedule-actions"]');
            if (desktopBtn && desktopBtn.offsetParent !== null) {
              desktopBtn.click();
            } else {
              document.body.click();
            }
          }
        },
      },
      {
        id: "schedule-sidebar-toggle",
        title: "Navigasi Menu",
        text: "Klik di sini untuk membuka menu lain dan berpindah ke halaman lain.",
        desktopTarget: '[data-tour-desktop="schedule-sidebar-toggle"]',
        mobileTarget: '[data-tour-mobile="schedule-sidebar-toggle"]',
        desktopPlacement: "right",
        mobilePlacement: "top",
        async beforeShow() {
          const overlay = document.querySelector<HTMLElement>('[data-state="open"]');
          if (overlay && overlay.getAttribute("role") === "dialog") {
            const close = overlay.querySelector<HTMLElement>("button");
            close?.click();
          }
        },
      },
    ],
  },
  "/submit": {
    route: "/submit",
    steps: [
      {
        id: "war-control-panel",
        title: "Pusat Kendali Perang",
        text: "Ini adalah pusat kendali untuk memulai submit jadwal yang sudah kamu siapkan.",
        desktopTarget: '[data-tour-desktop="war-control-panel"]',
        mobileTarget: '[data-tour-mobile="war-control-panel"]',
        desktopPlacement: "bottom",
        mobilePlacement: "bottom",
      },
      {
        id: "war-schedule-table",
        title: "Tabel Jadwal Perang",
        text: "Bagian ini menampilkan jadwal final dan status setiap kelas.",
        desktopTarget: '[data-tour-desktop="war-schedule-table"]',
        mobileTarget: '[data-tour-mobile="war-schedule-table"]',
        desktopPlacement: "left",
        mobilePlacement: "top",
      },
      {
        id: "war-activity-log",
        title: "Aktivitas Perang",
        text: "Semua histori aksi perang KRS dicatat di sini.",
        desktopTarget: '[data-tour-desktop="war-activity-log"]',
        mobileTarget: '[data-tour-mobile="war-activity-log"]',
        desktopPlacement: "right",
        mobilePlacement: "top",
      },
      {
        id: "war-remove-selected",
        title: "Hapus Terpilih",
        text: "Gunakan ini untuk melepas mata kuliah yang sudah didapat atau menghapus mata kuliah yang belum berhasil.",
        desktopTarget: '[data-tour-desktop="war-remove-selected"]',
        mobileTarget: '[data-tour-mobile="war-remove-selected"]',
        desktopPlacement: "bottom",
        mobilePlacement: "top",
      },
    ],
  },
};
