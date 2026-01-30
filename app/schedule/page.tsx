import AppLayout from "@/components/partials/AppLayout";
import { PageTitle } from "@/components/partials/PageTitle";
import React from "react";

export default function Page() {
  return (
    <AppLayout>
      <PageTitle
        title="Jadwal KRS-mu"
        description="Siapkan jadwalmu dengan mudah dan tertata"
      />
    </AppLayout>
  );
}
