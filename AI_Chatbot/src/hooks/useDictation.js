import { useState, useRef } from "react";

export function useDictation(onResult) {
    const [isDictating, setIsDictating] = useState(false);
    const recognitionRef = useRef(null);

    const toggleDictation = () => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (!recognitionRef.current) {
            const r = new SpeechRecognition();
            r.lang = "en-US";
            r.continuous = false;
            r.interimResults = false;

            r.onstart = () => setIsDictating(true);
            r.onend = () => {
                setIsDictating(false);
                recognitionRef.current = null;
            };
            r.onerror = (e) => {
                console.warn("Speech recognition error:", e.error);
                setIsDictating(false);
                recognitionRef.current = null;
            };  
            r.onresult = (e) => {
                const t = e.results[0][0].transcript.trim();
                onResult(t);
            };

            recognitionRef.current = r;
        }

        isDictating
            ? recognitionRef.current.stop()
            : recognitionRef.current.start();
    };

    return { isDictating, toggleDictation };
}