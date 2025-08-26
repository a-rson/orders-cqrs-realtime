"use client";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";

export default function OrdersRealtimeClient({
  tenantId,
}: {
  tenantId: string;
}) {
  const router = useRouter();
  useEffect(() => {
    const socket = io("http://localhost:3001", {
      path: "/ws",
      transports: ["websocket"],
      auth: { tenantId },
    });
    const onUpd = () => router.refresh();
    socket.on("order.updated", onUpd);
    return () => {
      socket.off("order.updated", onUpd);
      socket.close();
    };
  }, [tenantId, router]);
  return null;
}
