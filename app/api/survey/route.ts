import { surveyController } from "@/modules/survey/survey.controller";

export async function POST(req: Request) {
  return surveyController.handlePost(req);
}
