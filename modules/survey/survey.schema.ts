import * as z from "zod";

export const surveyFormSchema = z.object({
  overallSatisfaction: z.number().min(1, "Wajib memilih tingkat kepuasan (1-5 bintang)").max(5),
  easeOfUse: z.number().min(1, "Wajib memilih kemudahan penggunaan (1-5 bintang)").max(5),
  helpfulness: z.number().min(1, "Wajib memilih tingkat kegunaan (1-5 bintang)").max(5),
  nps: z.number().min(0, "Wajib memilih skor rekomendasi (0-10)").max(10),

  featuresUsed: z.array(z.string()).min(1, "Pilih minimal satu fitur yang pernah Anda gunakan"),

  aiScheduleRating: z.number().optional().nullable(),
  warEngineRating: z.number().optional().nullable(),
  templateRating: z.number().optional().nullable(),
  shareScheduleRating: z.number().optional().nullable(),
  submissionHistoryRating: z.number().optional().nullable(),
  sessionCheckerRating: z.number().optional().nullable(),

  queueExperience: z.string().min(1, "Pilih salah satu opsi pengalaman antrean"),
  warSuccess: z.string().min(1, "Pilih salah satu opsi status keberhasilan War KRS"),

  painPoints: z.array(z.string()).min(1, "Pilih minimal satu kendala (atau 'Tidak ada kendala')"),
  requestedFeatures: z.array(z.string()).default([]),
  feedback: z.string().optional().default(""),

  userId: z.string().min(1, "Sesi pengguna tidak valid, silakan login kembali"),
  degree: z.string().optional(),
  studyProgram: z.string().optional(),
});

export const surveyIncomingPayloadSchema = surveyFormSchema.extend({
  browser: z.string().optional(),
  os: z.string().optional(),
  device: z.string().optional(),
  screenWidth: z.number().optional(),
  language: z.string().optional(),
});

export type SurveyFormSchemaType = z.infer<typeof surveyFormSchema>;
export type SurveyIncomingPayloadSchemaType = z.infer<typeof surveyIncomingPayloadSchema>;
