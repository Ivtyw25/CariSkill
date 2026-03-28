import os
from crewai import Agent, Crew, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from master_flow.model.micro_models import MacroNodeContent, FullScrapeResult
from master_flow.tools.custom_tools import AsyncDeepSearchTool

os.environ["OPENAI_API_KEY"] = "sk-dummy-key-to-bypass-pydantic-bug"
deep_search_tool = AsyncDeepSearchTool()

@CrewBase
class MicroLearningCrew():
    """Crew responsible for generating content for a single Macro Node."""
    agents_config = 'config/micro_agents.yaml'
    tasks_config = 'config/micro_tasks.yaml'

    def get_llm(self) -> LLM:
        return LLM(
            model="gemini/gemini-2.5-flash",
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.5
        )

    @agent
    def scraper(self) -> Agent:
        return Agent(
            config=self.agents_config['scraper'],
            tools=[deep_search_tool], # <-- The new tool is wired in here!
            verbose=True,
            llm=self.get_llm(),
            allow_delegation=False
        )

    @agent
    def educator(self) -> Agent:
        return Agent(
            config=self.agents_config['educator'],
            verbose=True,
            llm=self.get_llm(),
            allow_delegation=False
        )

    @agent
    def estimator(self) -> Agent:
        return Agent(
            config=self.agents_config['estimator'],
            verbose=True,
            llm=self.get_llm(),
            allow_delegation=False
        )

    @task
    def scrape_task(self) -> Task:
        return Task(
            config=self.tasks_config['scrape_task'],
            output_pydantic=FullScrapeResult
        )

    @task
    def educate_task(self) -> Task:
        return Task(config=self.tasks_config['educate_task'])

    @task
    def estimate_and_compile_task(self) -> Task:
        return Task(
            config=self.tasks_config['estimate_and_compile_task'],
            output_pydantic=MacroNodeContent
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=[self.scraper(), self.educator(), self.estimator()],
            tasks=[self.scrape_task(), self.educate_task(), self.estimate_and_compile_task()],
            verbose=True,
            output_log_file="micro_learning.log",
            max_rpm=15
        )