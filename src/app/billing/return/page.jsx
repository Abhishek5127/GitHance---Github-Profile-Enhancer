import BillingReturnClient from "./BillingReturnClient";

export const metadata = {
  title: "Billing Status",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BillingReturnPage({ searchParams }) {
  const params = await searchParams;
  const orderId = String(params?.order_id || "").trim();

  return <BillingReturnClient orderId={orderId} />;
}
