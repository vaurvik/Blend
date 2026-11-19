import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isAdmin } from "@/src/security/auth";
import { sameOrigin, rateLimit } from "@/src/security/request";
import { projectDirectory } from "@/src/projects/storage";
const max = 32 * 1024 * 1024;
export async function POST(request: Request) {
  if (!(await isAdmin())) return new Response(null, { status: 401 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (!rateLimit("upload:global", 30, 60_000))
    return new Response(null, { status: 429 });
  const length = Number(request.headers.get("content-length"));
  if (!length || length > max + 65536)
    return new Response(null, { status: 413 });
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return new Response(null, { status: 400 });
  }
  const file = data.get("file");
  const site = data.get("site");
  if (
    site !== null &&
    (typeof site !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        site,
      ))
  )
    return new Response(null, { status: 400 });
  if (!(file instanceof File) || !file.size || file.size > max)
    return new Response(null, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  let ext = "";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    ext = "png";
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    ext = "jpg";
  else if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    ext = "webp";
  else if (bytes.subarray(4, 8).toString() === "ftyp") ext = "mp4";
  if (!ext)
    return Response.json(
      { error: "Use PNG, JPEG, WebP ou MP4." },
      { status: 400 },
    );
  const dir =
    typeof site === "string"
      ? join(projectDirectory(site), "public", "assets")
      : join(process.env.SHOP_DATA_DIR || join(process.cwd(), "data"), "media");
  await mkdir(dir, { recursive: true });
  const id = `${randomUUID()}.${ext}`;
  await writeFile(join(/*turbopackIgnore: true*/ dir, id), bytes, {
    flag: "wx",
  });
  return Response.json({
    url: `/media/${typeof site === "string" ? `${site}/` : ""}${id}`,
  });
}
