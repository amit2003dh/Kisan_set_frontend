import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_API_URL);

export default function useDeliverySocket(deliveryId, onUpdate) {
  useEffect(() => {
    if (!deliveryId) return;

    socket.emit("joinDelivery", deliveryId);
    socket.on("locationUpdate", onUpdate);

    return () => {
      socket.off("locationUpdate", onUpdate);
    };
  }, [deliveryId, onUpdate]);
}
