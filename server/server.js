import express from "express";
import cors from "cors";
import connectToSupabase, { supabase } from "./db.js";
import m2ProgramRoutes from './api/routes/m2-program.routes.js';
import requestLogger from './api/middleware/logging.middleware.js';

const app = express();
const PORT = process.env.PORT || 2000;

// CORS Configuration: allow explicit list + any Vercel deployment (*.vercel.app)
const explicitOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? ['https://stadium.joinwebzero.com', 'https://stadium-indol.vercel.app', 'https://stadium-nu.vercel.app']
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'https://stadium-indol.vercel.app', 'https://stadium-nu.vercel.app'];

const allowOrigin = (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin or non-browser
    if (explicitOrigins.includes(origin)) return cb(null, origin);
    if (/^https:\/\/[^/]+\.vercel\.app$/.test(origin)) return cb(null, origin); // echo origin for credentials
    return cb(null, false);
};

app.use(cors({
    origin: allowOrigin,
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

// Root: friendly response so "Cannot GET /" doesn't show
app.get("/", (req, res) => {
    res.status(200).json({
        name: 'Stadium API',
        message: 'Server is running. Use /api/ for endpoints.',
        endpoints: {
            health: '/api/health',
            healthDb: '/api/health/db',
            projects: '/api/m2-program (or /api/projects)',
        },
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: 'OK', message: "Server is running", timestamp: new Date().toISOString() });
});

// Health check that verifies Railway → Supabase (GET /api/health/db)
app.get("/api/health/db", async (req, res) => {
    try {
        const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
        if (error) {
            return res.status(503).json({ status: 'error', message: 'Supabase query failed', error: error.message });
        }
        res.status(200).json({ status: 'OK', message: 'Connected to Supabase', projectsCount: count ?? null });
    } catch (err) {
        console.error('Health DB check failed:', err);
        res.status(503).json({ status: 'error', message: err?.message || 'Supabase connection failed' });
    }
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