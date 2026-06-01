const fs = require('fs');
const path = require('path');

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

    cleaned = cleaned.replace(/dark:(text|bg|border|divide)-neutral-(\d+(?:\/\d+)?)/g, '$1-neutral-$2');
    cleaned = cleaned.replace(/(text|bg|border|divide)-zinc-\d+/g, '');

    let rebuilt = cleaned.replace(/(hover:)?(text|bg|border|divide)-neutral-(\d+)(\/\d+)?/g, (match, hover, type, shade, opacity) => {
        hover = hover || '';
        opacity = opacity || '';
        const zincShade = colorMap[shade] || shade;
        let lightShade = zincShade;
        if (type === 'bg' && shade === '800' && opacity) {
            lightShade = opacity === '/30' ? '100' : '200';
            return `${hover}${type}-zinc-${lightShade} dark:${hover}${type}-neutral-${shade}${opacity}`;
        }
        if (type === 'bg' && shade === '900' && opacity === '/80') {
            return `${hover}${type}-white/80 dark:${hover}${type}-neutral-${shade}${opacity}`;
        }
        if (type === 'bg' && shade === '900') {
            return `${hover}${type}-white dark:${hover}${type}-neutral-${shade}${opacity}`;
        }
        return `${hover}${type}-zinc-${zincShade} dark:${hover}${type}-neutral-${shade}${opacity}`;
    });

    rebuilt = rebuilt.replace(/\s{2,}/g, ' ');

    return rebuilt;
}

const files = getFiles(docsDir);
let changedFilesCount = 0;
for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const updated = fixClasses(content);
    if (content !== updated) {
        fs.writeFileSync(file, updated, 'utf-8');
        console.log(`Updated ${path.basename(file)}`);
        changedFilesCount++;
    }
}
console.log(`Finished processing. Updated ${changedFilesCount} files.`);
