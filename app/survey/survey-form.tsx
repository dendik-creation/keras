"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import AuthAccess from "@/components/middleware_wrapper/AuthAccess";
import TurnstileGuard from "@/components/middleware_wrapper/TurnstileGuard";

import { surveyFormSchema } from "@/modules/survey/survey.schema";
import {
  SURVEY_STEPS,
  SURVEY_FEATURES,
  SURVEY_QUEUE_OPTIONS,
  SURVEY_WAR_SUCCESS_OPTIONS,
  NPS_SCORES,
} from "@/modules/survey/survey.constants";
import { getActiveUserFromStorage, preventEnterSubmit } from "@/modules/survey/survey.utils";
import { trackSurveySubmitted, trackSurveySubmitFailed } from "@/lib/analytics/events";
import { getClientSurveyMetadata } from "@/modules/survey/survey.metadata";
import { getStepValidationFields, isStepValid } from "@/modules/survey/survey.validation";
import type { SurveyFormData, ActiveUserSession, SurveyPayload } from "@/modules/survey/survey.types";

import { SurveyStepper } from "@/modules/survey/components/SurveyStepper";
import { SurveyNavigation } from "@/modules/survey/components/SurveyNavigation";
import { StarRating } from "@/modules/survey/components/StarRating";
import { FeatureRating } from "@/modules/survey/components/FeatureRating";
import { PainPointSelector } from "@/modules/survey/components/PainPointSelector";
import { RequestedFeatureSelector } from "@/modules/survey/components/RequestedFeatureSelector";
import { SurveySuccess } from "@/modules/survey/components/SurveySuccess";

export function SurveyForm() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<ActiveUserSession | null>(null);

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      overallSatisfaction: 0,
      easeOfUse: 0,
      helpfulness: 0,
      nps: -1,
      featuresUsed: [],
      aiScheduleRating: null,
      warEngineRating: null,
      templateRating: null,
      shareScheduleRating: null,
      submissionHistoryRating: null,
      sessionCheckerRating: null,
      queueExperience: "",
      warSuccess: "",
      painPoints: [],
      requestedFeatures: [],
      feedback: "",
      userId: "",
      degree: "S1",
      studyProgram: "",
    },
  });

  const { control, watch, handleSubmit, trigger, formState: { errors } } = form;
  const watchFeaturesUsed = watch("featuresUsed");

  // Hydrates profile fields from the locally cached user; AuthAccess/TurnstileGuard
  // below control what actually renders, this just fills form defaults.
  useEffect(() => {
    const activeUser = getActiveUserFromStorage();
    setUser(activeUser);
    if (!activeUser) return;
    form.setValue("userId", activeUser.userId || activeUser.nim || "");
    form.setValue("degree", activeUser.degree || "S1");
    form.setValue("studyProgram", activeUser.studyProgram || activeUser.major || "");
  }, [form]);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep]);

  const validateStep = async (step: number): Promise<boolean> => {
    const fieldsToValidate = getStepValidationFields(step);
    if (fieldsToValidate.length > 0) {
      const isValidZod = await trigger(fieldsToValidate);
      if (!isValidZod) return false;
    }
    return isStepValid(step, form.getValues());
  };

  const handleNextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, SURVEY_STEPS.length - 1));
    } else {
      toast.error("Formulir Belum Lengkap", {
        description: "Silakan lengkapi semua kolom wajib pada langkah ini sebelum melanjutkan.",
      });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: SurveyFormData) => {
    if (currentStep !== SURVEY_STEPS.length - 1 || isSubmitting) return;
    if (!user) {
      toast.error("Sesi Tidak Ditemukan", {
        description: "Data sesi pengguna tidak ditemukan. Silakan login kembali untuk melanjutkan.",
      });
      return;
    }

    setIsSubmitting(true);
    const metadata = getClientSurveyMetadata();

    const payload: SurveyPayload = {
      ...data,
      ...metadata,
      userId: String(data.userId || user.userId || user.nim || ""),
      degree: String(data.degree || user.degree || "S1"),
      studyProgram: String(data.studyProgram || user.studyProgram || user.major || ""),
    };

    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json().catch(() => null);

      if (!response.ok || !resData?.success) {
        throw new Error(resData?.message || "Pengiriman survei gagal");
      }

      trackSurveySubmitted({
        overall_satisfaction: data.overallSatisfaction,
        nps: data.nps,
        features_used_count: data.featuresUsed.length,
        pain_points_count: data.painPoints.length,
      });
      setIsSubmitted(true);
      toast.success("Survei Terkirim", {
        description: "Terima kasih, masukan Anda membantu kami meningkatkan KeRaS.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengirim survei. Silakan coba lagi.";
      trackSurveySubmitFailed({ reason: message });
      toast.error("Gagal Mengirim Survei", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthAccess>
        <TurnstileGuard>
          <SurveySuccess />
        </TurnstileGuard>
      </AuthAccess>
    );
  }

  return (
    <AuthAccess>
      <TurnstileGuard>
        <div ref={cardRef} className="w-full">
      <SurveyStepper steps={SURVEY_STEPS} currentStepIndex={currentStep} />

      <Card className="border-2 p-0! mb-24 md:mb-4 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 pb-4 border-b-2 border-black dark:border-zinc-800">
            <h2 className="text-xl font-bold uppercase text-black dark:text-white tracking-tight">
              {SURVEY_STEPS[currentStep].title}
            </h2>
            <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
              {SURVEY_STEPS[currentStep].description}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (currentStep === SURVEY_STEPS.length - 1) {
                handleSubmit(onSubmit)(e);
              }
            }}
            onKeyDown={preventEnterSubmit}
            className="space-y-8"
          >
            {/* STEP 1: Overall Experience */}
            {currentStep === 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <label htmlFor="overallSatisfaction" className="font-bold uppercase text-sm text-black dark:text-white flex items-center gap-1">
                    Kepuasan Keseluruhan <span className="text-[#FF3000]">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="overallSatisfaction"
                    render={({ field }) => (
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        ariaLabel="Kepuasan Keseluruhan"
                      />
                    )}
                  />
                  {errors.overallSatisfaction && (
                    <p className="text-red-500 text-xs font-semibold">{errors.overallSatisfaction.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label htmlFor="easeOfUse" className="font-bold uppercase text-sm text-black dark:text-white flex items-center gap-1">
                    Kemudahan Penggunaan <span className="text-[#FF3000]">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="easeOfUse"
                    render={({ field }) => (
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        ariaLabel="Kemudahan Penggunaan"
                      />
                    )}
                  />
                  {errors.easeOfUse && (
                    <p className="text-red-500 text-xs font-semibold">{errors.easeOfUse.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label htmlFor="helpfulness" className="font-bold uppercase text-sm text-black dark:text-white flex flex-col gap-1">
                    <span>
                      Kegunaan KeRaS <span className="text-[#FF3000]">*</span>
                    </span>
                    <span className="text-xs text-gray-600 dark:text-zinc-400 normal-case font-medium">
                      Seberapa besar KeRaS membantu proses penyusunan dan pengiriman KRS Anda?
                    </span>
                  </label>
                  <Controller
                    control={control}
                    name="helpfulness"
                    render={({ field }) => (
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        ariaLabel="Kegunaan KeRaS"
                      />
                    )}
                  />
                  {errors.helpfulness && (
                    <p className="text-red-500 text-xs font-semibold">{errors.helpfulness.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="font-bold uppercase text-sm text-black dark:text-white flex flex-col gap-1">
                    <span>
                      Skor Rekomendasi (NPS) <span className="text-[#FF3000]">*</span>
                    </span>
                    <span className="text-xs text-gray-600 dark:text-zinc-400 normal-case font-medium">
                      Seberapa besar kemungkinan Anda merekomendasikan KeRaS kepada teman? (0 = Sangat Tidak Mungkin, 10 = Sangat Mungkin)
                    </span>
                  </label>
                  <div
                    role="radiogroup"
                    aria-label="Skor Rekomendasi"
                    className="grid grid-cols-6 sm:grid-cols-11 gap-2 max-w-full"
                  >
                    {NPS_SCORES.map((num) => (
                      <Controller
                        key={num}
                        control={control}
                        name="nps"
                        render={({ field }) => (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={field.value === num}
                            aria-label={`Skor NPS ${num}`}
                            onClick={() => field.onChange(num)}
                            className={`h-11 border-2 border-black dark:border-zinc-700 font-bold flex items-center justify-center transition-colors text-sm rounded-none ${
                              field.value === num
                                ? "bg-[#FF3000] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-white dark:bg-zinc-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {num}
                          </button>
                        )}
                      />
                    ))}
                  </div>
                  {errors.nps && (
                    <p className="text-red-500 text-xs font-semibold">{errors.nps.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Features Used */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <label className="font-bold uppercase text-sm text-black dark:text-white flex items-center gap-1">
                    Fitur KeRaS mana saja yang pernah Anda gunakan? <span className="text-[#FF3000]">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SURVEY_FEATURES.map((feature) => (
                      <Controller
                        key={feature.id}
                        control={control}
                        name="featuresUsed"
                        render={({ field }) => {
                          const isChecked = field.value?.includes(feature.id);
                          return (
                            <label
                              className={`flex items-center space-x-3 border-2 p-3.5 cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-black dark:border-zinc-500 bg-gray-100 dark:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                                  : "border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <Checkbox
                                id={feature.id}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const val = field.value || [];
                                  if (checked) {
                                    field.onChange([...val, feature.id]);
                                  } else {
                                    field.onChange(val.filter((v) => v !== feature.id));
                                  }
                                }}
                              />
                              <span className="text-sm font-semibold cursor-pointer w-full text-black dark:text-white select-none">
                                {feature.label}
                              </span>
                            </label>
                          );
                        }}
                      />
                    ))}
                  </div>
                  {errors.featuresUsed && (
                    <p className="text-red-500 text-xs font-semibold">{errors.featuresUsed.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Feature Ratings */}
            {currentStep === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <FeatureRating control={control} featuresUsed={watchFeaturesUsed || []} />
              </div>
            )}

            {/* STEP 4: War KRS Experience & Pain Points */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <label className="font-bold uppercase text-sm text-black dark:text-white flex items-center gap-1">
                    Pengalaman Antrean <span className="text-[#FF3000]">*</span>
                  </label>
                  <div role="radiogroup" aria-label="Pengalaman Antrean" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SURVEY_QUEUE_OPTIONS.map((opt) => (
                      <Controller
                        key={opt.id}
                        control={control}
                        name="queueExperience"
                        render={({ field }) => (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={field.value === opt.id}
                            onClick={() => field.onChange(opt.id)}
                            className={`border-2 border-black dark:border-zinc-700 p-3 font-bold text-sm transition-colors rounded-none ${
                              field.value === opt.id
                                ? "bg-[#FF3000] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-white dark:bg-zinc-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {opt.label}
                          </button>
                        )}
                      />
                    ))}
                  </div>
                  {errors.queueExperience && (
                    <p className="text-red-500 text-xs font-semibold">{errors.queueExperience.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="font-bold uppercase text-sm text-black dark:text-white flex items-center gap-1">
                    Hasil War KRS <span className="text-[#FF3000]">*</span>
                  </label>
                  <div role="radiogroup" aria-label="Hasil War KRS" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SURVEY_WAR_SUCCESS_OPTIONS.map((opt) => (
                      <Controller
                        key={opt.id}
                        control={control}
                        name="warSuccess"
                        render={({ field }) => (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={field.value === opt.id}
                            onClick={() => field.onChange(opt.id)}
                            className={`border-2 border-black dark:border-zinc-700 p-3 font-bold text-sm transition-colors rounded-none ${
                              field.value === opt.id
                                ? "bg-[#FF3000] text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-white dark:bg-zinc-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {opt.label}
                          </button>
                        )}
                      />
                    ))}
                  </div>
                  {errors.warSuccess && (
                    <p className="text-red-500 text-xs font-semibold">{errors.warSuccess.message}</p>
                  )}
                </div>

                <PainPointSelector control={control} error={errors.painPoints?.message} />
              </div>
            )}

            {/* STEP 5: Suggestions & Feedback */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <RequestedFeatureSelector control={control} />

                <div className="space-y-3 flex flex-col">
                  <label htmlFor="feedback" className="font-bold uppercase text-sm text-black dark:text-white">
                    Saran & Masukan Terbuka (Opsional)
                  </label>
                  <textarea
                    id="feedback"
                    {...form.register("feedback")}
                    className="border-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]"
                    placeholder="Tuliskan saran, kritik, atau pengalaman Anda menggunakan KeRaS..."
                  />
                </div>
              </div>
            )}

            <SurveyNavigation
              currentStepIndex={currentStep}
              totalSteps={SURVEY_STEPS.length}
              isSubmitting={isSubmitting}
              onPrev={handlePrevStep}
              onNext={handleNextStep}
              onSubmit={handleSubmit(onSubmit)}
            />
          </form>
        </CardContent>
      </Card>
        </div>
      </TurnstileGuard>
    </AuthAccess>
  );
}
