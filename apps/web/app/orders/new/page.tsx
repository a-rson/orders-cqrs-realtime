"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrderPage() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("alice@example.com");
  const [name, setName] = useState("Alice");
  const [sku, setSku] = useState("SKU-1");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(49.99);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tenantId = "t-123";
    const requestId = crypto.randomUUID();

    let attachment: any = undefined;
    if (file) {
      // 1) presign
      const pres = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      }).then((r) => r.json());

      // 2) PUT file
      await fetch(pres.url, {
        method: "PUT",
        headers: pres.headers,
        body: file,
      });

      attachment = {
        filename: file.name,
        contentType: file.type,
        size: file.size,
        storageKey: pres.storageKey,
      };
    }

    // 3) create order
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        tenantId,
        buyer: { email, name },
        items: [{ sku, qty, price }],
        attachment,
      }),
    }).then((r) => r.json());

    // 4) powrót do listy
    router.push("/orders");
  }

  return (
    <main className="p-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">New Order</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border p-2 w-full"
          placeholder="Buyer email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          placeholder="Buyer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="border p-2"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            className="border p-2 w-24"
            type="number"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || "1"))}
          />
          <input
            className="border p-2 w-32"
            type="number"
            step="0.01"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value || "0"))}
          />
        </div>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button className="px-4 py-2 rounded bg-black text-white">
          Create
        </button>
      </form>
    </main>
  );
}
