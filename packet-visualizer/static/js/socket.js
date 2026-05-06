import { io } from "https://cdn.socket.io/4.8.3/socket.io.esm.min.js";
import { handlePacket } from "./graph.js";

const socket = io();

socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("new_packet", (data) => {
  console.log("Received packet data:", data);
  handlePacket(data);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});