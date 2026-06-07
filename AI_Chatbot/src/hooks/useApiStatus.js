import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// /api/health was never the spam source — the real culprits (permissions, model,
// voices, providers) are all fixed separately. Health can poll every 5 s safely:
// fast enough to detect server going down within ~6.5 s (5 s interval + 1.5 s timeout),
// without causing any of the original cascade noise.
const POLL_INTERVAL = 5_000; // 5 seconds

export function useApiStatus() {
    const [apiStatus, setApiStatus] = useState("checking");
    const statusRef = useRef("checking"); // track last known value to avoid redundant state updates

    useEffect(() => {
        let alive = true;
        const HEALTH_URL = `${API_BASE}/api/health`;

        const ping = async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 1500);
                const res = await fetch(HEALTH_URL, {
                    method: "GET",
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                if (!alive) return;
                const next = res.ok ? "online" : "offline";
                // Only call setApiStatus when the value actually changes — prevents
                // downstream useEffects (permissions sync etc.) from re-firing
                if (next !== statusRef.current) {
                    statusRef.current = next;
                    setApiStatus(next);
                }
            } catch {
                if (!alive) return;
                if (statusRef.current !== "offline") {
                    statusRef.current = "offline";
                    setApiStatus("offline");
                }
            }
        };

        ping(); // immediate check on mount
        const interval = setInterval(ping, POLL_INTERVAL);

        return () => {
            alive = false;
            clearInterval(interval);
        };
    }, []);

    return { apiStatus };
}
