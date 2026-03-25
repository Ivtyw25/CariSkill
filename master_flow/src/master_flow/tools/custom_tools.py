import asyncio
import aiohttp
import os
import threading
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool
from ddgs import DDGS

class DeepSearchSchema(BaseModel):
    """Input schema for AsyncDeepSearchTool."""
    query: str = Field(..., description="The search query to look up on the web.")

class AsyncDeepSearchTool(BaseTool):
    name: str = "Async Deep Web Scraper"
    description: str = (
        "Use this tool to search the web and deeply scrape the pure markdown content "
        "of the top results. Input should be a specific search query. Returns compiled "
        "text from the best sources."
    )
    args_schema: Type[BaseModel] = DeepSearchSchema

    def _run(self, query: str) -> str:
        """
        Synchronous wrapper for the async scraping logic.
        Uses a separate thread to avoid event loop conflicts.
        """
        results_container = []

        def worker():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                res = loop.run_until_complete(self._async_scrape(query))
                results_container.append(res)
                loop.close()
            except Exception as e:
                results_container.append(f"Error executing deep search in thread: {str(e)}")

        thread = threading.Thread(target=worker)
        thread.start()
        thread.join()

        return results_container[0] if results_container else "No search results retrieved."

    async def _async_scrape(self, query: str) -> str:
        """
        Internal async method to search and scrape.
        """
        # 1. Fetch top 4 results from DuckDuckGo
        urls = []
        try:
            with DDGS() as ddgs:
                results = ddgs.text(query, max_results=4)
                urls = [r['href'] for r in results]
        except Exception:
            return "Search failed. Could not retrieve URLs."

        if not urls:
            return "No search results found for this query."

        # 2. Concurrently scrape via Jina Reader
        successful_contents = []
        async with aiohttp.ClientSession() as session:
            tasks = []
            for url in urls:
                jina_url = f"https://r.jina.ai/{url}"
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                                  "Chrome/119.0.0.0 Safari/537.36"
                }
                tasks.append(session.get(jina_url, headers=headers))
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, resp in enumerate(responses):
                if isinstance(resp, Exception):
                    continue
                    
                try:
                    async with resp:
                        if resp.status == 200:
                            content = await resp.text()
                            
                            # 3. Quality Control Filter
                            error_markers = ["Target URL returned error", "You've been blocked", "403 Forbidden", "Access Denied"]
                            if any(marker in content for marker in error_markers):
                                continue

                            # 4. Truncate each source to 1500 characters to manage context
                            # Cleaning up double spaces/newlines for compactness
                            cleaned_content = " ".join(content[:1500].split())
                            successful_contents.append(f"SOURCE [{urls[i]}]:\n{cleaned_content}")
                except Exception:
                    continue

        # 5. Combine and return
        if successful_contents:
            return "\n\n---\n\n".join(successful_contents)
        else:
            return "No valid content found for this query after applying quality filters."
