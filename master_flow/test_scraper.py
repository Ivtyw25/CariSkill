import asyncio
import aiohttp
from ddgs import DDGS

async def search_and_scrape(query: str):
    """
    Fetches the top 4 URLs from DuckDuckGo (Synchronous) and scrapes them via r.jina.ai (Asynchronous).
    Filters out blocked or error results with a Quality Control (QC) check.
    """
    print(f"[SEARCH] Querying DuckDuckGo for: '{query}'...")
    
    urls = []
    try:
        # 1. Fetch top 4 results (increased from 2 for better redundancy)
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=4)
            urls = [r['href'] for r in results]
    except Exception as e:
        print(f"[ERROR] DuckDuckGo search failed: {e}")
        return

    if not urls:
        print("[ERROR] No search results found.")
        return

    print(f"[SCRAPE] Found {len(urls)} URLs. Scraping via r.jina.ai...")
    
    success_count = 0
    fail_count = 0
    successful_results = []

    # 2. Concurrently scrape via Jina Reader (Async)
    async with aiohttp.ClientSession() as session:
        tasks = []
        for url in urls:
            jina_url = f"https://r.jina.ai/{url}"
            # Standard browser headers to minimize blocks
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"}
            tasks.append(session.get(jina_url, headers=headers))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, resp in enumerate(responses):
            if isinstance(resp, Exception):
                fail_count += 1
                continue
                
            try:
                async with resp:
                    if resp.status == 200:
                        content = await resp.text()
                        
                        # 3. Quality Control Filter: Discard common Jina error/block patterns
                        error_markers = ["Target URL returned error", "You've been blocked", "403 Forbidden", "Access Denied"]
                        if any(marker in content for marker in error_markers):
                            fail_count += 1
                            continue

                        # Successful scrape
                        success_count += 1
                        snippet = " ".join(content[:1000].split())
                        successful_results.append({
                            "url": urls[i],
                            "snippet": snippet
                        })
                    else:
                        fail_count += 1
            except Exception:
                fail_count += 1

    # 4. Final Summary and Output
    print(f"\n{'='*40}")
    print(f"SCRAPE QUALITY CONTROL SUMMARY")
    print(f"{'='*40}")
    print(f"Total Found: {len(urls)}")
    print(f"Successful Scrapes: {success_count}")
    print(f"Blocked/Failed: {fail_count}")
    print(f"{'='*40}")
    
    if successful_results:
        first = successful_results[0]
        print(f"\n--- TOP SUCCESSFUL SOURCE ---")
        print(f"URL: {first['url']}")
        print(f"CLEANED SNIPPET: {first['snippet']}...")
    else:
        print("\n[ALERT] No sources passed the Quality Control filter.")

if __name__ == "__main__":
    # Test Query
    TEST_QUERY = "FastAPI vs Next.js architecture"
    
    print("--- STARTING QC-FILTERED STANDALONE SCRAPER TEST ---")
    asyncio.run(search_and_scrape(TEST_QUERY))
