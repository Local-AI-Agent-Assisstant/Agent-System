import { useState } from "react";
import { Mail, Send, AtSign, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import EmailPreview from "../../assets/email-preview.mp4";

const CAPABILITIES = [
    { icon: Send, title: "Compose & Send", desc: "Draft and send emails from natural language, including subject, body, and recipients." },
    { icon: AtSign, title: "Email Delivery", desc: "Emails are delivered through the configured email provider connected to the assistant." },
    { icon: ShieldCheck, title: "Confirmation Gate", desc: "Generated emails are displayed for review and approval before delivery." },
];

const EXAMPLE_QUERIES = [
    { phrase: "Send an email to [EMAIL_ADDRESS] about the meeting tomorrow", result: "Drafts and presents email for confirmation" },
    { phrase: "Email my team that the deadline is extended to Friday", result: "Composes a team notification email" },
    { phrase: "Write a thank-you email to the client and send it", result: "Generates polite email and awaits approval" },
    { phrase: "Send a follow-up email to [EMAIL_ADDRESS] about the proposal", result: "Creates a context-aware follow-up draft" },
];

export default function Email() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="space-y-14">
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                    <Mail size={12} /> Email Assistant
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">Send Email</h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Draft, review, edit, and send emails directly through the assistant with confirmation required before delivery.
                </p>
            </section>

            {/* Capablities */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-amber-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Available Functions</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Function</span><span className="pl-6">Description</span>
                    </div>
                    {[
                        {
                            name: "Send Email",
                            desc: "Compose, review, and send emails through the configured email provider.",
                        },
                        {
                            name: "Edit Email",
                            desc: "Modify generated email drafts before confirmation and delivery.",
                        },
                    ].map(({ name, desc }) => (
                        <div
                            key={name}
                            className="grid grid-cols-[1fr_2fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm font-mono text-amber-300">{name}</span>

                            <span className="text-xs text-zinc-600 dark:text-neutral-400 pl-6">
                                {desc}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Interface Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Interface Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Preview of the email drafting, editing, and confirmation workflow inside the interface.
                    </p>
                </div>

                <div
                    onClick={() => setIsOpen(true)}
                    className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer"
                >
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        controls={false}
                        controlsList="nodownload nofullscreen noremoteplayback"
                        className="w-full object-cover pointer-events-none transition-transform duration-300 hover:scale-[1.01]"
                    >
                        <source src={EmailPreview} type="video/mp4" />
                    </video>
                </div>
            </section>

            {/* Fullscreen Preview */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        className="w-auto h-auto max-w-[85vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                    >
                        <source src={EmailPreview} type="video/mp4" />
                    </video>
                </div>
            )}

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Example Usage</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">Example prompts that trigger the email tool.</p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-amber-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Example Prompt</span><span>Assistant Response</span>
                    </div>
                    {EXAMPLE_QUERIES.map(({ phrase, result }, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4">
                            <span className="text-sm text-zinc-800 dark:text-neutral-200 font-mono">&ldquo;{phrase}&rdquo;</span>
                            <span className="text-xs text-zinc-500 dark:text-neutral-500 text-right whitespace-nowrap">{result}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">Confirmation Required</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Emails require explicit user approval before delivery. The generated message is always displayed for review and editing.
                    </p>
                </div>
            </section>

            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link to="/docs/tools/weather" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all">
                    Next: Weather <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
