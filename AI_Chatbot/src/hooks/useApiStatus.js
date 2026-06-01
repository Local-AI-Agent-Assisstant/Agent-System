import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function useApiStatus() {
    const [apiStatus, setApiStatus] = useState("checking");

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
                setApiStatus(res.ok ? "online" : "offline");
            } catch {
                if (!alive) return;
                setApiStatus("offline");
            }
        };
        ping();
        const interval = setInterval(ping, 4000);
        return () => {
            alive = false;
            clearInterval(interval);
        };
    }, []);
    return { apiStatus };
}