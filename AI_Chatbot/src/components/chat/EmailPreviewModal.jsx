import { useState, useEffect } from "react";

function EmailPreviewModal({ show, draft, isDark, onClose, onSend }) {
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    useEffect(() => {
        if (!draft) return;
        setTo(draft.to || "");
        setSubject(draft.subject || "");
        setBody(draft.body || "");
    }, [draft]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className={"w-[420px] p-5 rounded-xl " +
                (isDark ? "bg-neutral-800 text-white" : "bg-white text-black")}>

                <h2 className="text-lg font-semibold mb-4">Review Email</h2>

                <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="To"
                    className="w-full mb-2 p-2 rounded bg-neutral-700"
                />

                <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full mb-2 p-2 rounded bg-neutral-700"
                />

                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    className="w-full mb-4 p-2 rounded bg-neutral-700"
                />

                <div className="flex justify-end gap-2">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={() => onSend({ to, subject, body })}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EmailPreviewModal;