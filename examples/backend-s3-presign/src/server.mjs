import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT || 4202);
const root = path.resolve(process.cwd(), "examples/backend-s3-presign/public");
const objectDir = path.join(root, "objects");
const upload = multer({ dest: objectDir });

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/objects", express.static(objectDir));

app.post("/api/presign", (req, res) => {
  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  const uploads = files.map((file) => {
    const key = `${Date.now()}-${file.id}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "-")}`;
    return {
      id: file.id,
      method: "POST",
      uploadUrl: `http://localhost:${port}/upload-form`,
      fields: { key },
      key,
      publicUrl: `http://localhost:${port}/objects/${key}`,
      type: file.type
    };
  });

  res.json({ uploads });
});

app.post("/upload-form", upload.single("file"), (req, res) => {
  if (!req.file || typeof req.body?.key !== "string") {
    res.status(400).json({ error: "missing file or key" });
    return;
  }

  const finalPath = path.join(objectDir, req.body.key);
  import("node:fs/promises")
    .then((fs) => fs.rename(req.file.path, finalPath))
    .then(() => res.status(204).send())
    .catch(() => res.status(500).json({ error: "upload move failed" }));
});

app.post("/api/bug-reports", (req, res) => {
  res.json({ id: crypto.randomUUID(), message: "received", payload: req.body });
});

app.listen(port, () => {
  console.log(`Presign example backend listening on http://localhost:${port}`);
});
