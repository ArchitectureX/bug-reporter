import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT || 4201);
const root = path.resolve(process.cwd(), "examples/backend-local/public");
const upload = multer({ dest: path.join(root, "uploads") });

app.use(cors());
app.use(express.json());
app.use("/public", express.static(root));

app.post("/api/uploads", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file is required" });
    return;
  }

  const url = `http://localhost:${port}/public/uploads/${req.file.filename}`;
  res.json({ url, key: `uploads/${req.file.filename}` });
});

app.post("/api/bug-reports", (req, res) => {
  res.json({ id: crypto.randomUUID(), message: "received", payload: req.body });
});

app.listen(port, () => {
  console.log(`Local example backend listening on http://localhost:${port}`);
});
