export const metadata = {
  title: "SafePath — Smarter, Safer Journeys",
  description: "Safety-first navigation for cyclists and pedestrians.",
};

import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-sp-bg text-sp-fg antialiased">
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
