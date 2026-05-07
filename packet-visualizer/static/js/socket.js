import { io } from "https://cdn.socket.io/4.8.3/socket.io.esm.min.js";
import { handleBatch} from "./graph.js";

const socket = io();

socket.on("connect", () => {
  console.log("Connected to server");
});

socket.on("packet_batch", (data) => {
  console.log("Received batch data:", data);
  handleBatch(data);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});