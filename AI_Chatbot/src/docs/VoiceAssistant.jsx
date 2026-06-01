import { Mic, Volume2, Brain, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FLOW_STEPS = [
    {
        icon: Mic,
        label: "Voice input",
        desc: "Record your request directly through the microphone.",
    },
    {
        icon: Brain,
        label: "Speech recognition",
        desc: "The assistant converts spoken audio into text for processing.",
    },
    {
        icon: Brain,
        label: "AI processing",
        desc: "The request is processed by the AI assistant and connected tools.",
    },
    {
        icon: Volume2,
        label: "Spoken response",
        desc: "Responses are generated and played back as natural speech.",
    },
];

const VOICE_STATES = [
    {
        state: "idle",
        color: "text-neutral-400",
        dot: "bg-neutral-500",
        desc: "Ready to begin voice interaction.",
    },
    {
        state: "listening",
        color: "text-rose-400",
        dot: "bg-rose-500 animate-pulse",
        desc: "Listening for voice input.",
    },
    {
        state: "processing",
        color: "text-violet-400",
        dot: "bg-violet-500",
        desc: "Processing the spoken request.",
    },
    {
        state: "tool execution",
        color: "text-amber-400",
        dot: "bg-amber-500",
        desc: "Executing assistant tools when required.",
    },
    {
        state: "speaking",
        color: "text-sky-400",
        dot: "bg-sky-500",
        desc: "Playing the generated spoken response.",
    },
];

export default function VoiceAssistant() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
                    <Mic size={12} />
                    Voice Mode
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Voice Assistant
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Interact with the assistant using real-time voice input, speech recognition,
                    spoken AI responses, and integrated voice-driven tool execution.
                </p>
            </section>

            {/* Flow */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-6">Voice Processing</h2>
                <div className="flex flex-col gap-0 max-w-2xl">
                    {FLOW_STEPS.map(({ icon: Icon, label, desc }, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                                    <Icon size={15} className="text-sky-400" />
                                </div>
                                {i < FLOW_STEPS.length - 1 && (
                                    <div className="w-px flex-1 bg-zinc-200 dark:bg-neutral-800 my-1" />
                                )}
                            </div>
                            <div className="pb-7">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-0.5">{label}</p>
                                <p className="text-xs text-zinc-500 dark:text-neutral-500 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Voice states */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Voice States</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">
                    The assistant transitions through multiple states while processing voice interactions.
                </p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {VOICE_STATES.map(({ state, color, dot, desc }) => (
                        <div
                            key={state}
                            className="flex items-center gap-4 px-5 py-4 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/40 hover:translate-x-0.5 transition-colors"
                        >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                            <span className={`text-sm font-mono font-medium w-28 shrink-0 ${color}`}>{state}</span>
                            <span className="text-xs text-zinc-600 dark:text-neutral-400">{desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Interface Preview */}

            {/* Activating voice mode */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-4">Using Voice Mode</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {[
                        "Click the waveform icon in the chat input bar to enter voice mode.",
                        "The assistant switches into a dedicated voice interaction interface.",
                        "Start speaking to record your request.",
                        "The assistant processes the request and responds with generated speech.",
                        "Voice interactions can trigger supported assistant tools and actions.",
                        "Press Escape or the close button to exit voice mode.",
                    ].map((step, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <span className="text-xs font-mono text-zinc-500 dark:text-neutral-600 mt-0.5 w-4 shrink-0">{i + 1}.</span>
                            <span className="text-sm text-zinc-700 dark:text-neutral-300">{step}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tool permissions in voice */}
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-4">
                <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">Tool permissions in voice mode</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Voice mode supports tool permission handling, allowing users to approve or deny tool requests during active sessions.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/thinker"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-colors"
                >
                    Next: Thinker Mode <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
