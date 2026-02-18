# Local Public Backend

Use `storage.mode = "local-public"`.

The SDK posts multipart form data to `storage.local.uploadEndpoint` with fields:
- `file`
- `id`
- `type`

Expected JSON response:

```json
{ "url": "https://app.example.com/uploads/file.png", "key": "uploads/file.png" }
```

See `examples/backend-local` for a runnable server.
