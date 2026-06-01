import { Calculator as CalcIcon, Hash, Percent, ArrowRight, Sigma } from "lucide-react";
import { Link } from "react-router-dom";
import calculatorPreview from "../../assets/calculator-preview.png";

const CAPABILITIES = [
    {
        icon: Hash,
        title: "Arithmetic",
        desc: "Handles arithmetic operations, formulas, percentages, and complex mathematical expressions.",
    },
    {
        icon: Sigma,
        title: "Advanced Math",
        desc: "Supports algebra, roots, logarithms, trigonometric functions, and advanced calculations.",
    },
    {
        icon: Percent,
        title: "Unit Conversion",
        desc: "Convert between measurement units, temperatures, time formats, and other supported units.",
    },
    {
        icon: CalcIcon,
        title: "Currency Conversion",
        desc: "Convert between supported currencies using live exchange rate information.",
    },
];

const EXAMPLE_QUERIES = [
    { phrase: "What is 15% of 340?", result: "Returns 51" },
    { phrase: "Solve (3x + 7) / 2 = 11", result: "Returns x = 5" },
    { phrase: "Convert 72°F to Celsius", result: "Returns 22.2°C" },
    { phrase: "What's the square root of 1764?", result: "Returns 42" },
    { phrase: "Calculate the area of a circle with radius 8 meters", result: "Returns ≈ 201.06 sq units" },
    { phrase: "Convert 3 days into seconds", result: "Returns 259,200 seconds" },
];

const FUNCTIONS = [
    {
        name: "calculate",
        desc: "Evaluate mathematical expressions, formulas, equations, and advanced calculations.",
    },
    {
        name: "convert units",
        desc: "Convert between supported measurement units, temperatures, time formats, and quantities.",
    },
    {
        name: "convert currency",
        desc: "Convert between measurement systems, temperatures, time formats, and supported quantities.",
    },
];

export default function Calculator() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <CalcIcon size={12} />
                    Calculation Engine
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Calculator & Conversion
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Solve equations, evaluate mathematical expressions, and perform unit or currency conversions through the AI assistant.
                </p>
            </section>

            {/* Capabilities */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-emerald-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tool Functions */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">
                    Tool Functions
                </h2>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[0.9fr_2.1fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Function</span>
                        <span className="pl-6">Description</span>
                    </div>

                    {FUNCTIONS.map(({ name, desc }) => (
                        <div
                            key={name}
                            className="grid grid-cols-[0.9fr_2.1fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm font-mono text-emerald-300">
                                {name}
                            </span>

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
                        Preview of equation solving, conversions, and calculation results generated inside the assistant interface.
                    </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <img
                        src={calculatorPreview}
                        alt="Calculator tool preview"
                        className="w-full object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.015]"
                    />
                </div>
            </section>

            {/* Example queries */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Example Usage</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">
                    Example prompts that trigger the calculator tool.
                </p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-emerald-300 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Example Prompt</span>
                        <span>Assistant Response</span>
                    </div>
                    {EXAMPLE_QUERIES.map(({ phrase, result }, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1.4fr_1fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm text-zinc-800 dark:text-neutral-200 font-mono">&ldquo;{phrase}&rdquo;</span>
                            <span className="text-xs text-zinc-500 dark:text-neutral-500 text-right whitespace-nowrap">{result}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                    <CalcIcon size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-emerald-300 mb-1">Precise computation</p>
                        <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                            Calculations and conversions are processed through a dedicated computation engine to ensure accurate mathematical results.
                        </p>
                    </div>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/tools/web-search"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all"
                >
                    Next: Web Search <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
