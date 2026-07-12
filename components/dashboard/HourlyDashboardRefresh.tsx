"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HourlyDashboardRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}
