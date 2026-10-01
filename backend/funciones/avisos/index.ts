// ════════════════════════════════════════════════════════════════════
// La función «avisos» de Supabase (Edge Functions → avisos).
//
// Cada minuto la llama el reloj de la base de datos (backend/avisos.sql)
// cuando hay algún aviso que ya toca. Coge esos avisos, los marca como
// enviados y los manda a los dispositivos apuntados de cada uno, cifrados
// para cada dispositivo (Web Push: RFC 8291 y 8292). Si un dispositivo ya
// no existe (el navegador lo dio de baja), lo borra.
//
// Sin librerías de fuera: el cifrado y la firma son los de la plataforma
// (WebCrypto), así no hay paquetes que se rompan con una actualización.
// La primera vez crea sus claves de firma (VAPID) y las guarda en
// servidor_privado: nadie tiene que copiar ninguna clave a mano.
//
// Al crearla en el panel: desactiva «Verify JWT» (la llama la base de
// datos, con su propia contraseña en la cabecera x-cron).
// ════════════════════════════════════════════════════════════════════

const enBase64Url = (b: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const deBase64Url = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const juntar = (...partes: Uint8Array[]): Uint8Array => {
  const r = new Uint8Array(partes.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of partes) { r.set(x, i); i += x.length; }
  return r;
};
const texto = (s: string): Uint8Array => new TextEncoder().encode(s);
async function hmac(clave: Uint8Array, datos: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", clave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, datos));
}

/* las claves de firma del servidor: la pública la usa la app para apuntar el dispositivo */
export async function crearClavesVapid(): Promise<{ publica: string; privada: string }> {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publica = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const privada = await crypto.subtle.exportKey("jwk", par.privateKey);
  return { publica: enBase64Url(publica), privada: JSON.stringify(privada) };
}

/* el aviso cifrado para un dispositivo (aes128gcm, RFC 8291 y 8188) */
export async function cifrarAviso(datos: Uint8Array, p256dh: string, auth: string,
  sal: Uint8Array = crypto.getRandomValues(new Uint8Array(16))): Promise<Uint8Array> {
  const suPublica = deBase64Url(p256dh), secreto = deBase64Url(auth);
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const miPublica = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const suClave = await crypto.subtle.importKey("raw", suPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: suClave }, par.privateKey, 256));
  const prkClave = await hmac(secreto, compartido);
  const ikm = (await hmac(prkClave, juntar(texto("WebPush: info\0"), suPublica, miPublica, new Uint8Array([1])))).slice(0, 32);
  const prk = await hmac(sal, ikm);
  const cek = (await hmac(prk, juntar(texto("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, juntar(texto("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, juntar(datos, new Uint8Array([2]))));
  return juntar(sal, new Uint8Array([0, 0, 16, 0]), new Uint8Array([miPublica.length]), miPublica, cifrado);
}

/* la firma que dice al servicio de avisos del navegador que el aviso es nuestro (VAPID, RFC 8292) */
export async function cabeceraVapid(endpoint: string, publica: string, privada: string, contacto = "mailto:hola@gritnook.com"): Promise<string> {
  const cab = enBase64Url(texto(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const cuerpo = enBase64Url(texto(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contacto })));
  const k = await crypto.subtle.importKey("jwk", JSON.parse(privada), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const firma = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, texto(cab + "." + cuerpo)));
  return "vapid t=" + cab + "." + cuerpo + "." + enBase64Url(firma) + ", k=" + publica;
}

export async function mandarAviso(disp: { endpoint: string; p256dh: string; auth: string }, datos: object,
  vapid: { publica: string; privada: string }, urgente = false): Promise<number> {
  const r = await fetch(disp.endpoint, {
    method: "POST",
    headers: {
      TTL: "3600", Urgency: urgente ? "high" : "normal",
      "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream",
      Authorization: await cabeceraVapid(disp.endpoint, vapid.publica, vapid.privada),
    },
    body: await cifrarAviso(texto(JSON.stringify(datos)), disp.p256dh, disp.auth),
  });
  await r.body?.cancel();
  return r.status;
}

// ── lo que hace la función ──────────────────────────────────────────
/* la clave del servidor: la nueva (sb_secret_…) si está, o la antigua */
function claveServidor(): { apikey: string; bearer: string } {
  try {
    const nuevas = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const k = nuevas.default || Object.values(nuevas)[0];
    if (typeof k === "string" && k) return { apikey: k, bearer: "" };
  } catch (_) { /* sigue con la antigua */ }
  const vieja = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return { apikey: vieja, bearer: vieja };
}
const BASE = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "") + "/rest/v1/";
async function bd(ruta: string, metodo = "GET", cuerpo?: unknown, prefer = "return=representation"): Promise<any> {
  const k = claveServidor();
  const cab: Record<string, string> = { apikey: k.apikey, "Content-Type": "application/json", Prefer: prefer };
  if (k.bearer) cab.Authorization = "Bearer " + k.bearer;
  const r = await fetch(BASE + ruta, { method: metodo, headers: cab, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const t = await r.text();
  if (!r.ok) throw new Error("base de datos " + r.status + ": " + t.slice(0, 300));
  return t ? JSON.parse(t) : null;
}
const leer = async (clave: string): Promise<string> =>
  ((await bd("servidor_privado?select=valor&clave=eq." + clave))[0] || {}).valor || "";

Deno.serve(async (req) => {
  try {
    const cron = await leer("cron");
    if (!cron || req.headers.get("x-cron") !== cron) return new Response("no", { status: 401 });

    let vapid = { publica: await leer("vapid_publica"), privada: await leer("vapid_privada") };
    if (!vapid.publica || !vapid.privada) {
      vapid = await crearClavesVapid();
      await bd("servidor_privado?on_conflict=clave", "POST", [{ clave: "vapid_publica", valor: vapid.publica }, { clave: "vapid_privada", valor: vapid.privada }],
        "resolution=merge-duplicates,return=minimal");
    }

    /* se cogen y se marcan a la vez: si dos llamadas se pisan, ninguno sale dos veces */
    const ahora = new Date().toISOString();
    const avisos: { usuario: string; clave: string; titulo: string; cuerpo: string; url: string }[] =
      await bd("avisos?enviado=is.null&cuando=lte." + encodeURIComponent(ahora) + "&select=usuario,clave,titulo,cuerpo,url", "PATCH", { enviado: ahora });
    if (!avisos.length) return Response.json({ avisos: 0, enviados: 0 });

    const usuarios = [...new Set(avisos.map((a) => a.usuario))];
    const disps: { endpoint: string; usuario: string; p256dh: string; auth: string }[] =
      await bd("push_suscripciones?select=endpoint,usuario,p256dh,auth&usuario=in.(" + usuarios.join(",") + ")");
    let enviados = 0;
    const muertos = new Set<string>();
    await Promise.all(avisos.map(async (a) => {
      for (const d of disps.filter((x) => x.usuario === a.usuario)) {
        try {
          const estado = await mandarAviso(d, { clave: a.clave, titulo: a.titulo, cuerpo: a.cuerpo, url: a.url }, vapid, a.clave.startsWith("reloj-"));
          if (estado === 404 || estado === 410) muertos.add(d.endpoint);
          else if (estado >= 200 && estado < 300) enviados++;
        } catch (_) { /* un dispositivo que no responde no para a los demás */ }
      }
    }));
    if (muertos.size) {
      const lista = "(" + [...muertos].map((e) => '"' + e.replace(/"/g, "") + '"').join(",") + ")";
      await bd("push_suscripciones?endpoint=in." + encodeURIComponent(lista), "DELETE", undefined, "return=minimal");
    }
    return Response.json({ avisos: avisos.length, enviados, borrados: muertos.size });
  } catch (e) {
    console.error(e);
    return new Response(String(e && (e as Error).message || e), { status: 500 });
  }
});
