import type { SurveyStep, FeatureOption, OptionItem } from "./survey.types";

export const SURVEY_VERSION = "v2";

export const SURVEY_STEPS: SurveyStep[] = [
  { id: "step-1", title: "Pengalaman Keseluruhan", description: "Penilaian umum mengenai penggunaan KeRaS v2" },
  { id: "step-2", title: "Fitur yang Digunakan", description: "Pilih fitur KeRaS yang pernah Anda gunakan" },
  { id: "step-3", title: "Penilaian Fitur Spesifik", description: "Berikan rating untuk setiap fitur yang Anda pilih" },
  { id: "step-4", title: "Pengalaman War KRS & Antrean", description: "Evaluasi performa antrean dan kendala sistem" },
  { id: "step-5", title: "Saran & Pengembangan Fitur", description: "Masukan untuk pengembangan KeRaS mendatang" },
];

export const SURVEY_FEATURES: FeatureOption[] = [
  { id: "AI Schedule Generator", label: "Buat Jadwal dengan AI", key: "aiScheduleRating" },
  { id: "War KRS Engine", label: "Rapid Submit KRS", key: "warEngineRating" },
  { id: "Saved Schedule Templates", label: "Pengelolaan Jadwal", key: "templateRating" },
  { id: "Share & Adopt Schedule", label: "Berbagi Jadwal Sesama Teman", key: "shareScheduleRating" },
  { id: "Submission History", label: "Aktivitas Perang", key: "submissionHistoryRating" },
  { id: "SSO Session Checker", label: "Manajemen Session KRS", key: "sessionCheckerRating" },
];

export const SURVEY_QUEUE_OPTIONS: OptionItem[] = [
  { id: "Sangat Baik", label: "Sangat Baik" },
  { id: "Baik", label: "Baik" },
  { id: "Cukup", label: "Cukup" },
  { id: "Kurang", label: "Kurang" },
];

export const SURVEY_WAR_SUCCESS_OPTIONS: OptionItem[] = [
  { id: "Berhasil", label: "Berhasil" },
  { id: "Berhasil Sebagian", label: "Berhasil Sebagian" },
  { id: "Gagal", label: "Gagal" },
];

export const SURVEY_PAIN_POINTS: OptionItem[] = [
  { id: "AI kurang sesuai preferensi", label: "AI kurang sesuai preferensi" },
  { id: "Queue terlalu lama", label: "Antrean terlalu lama" },
  { id: "Proses submit lambat", label: "Proses submit lambat" },
  { id: "Kelas penuh", label: "Kelas penuh" },
  { id: "Jadwal bentrok", label: "Jadwal bentrok" },
  { id: "UI membingungkan", label: "UI membingungkan" },
  { id: "Session SSO bermasalah", label: "Manajemen Session KRS bermasalah" },
  { id: "Tidak ada kendala", label: "Tidak ada kendala" },
  { id: "Lainnya", label: "Lainnya" },
];

export const SURVEY_REQUESTED_FEATURES: OptionItem[] = [
  { id: "Mobile App", label: "Aplikasi Mobile (iOS / Android)" },
  { id: "Push Notifications", label: "Notifikasi Push" },
  { id: "Kalender Akademik", label: "Integrasi Kalender Akademik" },
  { id: "Google Calendar Sync", label: "Sinkronisasi Google Calendar" },
  { id: "AI Recommendation Improvement", label: "Peningkatan Rekomendasi AI" },
  { id: "Export PDF", label: "Ekspor PDF" },
  { id: "Export Excel", label: "Ekspor Excel" },
  { id: "Multi Device Sync", label: "Sinkronisasi Multi Device" },
  { id: "Better War Analytics", label: "Analitik War KRS Lebih Mendalam" },
  { id: "Lainnya", label: "Lainnya" },
];

export const NPS_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
