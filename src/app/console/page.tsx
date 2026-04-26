"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConsolePage() {
  const router = useRouter();

  // Redirect to superadmin login
  useEffect(() => {
    router.push("/superadmin/login");
  }, [router]);

  return null;
}
