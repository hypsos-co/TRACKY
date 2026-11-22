import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

/**
 * Sign-out is a plain form POST to this Route Handler (not a Server Action) so
 * the browser performs a full document navigation afterwards. With Cache
 * Components, Next.js keeps recently visited pages alive (hidden) in the DOM;
 * a full reload guarantees no signed-in UI survives the logout.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL(ROUTES.login, request.nextUrl.origin), { status: 303 });
}
