"use client";

import { useEffect, useState } from "react";

// VAPID public key (base64url) -> Uint8Array for PushManager.subscribe.
function urlB64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function EnableNotifications() {
  const [status, setStatus] = useState("loading"); // loading|off|on|denied|unsupported
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") setStatus("denied");
        else setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("off");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }
      const vapid = await (await fetch("/api/push/vapid")).json();
      if (!vapid.configured || !vapid.publicKey) {
        setMsg("Push isn't configured on the server yet.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapid.publicKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (res.ok) setStatus("on");
      else setMsg("Couldn't save your subscription.");
    } catch {
      setMsg("Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const d = await res.json();
      setMsg(res.ok ? `Sent to ${d.sent}/${d.devices} device(s) — check your notifications.` : d.error || "Test failed.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="text-xl">🔔</span>
        <div>
          <div className="text-sm font-semibold text-ink">Push notifications</div>
          <div className="text-xs text-ink/55">
            {status === "on" && "On — you'll get habit & medication reminders even when the app is closed."}
            {status === "off" && "Get reminders on this device even when Habitly is closed."}
            {status === "denied" && "Blocked. Enable notifications for this site in your browser settings."}
            {msg && <span className="ml-1 text-accent">{msg}</span>}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {status === "off" && (
          <button onClick={enable} disabled={busy} className="btn-primary px-4 py-1.5">
            {busy ? "Enabling…" : "Enable"}
          </button>
        )}
        {status === "on" && (
          <>
            <button onClick={sendTest} disabled={busy} className="btn-outline px-3 py-1.5">
              Send test
            </button>
            <button onClick={disable} disabled={busy} className="btn-ghost px-3 py-1.5">
              Turn off
            </button>
          </>
        )}
      </div>
    </div>
  );
}
