export const dynamic = "force-dynamic";

import { Suspense } from "react";
import NavigationClient from "./NavigationClient";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

export default function NavigationPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <main className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 dark:border-white mx-auto mb-4"></div>
              <p>Loading navigation...</p>
            </div>
          </main>
        }
      >
        <NavigationClient />
      </Suspense>
    </ProtectedRoute>
  );
}
