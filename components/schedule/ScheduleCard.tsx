"use client";

import React, { memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CourseSchedule } from "@/types/course_schedule";
import { ScheduleCardDesktop } from "./ScheduleCardDesktop";
import { ScheduleCardMobile } from "./ScheduleCardMobile";

export interface ScheduleCardProps {
  course: CourseSchedule;
  onRemove?: (course: CourseSchedule) => void;
  onCardClick?: (course: CourseSchedule) => void;
  isSubmitMode?: boolean;
  isSelectedForRelease?: boolean;
  isSubmitting?: boolean;
  shouldReduceMotion?: boolean;
  isConflicting?: boolean;
}

export const ScheduleCard = memo(function ScheduleCard(props: ScheduleCardProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <ScheduleCardMobile {...props} />;
  }

  return <ScheduleCardDesktop {...props} />;
});
