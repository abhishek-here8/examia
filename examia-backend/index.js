import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const app = express();
app.use(express.json());

// ✅ CORS (allow your frontend)
app.use(
  cors({
    origin: "https://examia-ygb1.onrender.com"
  })
);

// Supabase connection (from Render env vars)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "EXAMIA backend running" });
});

// ✅ Simple auth middleware for admin-only routes
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token && token === process.env.ADMIN_TOKEN) return next();
  return res.status(401).json({ success: false, message: "Unauthorized" });
}

// ===== ADMIN LOGIN =====
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // ✅ Return token (not visible in inspect until login)
    return res.json({ success: true, token: process.env.ADMIN_TOKEN });
  }

  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ===== GET QUESTIONS (PUBLIC) =====
app.get("/questions", async (req, res) => {
  const { subject, year, mode, bucket } = req.query;

  let query = supabase.from("questions").select("*");

  if (subject) query = query.eq("subject", subject);
  if (year) query = query.eq("year", Number(year));
  if (mode) query = query.eq("mode", mode);
  if (bucket) query = query.eq("bucket", bucket);

  const { data, error } = await query.order("created_at");

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ===== ADD QUESTION (ADMIN ONLY) =====
app.post("/questions", requireAdmin, async (req, res) => {
  const { subject, year, mode, bucket, question, solution } = req.body;

  if (!subject || !year || !mode || !bucket || !question) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { error } = await supabase.from("questions").insert([
    {
      subject,
      year: Number(year),
      mode,
      bucket,
      question,
      solution: solution || null,
    },
  ]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== DELETE QUESTION (ADMIN ONLY) =====
app.delete("/questions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("EXAMIA backend running on port", PORT));
