import Link from "next/link";
import { Suspense } from "react";
import OrdersRealtimeClient from "./realtime-client";

type SP = Record<string, string | string[] | undefined>;

async function fetchList(sp: SP) {
  const url = new URL("http://localhost:3000/api/orders");

  const tenantId = (sp.tenantId as string) ?? "t-123";
  const status = sp.status as string | undefined;
  const buyerEmail = sp.buyerEmail as string | undefined;
  const page = (sp.page as string) ?? "1";
  const limit = (sp.limit as string) ?? "10";

  url.searchParams.set("tenantId", tenantId);
  if (status) url.searchParams.set("status", status);
  if (buyerEmail) url.searchParams.set("buyerEmail", buyerEmail);
  url.searchParams.set("page", page);
  url.searchParams.set("limit", limit);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;              // ← await first
  const tenantId = (sp.tenantId as string) ?? "t-123";

  const data = await fetchList(sp);

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Link className="px-3 py-2 rounded bg-black text-white" href="/orders/new">
          New order
        </Link>
      </div>

      <Suspense>
        <OrdersRealtimeClient tenantId={tenantId} />
      </Suspense>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 text-left">OrderId</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Buyer</th>
            <th className="p-2 text-left">Total</th>
            <th className="p-2 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it: any) => (
            <tr key={it.orderId} className="border-t">
              <td className="p-2">{it.orderId}</td>
              <td className="p-2">{it.status}</td>
              <td className="p-2">{it.buyerEmail}</td>
              <td className="p-2">{it.total}</td>
              <td className="p-2">{it.createdAt}</td>
            </tr>
          ))}
          {data.items.length === 0 && (
            <tr>
              <td className="p-4" colSpan={5}>
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
