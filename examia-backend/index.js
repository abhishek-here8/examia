import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const app = express();

// --- middleware ---
app.use(express.json({ limit: "10mb" })); // allow base64 image payloads
app.use(
  cors({
    origin: "*", // later you can lock to your frontend URL
  })
);

// --- supabase client (service role) ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- helpers ---
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token && token === process.env.ADMIN_TOKEN) return next();
  return res.status(401).json({ success: false, message: "Unauthorized" });
}

function sanitizeFileName(name = "image.png") {
  // Keep it simple + safe
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function guessContentType(fileName = "", mimeType = "") {
  if (mimeType && mimeType.startsWith("image/")) return mimeType;

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

// --- routes ---
// Health check
app.get("/", (req, res) => {
  res.json({ status: "EXAMIA backend running" });
});

// Admin login (returns token)
app.post("/admin/login", (req, res) => {
  const { email, password } = req.body || {};

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true, token: process.env.ADMIN_TOKEN });
  }

  return res
    .status(401)
    .json({ success: false, message: "Invalid credentials" });
});

// Get questions (PUBLIC)
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

// Add question (ADMIN ONLY)
// NOTE: this expects DB column names: question, solution, solution_image (optional)
app.post("/questions", requireAdmin, async (req, res) => {
  const { subject, year, mode, bucket, question, solution, solution_image } =
    req.body || {};

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
      solution_image: solution_image || null, // make sure column exists (Step 1 SQL)
    },
  ]);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// Delete question (ADMIN ONLY)
app.delete("/questions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("questions").delete().eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Upload solution image (ADMIN ONLY)
// Body: { imageBase64: "...", fileName: "x.png", mimeType?: "image/png" }
// Returns: { success: true, imageUrl: "https://..." }
app.post("/upload-solution-image", requireAdmin, async (req, res) => {
  const { imageBase64, fileName, mimeType } = req.body || {};

  if (!imageBase64 || !fileName) {
    return res.status(400).json({ error: "imageBase64 and fileName required" });
  }

  // Convert base64 to bytes
  let buffer;
  try {
    buffer = Buffer.from(imageBase64, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64" });
  }

  const safeName = sanitizeFileName(fileName);
  const contentType = guessContentType(safeName, mimeType);

  // Save inside bucket "solutions" (you must create bucket & make it Public)
  const filePath = `solutions/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("solutions")
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message });
  }

  // Public URL (bucket must be Public)
  const { data } = supabase.storage.from("solutions").getPublicUrl(filePath);

  return res.json({ success: true, imageUrl: data.publicUrl });
});

// --- start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("EXAMIA backend running on port", PORT);
});
