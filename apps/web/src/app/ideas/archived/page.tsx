"use client";

import { Suspense } from "react";
import { IdeasPageContent } from "../page";

export default function ArchivedIdeasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <IdeasPageContent
  statusFilter="archived"
  pageTitle="Archived Ideas"
  hideStatusFilter
/>
    </Suspense>
  );
}
