export type CourseSchedule = {
  code: string;
  class: string;
  course: string;
  category: string;
  sks: string;
  lecture: string;
  schedule_id: string;
  day: string;
  hour: string;
  classroom: string;
  schedule_submit_id?: string;
  saved_in_submit?: boolean;
  semester?: string;
};

export type OfferingCourse = {
  latest_update: string;
  semester: string;
  courses: CourseSchedule[];
};
