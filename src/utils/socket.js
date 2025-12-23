import { io } from "socket.io-client";

const socketURL =
  process.env.NODE_ENV === "production" && process.env.BASE_URL
    ? `wss://${process.env.BASE_URL}`
    : "http://localhost:4000";

export const socket = io(socketURL);
