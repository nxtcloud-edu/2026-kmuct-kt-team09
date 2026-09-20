// GET /api/projects/[id] — 프로젝트 번들 전체를 돌려준다. data는 ProjectBundle.
import { fail, ok } from "@/lib/http";
import { getBundle } from "@/lib/store";

// Next.js 16: params는 Promise다.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const bundle = await getBundle(id);
  if (!bundle) return fail("not found", 404);
  return ok(bundle);
}
