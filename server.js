// KisanSetu Server
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000","https://kisan-set-frontend-71z4.vercel.app"], // Allow your frontend URL
    credentials: true // Allow cookies/headers
}));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Connect to database (non-blocking)
connectDB().catch((err) => {
  console.error("Database connection failed:", err.message);
});

// Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/crops", require("./routes/cropRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/delivery", require("./routes/deliveryRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/gemini", require("./routes/geminiRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));

// Socket.io AFTER middleware
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  socket.on("sendMessage", (msg) => {
    io.emit("receiveMessage", msg);
  });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {

  console.log("Server + Socket.io runnin on port " + PORT);
});
