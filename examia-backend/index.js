import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- middleware ----------
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ---------- env ----------
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_TOKEN,
  OPENROUTER_API_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- AI client (OpenRouter) ----------
const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://examia-ygb1.onrender.com",
    "X-Title": "Examia AI Tutor",
  },
});

// ---------- helpers ----------
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  next();
}

function normalizeSubject(subject) {
  return String(subject || "").trim().toLowerCase();
}

function normalizeMode(mode) {
  return String(mode || "").trim().toLowerCase();
}

// ---------- routes ----------
app.get("/", (req, res) => {
  res.send("Examia backend running");
});

// ---------- admin login ----------
app.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      String(email || "").trim() === String(ADMIN_EMAIL || "").trim() &&
      String(password || "").trim() === String(ADMIN_PASSWORD || "").trim()
    ) {
      return res.json({
        success: true,
        token: ADMIN_TOKEN,
      });
    }

    return res.status(401).json({
      success: false,
      error: "Invalid credentials",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Server error",
    });
  }
});

// ---------- get questions ----------
app.get("/questions", async (req, res) => {
  try {
    const subject = normalizeSubject(req.query.subject);
    const year = req.query.year ? Number(req.query.year) : null;
    const mode = normalizeMode(req.query.mode);
    const bucket = String(req.query.bucket || "").trim();

    let query = supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: true });

    if (subject) query = query.eq("subject", subject);
    if (year) query = query.eq("year", year);
    if (mode) query = query.eq("mode", mode);
    if (bucket) query = query.eq("bucket", bucket);

    const { data, error } = await query;

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to fetch questions",
    });
  }
});

// ---------- add question ----------
app.post("/questions", requireAdmin, async (req, res) => {
  try {
    const {
      subject,
      year,
      mode,
      bucket,
      question,
      solution,
      solution_image,
    } = req.body || {};

    if (!subject || !year || !mode || !bucket || !question) {
      return res.status(400).json({
        success: false,
        error: "subject, year, mode, bucket, question are required",
      });
    }

    const row = {
      subject: normalizeSubject(subject),
      year: Number(year),
      mode: normalizeMode(mode),
      bucket: String(bucket).trim(),
      question: String(question).trim(),
      solution: String(solution || "").trim(),
      solution_image: String(solution_image || "").trim() || null,
    };

    const { data, error } = await supabase
      .from("questions")
      .insert([row])
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to add question",
    });
  }
});

// ---------- delete question ----------
app.delete("/questions/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) throw error;

    return res.json({
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to delete question",
    });
  }
});

// ---------- upload solution image ----------
app.post("/upload-solution-image", requireAdmin, async (req, res) => {
  try {
    const { imageBase64, fileName, mimeType } = req.body || {};

    if (!imageBase64 || !fileName || !mimeType) {
      return res.status(400).json({
        success: false,
        error: "imageBase64, fileName, mimeType are required",
      });
    }

    const buffer = Buffer.from(imageBase64, "base64");
    const safeName = `${Date.now()}-${String(fileName).replace(/\s+/g, "-")}`;
    const filePath = `solutions/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("solution-images")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("solution-images")
      .getPublicUrl(filePath);

    return res.json({
      success: true,
      imageUrl: publicUrlData.publicUrl,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Image upload failed",
    });
  }
});

// ---------- AI chat ----------
app.post("/chat", async (req, res) => {
  try {
    const { question, subject } = req.body || {};

    if (!question || String(question).trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Question required",
      });
    }

    // basic related PYQ suggestions from DB
    let suggestedPYQ = [];
    try {
      const subjectNorm = normalizeSubject(subject);
      let pyqQuery = supabase
        .from("questions")
        .select("subject, year, bucket")
        .limit(3);

      if (subjectNorm && subjectNorm !== "general") {
        pyqQuery = pyqQuery.eq("subject", subjectNorm);
      }

      const { data } = await pyqQuery;
      suggestedPYQ = data || [];
    } catch {
      suggestedPYQ = [];
    }

    const completion = await openai.chat.completions.create({
      model: "mistralai/mistral-7b-instruct:free",
      messages: [
        {
          role: "system",
          content:
            "You are EXAMIA AI Tutor for JEE students. Explain clearly, simply, and correctly. Give concise but useful answers. End with 2-3 short study suggestions when helpful.",
        },
        {
          role: "user",
          content: `Subject: ${subject || "general"}\nQuestion: ${question}`,
        },
      ],
    });

    const answer =
      completion?.choices?.[0]?.message?.content || "No answer generated.";

    return res.json({
      success: true,
      answer,
      suggestedPYQ,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Chat failed",
    });
  }
});

// ---------- start ----------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
