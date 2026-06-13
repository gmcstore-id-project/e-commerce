 
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const token = url.searchParams.get("token");
  const state = url.searchParams.get("state");

  if (!token) {
    return new Response("Token tidak ditemukan", { status: 400 });
  }

  let redirectTo = "/";
  if (state) {
    try {
      redirectTo = atob(state) || "/";
      const redirectUrl = new URL(redirectTo);
      if (redirectUrl.hostname !== url.hostname) {
        redirectTo = "/";
      }
    } catch {
      redirectTo = "/";
    }
  }

  const headers = new Headers();
  headers.set("Location", new URL(redirectTo, url.origin).toString());
  headers.append(
    "Set-Cookie",
    `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
  );

  return new Response(null, { status: 302, headers });
}