"use client";

import dynamic from "next/dynamic";

export const MainContentDynamic = dynamic(
  () => import("./main-content").then((m) => ({ default: m.MainContent })),
  { ssr: false }
);
