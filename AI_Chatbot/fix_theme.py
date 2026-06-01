import os
import re
import glob

docs_dir = r"d:\GP\AI_Chatbot\src\docs"
jsx_files = glob.glob(os.path.join(docs_dir, "**/*.jsx"), recursive=True)

def replace_triplets(content):
    # Matches patterns like `text-neutral-100 dark:text-neutral-100 text-zinc-900`
    # and `bg-neutral-800/30 dark:bg-neutral-800/30 bg-zinc-100`
    # and `border-neutral-800 dark:border-neutral-800 border-zinc-200`
    
    # We will look for:
    # (prefix)-neutral-(number)(/number)? dark:\1-neutral-\2\3 \1-zinc-(number)(/number)?
    # Wait, prefix can be empty, or `hover:`, `text-`, `bg-`, `border-`, `divide-`, `hover:text-`, etc.
    
    # A generic regex:
    # ([a-z:-]+?)neutral-(\d+(?:/\d+)?)\s+dark:\1neutral-\2\s+\1zinc-(\d+(?:/\d+)?)
    
    pattern = re.compile(r'([a-z:-]*?)neutral-(\d+(?:/\d+)?)\s+dark:\1neutral-\2\s+\1zinc-(\d+(?:/\d+)?)')
    
    def repl(m):
        prefix = m.group(1)
        n_val = m.group(2)
        z_val = m.group(3)
        return f"{prefix}zinc-{z_val} dark:{prefix}neutral-{n_val}"

    # We should run it multiple times in case of adjacent overlaps, though unlikely
    new_content = content
    prev = None
    while prev != new_content:
        prev = new_content
        new_content = pattern.sub(repl, new_content)
        
    return new_content

def fix_typos(content):
    # Fix the typo user introduced: text-zinc-800 dark:text-zinc-800 dark:text-neutral-200 -> text-zinc-800 dark:text-neutral-200
    pattern = re.compile(r'([a-z:-]*?)zinc-(\d+(?:/\d+)?)\s+dark:\1zinc-\2\s+dark:\1neutral-(\d+(?:/\d+)?)')
    def repl(m):
        prefix = m.group(1)
        z_val = m.group(2)
        n_val = m.group(3)
        return f"{prefix}zinc-{z_val} dark:{prefix}neutral-{n_val}"
    
    new_content = pattern.sub(repl, content)
    
    # Another pattern: text-neutral-500 dark:text-neutral-500 text-zinc-500
    # Wait, sometimes it's text-zinc-500 dark:text-neutral-500
    # Let's fix text-neutral-X dark:text-neutral-X text-zinc-Y as well.
    # What if it's dark:text-neutral-X text-zinc-Y ?
    # Let's clean up any duplicate dark:classes or duplicate text-classes.
    return new_content

for file in jsx_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = replace_triplets(content)
    new_content = fix_typos(new_content)
    
    if new_content != content:
        print(f"Fixed classes in {file}")
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
    else:
        print(f"No changes in {file}")
