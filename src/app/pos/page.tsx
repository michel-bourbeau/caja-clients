"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function POSPage() {
  useEffect(() => {
    redirect("/dashboard/pos");
  }, []);

  return null;
}
