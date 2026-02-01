import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// Supabase connection (values will come from Render env vars)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "EXAMIA backend running" });
});

// ===== ADMIN LOGIN =====
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ===== GET QUESTIONS =====
app.get("/questions", async (req, res) => {
  const { subject, year, mode, bucket } = req.query;

  let query = supabase.from("questions").select("*");

  if (subject) query = query.eq("subject", subject);
  if (year) query = query.eq("year", year);
  if (mode) query = query.eq("mode", mode);
  if (bucket) query = query.eq("bucket", bucket);

  const { data, error } = await query.order("created_at");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ===== ADD QUESTION =====
app.post("/questions", async (req, res) => {
  const { subject, year, mode, bucket, question, solution } = req.body;

  const { data, error } = await supabase.from("questions").insert([
    { subject, year, mode, bucket, question, solution }
  ]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

// ===== DELETE QUESTION =====
app.delete("/questions/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("questions").delete().eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("EXAMIA backend running on port", PORT);
});
