# tools/deep_search.py

import requests
import concurrent.futures
import re
from bs4 import BeautifulSoup
from ddgs import DDGS

def _fetch_page(hit: dict, query_words: set) -> dict:
    title = hit.get("title", "No Title")
    link = hit.get("href", "")
    
    # We will score this page
    score = 0
    content = ""

    try:
        response = requests.get(link, timeout=8, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")

            # Strip noise
            for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form", "meta", "noscript"]):
                tag.decompose()

            # Extract clean text
            text = soup.get_text(separator=" ", strip=True)
            
            # Simple scoring:
            # 1. Length score (favor medium/long articles over error pages)
            length = len(text)
            if 500 < length < 10000:
                score += 5
            elif length > 10000:
                score += 2
            
            # 2. Keyword density
            text_lower = text.lower()
            keyword_matches = sum(1 for w in query_words if w in text_lower)
            score += keyword_matches * 2
            
            # Truncate to ~2000 characters to give AI enough context without exploding tokens
            content = text[:2000] + ("..." if len(text) > 2000 else "")
        else:
            content = f"Could not retrieve content: HTTP {response.status_code}"
            score -= 10
    except Exception as e:
        content = f"Could not retrieve content: {e}"
        score -= 10

    return {
        "title": title,
        "link": link,
        "content": content,
        "score": score
    }

def deep_search(query: str, on_progress=None) -> list[dict]:
    """
    Searches the web for a query and returns structured results with title, link, and content.
    Used for gathering research data.
    """
    if on_progress:
        on_progress(f"Searching the web for '{query}'...")

    # Step 1: Get top search results from DuckDuckGo (fetch 6)
    search_hits = []
    try:
        with DDGS() as ddgs:
            search_hits = list(ddgs.text(query, max_results=6))
            
        # Retry with simpler query if no hits
        if not search_hits:
            simplified = re.sub(r'[^\w\s]', '', query).strip()
            parts = simplified.split()
            if len(parts) > 3:
                simplified = " ".join(parts[:3])
                with DDGS() as ddgs:
                    search_hits = list(ddgs.text(simplified, max_results=6))
    except Exception as e:
        return [{"title": "Search Error", "link": "", "content": f"Search engine failed: {e}"}]

    if not search_hits:
        return [{"title": "No Results", "link": "", "content": "No results found for the query."}]

    if on_progress:
        on_progress(f"Reading {len(search_hits)} articles...")

    # Step 2: Fetch and score pages concurrently
    query_words = set(re.sub(r'[^\w\s]', '', query.lower()).split())
    
    fetched_results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(_fetch_page, hit, query_words) for hit in search_hits]
        for future in concurrent.futures.as_completed(futures):
            fetched_results.append(future.result())

    if on_progress:
        on_progress("Summarizing results...")

    # Step 3: Sort by score descending and take top 4
    fetched_results.sort(key=lambda x: x["score"], reverse=True)
    top_results = fetched_results[:4]
    
    # Remove the internal 'score' key before returning
    for r in top_results:
        r.pop("score", None)

    return top_results
