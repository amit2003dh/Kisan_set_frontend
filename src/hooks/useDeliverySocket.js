import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || "http://localhost:5000", {
  transports: ['websocket', 'polling'],
  upgrade: false
});

export default function useDeliverySocket(deliveryId, onUpdate) {
  useEffect(() => {
    if (!deliveryId) return;

    console.log("🔌 Socket.IO connecting to:", socket.io.uri);
    
    socket.emit("joinDelivery", deliveryId);
    socket.on("locationUpdate", onUpdate);

    return () => {
      socket.off("locationUpdate", onUpdate);
    };
  }, [deliveryId, onUpdate]);
}
