import asyncio
import os
import threading
from typing import Type
from pydantic import BaseModel, Field
from crewai.tools import BaseTool
from tavily import AsyncTavilyClient

class DeepSearchSchema(BaseModel):
    """Input schema for AsyncDeepSearchTool."""
    query: str = Field(..., description="The search query to look up on the web.")

class AsyncDeepSearchTool(BaseTool):
    name: str = "Async Deep Web Scraper"
    description: str = (
        "Use this tool to search the web and deeply scrape the content "
        "of the top results. Input should be a specific search query. Returns compiled "
        "text from the best sources."
    )
    args_schema: Type[BaseModel] = DeepSearchSchema

    def _run(self, query: str) -> str:
        """
        Synchronous wrapper for the async scraping logic.
        Uses a separate thread to avoid event loop conflicts with CrewAI.
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
        Internal async method to call Tavily. 
        Tavily handles the concurrent scraping of multiple URLs on its backend.
        """
        try:
            # Initialize the Async Tavily Client
            client = AsyncTavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))
            
            # search_depth="advanced" forces deep scraping of the sources
            response = await client.search(
                query=query, 
                search_depth="advanced", 
                max_results=4
            )
            
            results = response.get("results", [])
            if not results:
                return "No search results found for this query."
            
            successful_contents = []
            for item in results:
                url = item.get("url", "Unknown URL")
                content = item.get("content", "")
                
                # Clean up content whitespace
                cleaned_content = " ".join(content.split())
                successful_contents.append(f"SOURCE [{url}]:\n{cleaned_content}")
                
            return "\n\n---\n\n".join(successful_contents)
            
        except Exception as e:
            return f"Tavily deep search failed: {str(e)}"