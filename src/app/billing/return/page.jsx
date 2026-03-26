import BillingReturnClient from "./BillingReturnClient";

export const metadata = {
  title: "Billing Status",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BillingReturnPage() {
  return <BillingReturnClient />;
}
