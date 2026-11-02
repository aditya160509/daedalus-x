import { Suspense } from "react";
import { DesignStudio } from "./DesignStudio";

export const metadata = { title: "Design · Daedalus X" };

export default function DesignPage() {
  return (
    <Suspense fallback={<div className="h-full animate-pulse bg-surface-2" />}>
      <DesignStudio />
    </Suspense>
  );
}
