import { Suspense } from "react";
import { PatientNav } from "@/components/patient-nav";
import { idFrom } from "@/lib/params";

/** Patient screens are phone-sized: most patients open the app on a mobile browser. */
export default function PatientLayout({ children, params }: LayoutProps<"/gestante/[id]">) {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<div className="mb-5 h-11 rounded-full bg-white shadow-sm" />}>
        <Nav params={params} />
      </Suspense>
      {children}
    </div>
  );
}

async function Nav({ params }: { params: Promise<{ id: string }> }) {
  return <PatientNav patientId={await idFrom(params)} />;
}
