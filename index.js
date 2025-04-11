// server/index.js

// 1) Load environment variables first
import dotenv from "dotenv";
dotenv.config();

// 2) Import core dependencies
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";


import bodyParser from "body-parser";

// 4) Import controllers, routes, middleware
import { register, login, update } from "./controllers/auth.js";
import { createPost } from "./controllers/posts.js";
import { authenticationMiddleware } from "./middleware/auth.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/MessageRoutes.js";
import searchRoutes from "./routes/search.js";
// 5) For Socket.io
import { Server } from "socket.io";

// Create Express app
const app = express();

/* ─────────────────────────────────────────────────────────
   SECURITY / HEADERS
   ───────────────────────────────────────────────────────── */
app.use(helmet());
/*
  If you need images or other cross-origin resources,
  you may want to remove or adjust the policy below:
*/
// app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

/* ─────────────────────────────────────────────────────────
   LOGGING
   ───────────────────────────────────────────────────────── */
app.use(morgan("common"));

/* ─────────────────────────────────────────────────────────
   BODY PARSING
   ─────────────────────────────────────────────────────────
   You can remove body-parser and use:
   app.use(express.json({ limit: "30mb" }));
   app.use(express.urlencoded({ limit: "30mb", extended: true }));
   instead, if you prefer.
*/
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

/* ─────────────────────────────────────────────────────────
   CORS
   ─────────────────────────────────────────────────────────
   Make sure to update the origin(s) to match your client(s).
*/
app.use(
  cors({
    origin: ["http://localhost:3000", "http://172.26.8.94:3000"],
    credentials: true,
  })
);

/* ─────────────────────────────────────────────────────────
   ROUTES
   ─────────────────────────────────────────────────────────
   You can define your routes either inline or in separate files.
   Here, you've mixed some inline routes with separate route files.
   That’s fine, but consider consistency (e.g., everything in routes).
*/
// Auth endpoints
app.post("/auth/register", register);
app.post("/auth/login", login);
app.patch("/auth/update/:id", update);

// Post endpoint that requires authentication
app.post("/posts", authenticationMiddleware, createPost);

// Additional route files
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/message", messageRoutes);
app.use("/search", searchRoutes);

// A quick test route to confirm server is up
app.get("/test", (req, res) => {
  res.json({ message: "Server is reachable!" });
});

/* ─────────────────────────────────────────────────────────
   START SERVER
   ───────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;

const start = async () => {
  try {
    if (!MONGO_URL) {
      throw new Error("MONGO_URL is not defined in the .env file");
    }

    // Connect to MongoDB
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // For Mongoose 7+, you can remove these options:
      //   useNewUrlParser, useUnifiedTopology
      // And just do: await mongoose.connect(MONGO_URL)
    });
    console.log("Connected to MongoDB");

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });

    // Initialize Socket.io on the same server instance
    const io = new Server(server, {
      cors: {
        origin: ["http://localhost:3000", "http://172.26.8.94:3000"],
        credentials: true,
      },
    });

    // Track online users for Socket.io
    const onlineUsers = new Map();

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("addUser", (userId) => {
        onlineUsers.set(userId, socket.id);
      });

      socket.on("send-msg", (data) => {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
          socket.to(sendUserSocket).emit("msg-recieve", data.message);
        }
      });
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

// Run the server
start();
