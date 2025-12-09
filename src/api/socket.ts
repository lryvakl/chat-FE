import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SERVER_URL;

export const socket = io(socketUrl, {
  autoConnect: false,
});
