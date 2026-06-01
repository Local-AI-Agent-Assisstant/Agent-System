import { FolderOpen, FileText, ImageIcon, AlertCircle, ArrowRight, Upload, Eye } from "lucide-react";
import { Link } from "react-router-dom";
// import UploadPreview from "../assets/upload-preview.mp4";

const SUPPORTED_TYPES = [
    {
        icon: FileText,
        label: "Documents & Text",
        exts: ".txt, .md, .pdf, .docx",
        color: "text-sky-400",
        bg: "bg-sky-500/10",
    },
    {
        icon: ImageIcon,
        label: "Images",
        exts: ".png, .jpg, .jpeg, .webp",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
    },
    {
        icon: FolderOpen,
        label: "Structured Data",
        exts: ".json, .csv",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
    },
];

const HOW_STEPS = [
    {
        icon: Upload,
        title: "Attach a file",
        desc: "Attach supported files directly through the chat input area.",
    },
    {
        icon: Eye,
        title: "Preview before sending",
        desc: "Files can be reviewed or removed before submission.",
    },
    {
        icon: FolderOpen,
        title: "Send with your message",
        desc: "Files are submitted together with your conversation message for contextual processing.",
    },
    {
        icon: FileText,
        title: "Context processing",
        desc: "Uploaded content is processed by the assistant for analysis, summarization, visual understanding, and contextual responses.",
    },
];

const TIPS = [
    "Text files and documents can be attached directly through the message input area.",
    "Images support visual analysis, OCR, scene understanding, and AI-assisted interpretation.",
    "For large documents, asking specific questions produces more accurate responses than requesting a full summary.",
    "Multiple supported files can be attached within the same conversation message.",
    "Uploaded files remain scoped to the active conversation context unless explicitly saved or managed by the user.",
    "Specific prompts and focused questions usually produce better results than broad requests.",
];

export default function FilesUploads() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                    <FolderOpen size={12} />
                    File Processing
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Files & Uploads
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Upload documents, images, and supported files directly into conversations for analysis,
                    summarization, visual understanding, and AI-assisted interactions.
                </p>
            </section>

            {/* Supported types */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Supported File Types</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SUPPORTED_TYPES.map(({ icon: Icon, label, exts, color, bg }) => (
                        <div
                            key={label}
                            className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 hover:-translate-y-0.5 transition-all"
                        >
                            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                                <Icon size={18} className={color} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-0.5">{label}</p>
                                <p className="text-xs font-mono text-zinc-500 dark:text-neutral-500">{exts}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How to use */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-6">Upload Process</h2>
                <div className="flex flex-col gap-0 max-w-2xl">
                    {HOW_STEPS.map(({ icon: Icon, title, desc }, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <Icon size={15} className="text-indigo-400" />
                                </div>
                                {i < HOW_STEPS.length - 1 && (
                                    <div className="w-px flex-1 bg-zinc-200 dark:bg-neutral-800 my-1" />
                                )}
                            </div>
                            <div className="pb-7">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-0.5">{title}</p>
                                <p className="text-xs text-zinc-500 dark:text-neutral-500 leading-relaxed">{desc}</p>
                            </div>
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
                        Preview of the file upload workflow and attachment interface.
                    </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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
                        {/* <source src={UploadPreview} type="video/mp4" /> */}
                    </video>
                </div>
            </section>

            {/* Tips */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-4">Tips for Better Results</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {TIPS.map((tip, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <span className="text-indigo-400 mt-0.5 shrink-0 text-sm">✦</span>
                            <span className="text-sm text-zinc-700 dark:text-neutral-300 leading-relaxed">{tip}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Context Scope */}
            <section className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex gap-4">
                <AlertCircle size={18} className="text-indigo-400 shrink-0 mt-0.5" />

                <div>
                    <p className="text-sm font-medium text-indigo-300 mb-1">
                        Context Scope
                    </p>

                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Uploaded files remain limited to the active conversation context unless explicitly managed or saved by the user.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/mcp"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-colors"
                >
                    Next: Architecture <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
