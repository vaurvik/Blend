import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { projectDirectory } from "@/src/projects/storage";
const types: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
};
export async function serveMedia(
  request: Request,
  file: string,
  site?: string,
) {
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp|mp4)$/.test(file))
    return new Response(null, { status: 404 });
  if (
    site &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      site,
    )
  )
    return new Response(null, { status: 404 });
  const legacyPath = join(
    process.env.SHOP_DATA_DIR || join(process.cwd(), "data"),
    "media",
    ...(site ? [site] : []),
    file,
  );
  try {
    const newPath = site
      ? join(projectDirectory(site), "public", "assets", file)
      : legacyPath;
    const path = await stat(newPath)
      .then(() => newPath)
      .catch(() => legacyPath);
    const info = await stat(path);
    const data = await readFile(path);
    const headers = new Headers({
      "Content-Type": types[file.split(".").pop()!],
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    });
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${info.size}` },
        });
      const start = Number(match[1]),
        end = match[2]
          ? Math.min(Number(match[2]), info.size - 1)
          : info.size - 1;
      if (start > end || start >= info.size)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${info.size}` },
        });
      headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
      headers.set("Content-Length", String(end - start + 1));
      return new Response(data.subarray(start, end + 1), {
        status: 206,
        headers,
      });
    }
    headers.set("Content-Length", String(info.size));
    return new Response(data, { headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}
