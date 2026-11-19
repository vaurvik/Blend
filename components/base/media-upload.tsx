"use client";
import { useState, type ChangeEvent } from "react";
export function MediaUpload({
  onUploaded,
  accept = "image/png,image/jpeg,image/webp,video/mp4",
  siteId,
}: {
  onUploaded: (url: string) => void;
  accept?: string;
  siteId?: string;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      if (siteId) data.set("site", siteId);
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: data,
      });
      if (!res.ok)
        throw new Error(
          "Não foi possível enviar. Use PNG, JPEG, WebP ou MP4 de até 32 MB.",
        );
      const result: { url: string } = await res.json();
      onUploaded(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no envio");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  return (
    <div className="media-upload">
      <label>
        Enviar arquivo{" "}
        <input type="file" accept={accept} disabled={busy} onChange={upload} />
      </label>
      {busy && <small>Enviando…</small>}
      {error && <small className="error">{error}</small>}
    </div>
  );
}
