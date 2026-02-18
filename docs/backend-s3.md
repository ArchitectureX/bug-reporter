# S3 Presigned Backend

Use `storage.mode = "s3-presigned"` and provide a `presignEndpoint`.

Expected request body:

```json
{
  "files": [{ "id": "...", "name": "...", "type": "screenshot", "mimeType": "image/png", "size": 1234 }]
}
```

Expected response:

```json
{
  "uploads": [
    {
      "id": "...",
      "method": "PUT",
      "uploadUrl": "https://bucket.s3.amazonaws.com/key",
      "headers": { "content-type": "image/png" },
      "key": "reports/...",
      "publicUrl": "https://cdn.example.com/reports/...",
      "type": "screenshot"
    }
  ]
}
```

See `examples/backend-s3-presign` for a runnable reference server.
