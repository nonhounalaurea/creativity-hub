import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

function redirectTo(request: NextRequest, pathname: string, from?: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const res = NextResponse.redirect(url);
  // mantiene gli eventuali cookie di sessione rinfrescati
  from?.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export async function middleware(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/login";
  let response = NextResponse.next({ request });

  // senza configurazione nessuno può essere autenticato
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return isLogin ? response : redirectTo(request, "/login");
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() verifica il token col server Auth (non fidarsi del solo cookie)
  let user = null;
  try {
    user = (await supabase.auth.getUser()).data.user;
  } catch {
    user = null;
  }

  if (!user && !isLogin) return redirectTo(request, "/login", response);
  if (user && isLogin) return redirectTo(request, "/create", response);
  return response;
}

export const config = {
  // tutte le rotte tranne asset statici e file con estensione
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)"],
};
