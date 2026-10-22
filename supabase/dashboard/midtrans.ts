// supabase/functions/_shared/midtrans-handler.js
function createMidtransHandler({ env, fetcher = fetch }) {
  const url = env("SUPABASE_URL");
  const secret = env("TANJ_SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = env("SUPABASE_ANON_KEY");
  const key = env("MIDTRANS_SERVER_KEY");
  const clientKey = env("MIDTRANS_CLIENT_KEY") || "";
  const production = env("MIDTRANS_IS_PRODUCTION") === "true";
  const ready = Boolean(key && url && secret && publicKey);
  const enabled = env("MIDTRANS_ENABLED") === "true" && ready;
  const snapHost = production ? "app.midtrans.com" : "app.sandbox.midtrans.com";
  const apiHost = production ? "api.midtrans.com" : "api.sandbox.midtrans.com";
  const site = env("TANJ_SITE_URL") || "https://firhamm52-prog.github.io/tanj/";
  const origins = (env("TANJ_ALLOWED_ORIGINS") || "https://firhamm52-prog.github.io").split(",").map((x) => x.trim());
  const fail = (status, message) => {
    throw Object.assign(Error(message), { status });
  };
  async function rpc(name, body, token) {
    const credential = token ? publicKey : secret;
    const r = await fetcher(url + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        apikey: credential,
        "Content-Type": "application/json",
        ...token ? { Authorization: token } : secret.startsWith("eyJ") ? { Authorization: "Bearer " + secret } : {}
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12e3)
    });
    const d = await r.json();
    if (!r.ok) {
      let message = String(d.message || "Unknown database error");
      for (const credential2 of [secret, key, publicKey])
        if (credential2) message = message.split(credential2).join("[redacted]");
      console.warn("Midtrans database request rejected", {
        rpc: name,
        operation: body.operation || "prepare",
        httpStatus: r.status,
        code: d.code,
        message: message.slice(0, 1e3)
      });
      fail(
        409,
        token ? d.message || "Pesanan belum dapat diproses." : "Status pembayaran belum dapat disimpan. Coba periksa lagi."
      );
    }
    return d;
  }
  async function provider(host, path, body) {
    const r = await fetcher("https://" + host + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Basic " + btoa(key + ":"),
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      ...body ? { body: JSON.stringify(body) } : {},
      signal: AbortSignal.timeout(18e3)
    });
    const d = await r.json();
    if (host === apiHost && r.status === 404 && String(d.status_code) === "404")
      return { notStarted: true };
    if (!r.ok || d.status_code && Number(d.status_code) >= 400) {
      const messages = Array.isArray(d.error_messages) ? d.error_messages.join("; ") : "";
      console.warn("Midtrans provider rejected request", {
        httpStatus: r.status,
        providerStatus: d.status_code,
        errors: messages.split(key).join("[redacted]").slice(0, 1e3)
      });
      const rejected = [400, 401, 403, 422].includes(r.status) && !/already|taken|duplicate|exist|paid|utilized|digunakan/i.test(messages);
      throw Object.assign(
        Error(
          "Midtrans belum dapat memproses pembayaran. Coba lagi atau hubungi admin dengan nomor pesanan."
        ),
        {
          status: 502,
          creationRejected: rejected,
          duplicateOrder: /already|taken|duplicate|utilized|digunakan/i.test(messages)
        }
      );
    }
    return d;
  }
  const limits = /* @__PURE__ */ new Map();
  return async (request) => {
    const origin = request.headers.get("origin");
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      ...origins.includes(origin) ? { "Access-Control-Allow-Origin": origin } : {}
    };
    const json = (status, d) => new Response(JSON.stringify(d), { status, headers });
    try {
      if (origin && !origins.includes(origin)) fail(403, "Origin tidak diizinkan.");
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
      const path = new URL(request.url).pathname;
      if (request.method === "GET" && path.endsWith("/notification"))
        return json(200, {
          reachable: true,
          message: "Payment notifications require a signed POST."
        });
      if (request.method === "GET" && path.endsWith("/config"))
        return json(200, { enabled, production });
      if (!ready) fail(503, "Pembayaran Midtrans belum dikonfigurasi.");
      if (path.endsWith("/start") && !enabled) fail(503, "Pembayaran Midtrans belum aktif.");
      if (request.method !== "POST") fail(405, "Gunakan POST.");
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        fail(415, "Gunakan JSON.");
      const reader = request.body?.getReader();
      let raw = "";
      let bytes = 0;
      const decoder = new TextDecoder();
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 32768) {
            await reader.cancel();
            fail(413, "Data terlalu besar.");
          }
          raw += decoder.decode(value, { stream: true });
        }
      raw += decoder.decode();
      let input;
      try {
        input = JSON.parse(raw);
      } catch {
        fail(400, "JSON tidak valid.");
      }
      const webhook = path.endsWith("/notification");
      if (!webhook && !path.endsWith("/start") && !path.endsWith("/status"))
        fail(404, "Endpoint tidak ditemukan.");
      const oid = webhook ? input.order_id : input.orderId;
      if (webhook && typeof oid === "string" && !oid.startsWith("TANJ-"))
        return json(200, { received: true, ignored: true });
      if (typeof oid !== "string" || !/^TANJ-[A-F0-9-]{36}$/.test(oid))
        fail(422, "Nomor pesanan tidak valid.");
      let token;
      if (webhook) {
        if (typeof input.signature_key !== "string") fail(401, "Signature diperlukan.");
        const digest = await crypto.subtle.digest(
          "SHA-512",
          new TextEncoder().encode(
            oid + String(input.status_code) + String(input.gross_amount) + key
          )
        );
        const expected = Array.from(
          new Uint8Array(digest),
          (x) => x.toString(16).padStart(2, "0")
        ).join("");
        if (input.signature_key.length !== 128) fail(401, "Signature tidak valid.");
        let diff = 0;
        for (let i = 0; i < 128; i++)
          diff |= expected.charCodeAt(i) ^ input.signature_key.charCodeAt(i);
        if (diff) fail(401, "Signature tidak valid.");
      } else {
        token = request.headers.get("authorization");
        if (!/^Bearer \S+$/.test(token || "") || token.length > 8192)
          fail(401, "Login untuk membayar.");
        const r = await fetcher(url + "/auth/v1/user", {
          headers: { apikey: publicKey, Authorization: token },
          signal: AbortSignal.timeout(8e3)
        });
        if (!r.ok) fail(401, "Sesi berakhir. Login kembali.");
        const user = await r.json();
        if (!user.id) fail(401, "Login terlebih dahulu.");
        for (const [id, l2] of limits) if (l2.until < Date.now()) limits.delete(id);
        const l = limits.get(user.id) || { count: 0, until: Date.now() + 6e4 };
        if (++l.count > 12) fail(429, "Tunggu satu menit sebelum mencoba lagi.");
        limits.set(user.id, l);
        const rr = await fetcher(
          url + "/rest/v1/tb_t_order?select=id&id=eq." + encodeURIComponent(oid),
          {
            headers: { apikey: publicKey, Authorization: token },
            signal: AbortSignal.timeout(8e3)
          }
        );
        if (!rr.ok || !(await rr.json()).some((o) => o.id === oid))
          fail(404, "Pesanan tidak ditemukan.");
      }
      if (path.endsWith("/start")) {
        const prepared = await rpc("tanj_midtrans_prepare", { oid }, token);
        if (prepared.redirect_url)
          return json(200, {
            redirectUrl: prepared.redirect_url,
            snapToken: prepared.snap_token,
            clientKey,
            production
          });
        const o = prepared.order;
        const finish = new URL(site);
        finish.searchParams.set("order", oid);
        finish.hash = "pesanan";
        const remaining = Math.max(
          1,
          Math.min(1440, Math.floor((Number(o.deadline) - Date.now()) / 6e4))
        );
        let d2;
        try {
          d2 = await provider(snapHost, "/snap/v1/transactions", {
            transaction_details: { order_id: oid, gross_amount: o.total },
            enabled_payments: ["bank_transfer", "cimb_va", "danamon_va", "bsi_va", "other_qris"],
            permata_va: { recipient_name: "TANJ INDONESIA" },
            customer_details: {
              first_name: o.customer.name,
              email: o.customer.email,
              phone: o.customer.phone
            },
            callbacks: { finish: finish.href },
            expiry: {
              start_time: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " +0000"),
              unit: "minutes",
              duration: remaining
            }
          });
        } catch (e) {
          if (e.duplicateOrder) {
            const existing = await provider(apiHost, "/v2/" + encodeURIComponent(oid) + "/status");
            if (!existing.notStarted) {
              const result2 = await rpc("tanj_midtrans_gateway", {
                oid,
                operation: "status",
                details: existing
              });
              return json(200, { ...result2, paymentPending: result2.status !== "PAID" });
            }
          }
          if (e.creationRejected) {
            try {
              await rpc("tanj_midtrans_gateway", {
                oid,
                operation: "creation_rejected",
                details: { attemptId: prepared.attemptId }
              });
            } catch {
              console.warn("Midtrans reservation release requires admin follow-up");
            }
          }
          throw e;
        }
        const redirect = new URL(d2.redirect_url);
        if (redirect.protocol !== "https:" || redirect.hostname !== snapHost || !redirect.pathname.startsWith("/snap/"))
          fail(502, "Tautan Midtrans tidak valid.");
        await rpc("tanj_midtrans_gateway", {
          oid,
          operation: "redirect",
          details: { url: redirect.href, token: d2.token || null, attemptId: prepared.attemptId }
        });
        return json(200, { redirectUrl: redirect.href, snapToken: d2.token, clientKey, production });
      }
      const d = await provider(apiHost, "/v2/" + encodeURIComponent(oid) + "/status");
      if (d.notStarted) return json(200, { status: "WAITING_PAYMENT", notStarted: true });
      if (d.order_id !== oid || !/^\d+(?:\.00)?$/.test(String(d.gross_amount)) || d.currency && d.currency !== "IDR")
        fail(422, "Detail pembayaran tidak valid.");
      const result = await rpc("tanj_midtrans_gateway", {
        oid,
        operation: "status",
        details: {
          order_id: d.order_id,
          gross_amount: d.gross_amount,
          currency: d.currency || "IDR",
          transaction_status: d.transaction_status,
          fraud_status: d.fraud_status || "",
          transaction_id: d.transaction_id
        }
      });
      return json(200, result);
    } catch (e) {
      console.warn("Midtrans request rejected", {
        method: request.method,
        status: e.status || 503
      });
      return json(e.status || 503, {
        error: e.status ? e.message : "Layanan pembayaran belum merespons. Coba lagi."
      });
    }
  };
}

// supabase/functions/midtrans/index.ts
Deno.serve(createMidtransHandler({ env: (name) => Deno.env.get(name) }));
