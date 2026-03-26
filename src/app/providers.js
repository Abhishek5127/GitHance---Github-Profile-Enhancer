"use client";

import { SessionProvider } from "next-auth/react";
import { BillingProvider } from "@/app/components/billing/BillingProvider";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <BillingProvider>{children}</BillingProvider>
    </SessionProvider>
  );
}
