import { serveMedia } from "@/src/media/serve";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string; asset: string }> },
) {
  const { file, asset } = await params;
  return serveMedia(request, asset, file);
}
