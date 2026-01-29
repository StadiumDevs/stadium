import express from "express";
import cors from "cors";
import connectToSupabase from "./db.js";
import m2ProgramRoutes from './api/routes/m2-program.routes.js';
import requestLogger from './api/middleware/logging.middleware.js';

const app = express();
const PORT = process.env.PORT || 2000;

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? ['https://stadium.joinwebzero.com', 'https://stadium-indol.vercel.app']
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'https://stadium-indol.vercel.app'];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-siws-auth'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes
app.use('/api/m2-program', m2ProgramRoutes);

// Backward compatibility: Keep old /api/projects route as alias
// TODO: Remove after frontend migration is stable
app.use('/api/projects', m2ProgramRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: 'OK', message: "Server is running", timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("❌ Unhandled Error:", err);
    res.status(500).json({ status: "error", message: "An unexpected error occurred." });
});

const startServer = async () => {
    try {
        await connectToSupabase();
        app.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Error starting server:", error);
        process.exit(1);
    }
}

await startServer();

export default app;