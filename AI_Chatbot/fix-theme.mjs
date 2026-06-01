import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.join(__dirname, 'src', 'docs');

function getFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            getFiles(filepath, files);
        } else if (filepath.endsWith('.jsx')) {
            files.push(filepath);
        }
    }
    return files;
}

const colorMap = {
    '100': '900',
    '200': '800',
    '300': '700',
    '400': '600',
    '500': '500',
    '600': '400',
    '700': '300',
    '800': '200',
    '900': '100',
    '950': '50'
};

function fixClasses(content) {
    // We want to replace classes like `text-neutral-400` with `text-zinc-600 dark:text-neutral-400`
    // If it's already got a `dark:` prefix or a `zinc` prefix, we don't want to double it.
    
    // Step 1: Remove all existing `text-zinc-*`, `bg-zinc-*`, `border-zinc-*`, `divide-zinc-*` to start clean, 
    // BUT only if they are associated with a neutral class. Actually, let's just strip `dark:text-neutral-*` and `text-zinc-*` 
    // and rebuild them from `text-neutral-*`.
    
    // Better strategy: find all text-neutral, bg-neutral, border-neutral, divide-neutral.
    // Replace with a temporary token, then rebuild.
    
    // First, clean up any existing combos so we just have the raw neutral ones.
    let cleaned = content
        .replace(/text-zinc-\d+\s+dark:text-neutral-\d+/g, match => {
            const m = match.match(/dark:text-neutral-(\d+)/);
            return `text-neutral-${m[1]}`;
        })
        .replace(/bg-zinc-\d+\s+dark:bg-neutral-\d+(?:\/\d+)?/g, match => {
            const m = match.match(/dark:bg-neutral-(\d+(?:\/\d+)?)/);
            return `bg-neutral-${m[1]}`;
        })
        .replace(/border-zinc-\d+\s+dark:border-neutral-\d+(?:\/\d+)?/g, match => {
            const m = match.match(/dark:border-neutral-(\d+(?:\/\d+)?)/);
            return `border-neutral-${m[1]}`;
        })
        .replace(/divide-zinc-\d+\s+dark:divide-neutral-\d+(?:\/\d+)?/g, match => {
            const m = match.match(/dark:divide-neutral-(\d+(?:\/\d+)?)/);
            return `divide-neutral-${m[1]}`;
        });

    // Also remove stray dark: prefixes that were added by the previous python script
    cleaned = cleaned.replace(/dark:(text|bg|border|divide)-neutral-(\d+(?:\/\d+)?)/g, '$1-neutral-$2');
    cleaned = cleaned.replace(/(text|bg|border|divide)-zinc-\d+/g, ''); // strip any lingering zincs

    // Now everything is just `text-neutral-400` or `bg-neutral-800/30` etc.
    // Let's rebuild them properly.
    
    let rebuilt = cleaned.replace(/(hover:)?(text|bg|border|divide)-neutral-(\d+)(\/\d+)?/g, (match, hover, type, shade, opacity) => {
        hover = hover || '';
        opacity = opacity || '';
        const zincShade = colorMap[shade] || shade;
        // Exception: neutral-950 becomes zinc-50, etc.
        // Special case: neutral-800/30 bg should map to zinc-100 without opacity typically, or zinc-200.
        // Let's just use the map. bg-neutral-800/30 -> bg-zinc-200 dark:bg-neutral-800/30
        let lightShade = zincShade;
        if (type === 'bg' && shade === '800' && opacity) {
            lightShade = opacity === '/30' ? '100' : '200';
            return `${hover}${type}-zinc-${lightShade} dark:${hover}${type}-neutral-${shade}${opacity}`;
        }
        if (type === 'bg' && shade === '900' && opacity === '/80') {
            return `${hover}${type}-white/80 dark:${hover}${type}-neutral-${shade}${opacity}`;
        }
        
        // Return standard mapping
        return `${hover}${type}-zinc-${zincShade} dark:${hover}${type}-neutral-${shade}${opacity}`;
    });

    // Remove double spaces
    rebuilt = rebuilt.replace(/\s{2,}/g, ' ');

    return rebuilt;
}

const files = getFiles(docsDir);
for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const updated = fixClasses(content);
    if (content !== updated) {
        fs.writeFileSync(file, updated, 'utf-8');
        console.log(`Updated ${path.basename(file)}`);
    }
}
