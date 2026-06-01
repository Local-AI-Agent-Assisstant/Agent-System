import { CloudSun, Umbrella, Thermometer, MapPinned, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import WeatherPreview from "../../assets/weather-preview.png";

const FEATURES = [
    {
        icon: CloudSun,
        title: "Live Forecasts",
        desc: "View current conditions and multi-day weather forecasts in real time.",
    },
    {
        icon: MapPinned,
        title: "Location Awareness",
        desc: "Retrieve weather information based on cities, regions, or your current location.",
    },
    {
        icon: Umbrella,
        title: "Smart Recommendations",
        desc: "Receive contextual suggestions based on weather conditions and forecasts.",
    },
    {
        icon: Thermometer,
        title: "Detailed Conditions",
        desc: "Monitor temperature, precipitation, humidity, wind, and forecast trends.",
    },
];

const EXAMPLES = [
    {
        prompt: "What's the weather today?",
        result: "Shows current local weather conditions",
    },
    {
        prompt: "Will it rain tomorrow in Istanbul?",
        result: "Displays tomorrow's forecast and precipitation chance",
    },
    {
        prompt: "Should I take an umbrella today?",
        result: "Provides contextual weather recommendations",
    },
    {
        prompt: "Show me the weekly forecast",
        result: "Displays the multi-day weather outlook",
    },
];

export default function WeatherGuide() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
                    <CloudSun size={12} />
                    Weather Intelligence
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Weather Tool
                </h1>

                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Get real-time weather forecasts, live conditions, location-aware insights,
                    and AI-generated recommendations directly through the AI assistant.
                </p>
            </section>

            {/* Weather Features */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">
                    Weather Features
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-sky-400" />
                            </div>

                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">
                                {title}
                            </p>

                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                                {desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Interface Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Preview of the weather interface and AI-generated recommendations.
                    </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <img
                        src={WeatherPreview}
                        alt="Weather tool preview"
                        className="w-full object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.015]"
                    />
                </div>
            </section>

            {/* Smart Recommendations */}
            <section className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
                <div className="flex items-start gap-3">
                    <Sparkles size={16} className="text-sky-400 shrink-0 mt-0.5" />

                    <div>
                        <p className="text-sm font-medium text-sky-300 mb-1">
                            Smart Recommendations
                        </p>

                        <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                            The assistant can generate contextual recommendations based on weather conditions,
                            including clothing suggestions, outdoor activity advice, and rain or heat alerts.
                        </p>
                    </div>
                </div>
            </section>

            {/* Example Requests */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">
                    Example Requests
                </h2>

                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">
                    Example weather requests supported by the assistant.
                </p>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-sky-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>User Request</span>
                        <span>Assistant Response</span>
                    </div>

                    {EXAMPLES.map(({ prompt, result }, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1fr_auto] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm text-zinc-800 dark:text-neutral-200 font-mono">
                                &ldquo;{prompt}&rdquo;
                            </span>

                            <span className="text-xs text-zinc-500 dark:text-neutral-500 text-right whitespace-nowrap">
                                {result}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer Note */}
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-start gap-3">
                    <Umbrella size={16} className="text-amber-400 shrink-0 mt-0.5" />

                    <div>
                        <p className="text-sm font-medium text-amber-300 mb-1">
                            Weather Accuracy
                        </p>

                        <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                            Weather data depends on external forecast providers and may vary slightly
                            based on region, update timing, and network availability.
                        </p>
                    </div>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/tools/calculator"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all"
                >
                    Next: Calculator <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}