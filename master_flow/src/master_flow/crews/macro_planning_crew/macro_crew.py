import os
from crewai import Agent, Crew, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from master_flow.model.macro_models import Blueprint
from master_flow.tools.search_tools import search_syllabi, web_syllabus_search

@CrewBase
class MacroPlanningCrew():
    """Crew responsible for generating and validating the skill tree DAG."""
    agents_config = 'config/macro_agents.yaml'
    tasks_config = 'config/macro_tasks.yaml'

    def get_llm(self) -> LLM:
        return LLM(
            model="gemini/gemini-2.5-flash", 
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.5
        )

    @agent
    def architect(self) -> Agent:
        return Agent(
            config=self.agents_config['architect'],
            tools=[search_syllabi, web_syllabus_search],
            verbose=True,
            llm=self.get_llm(),
            allow_delegation=False
        )

    @task
    def blueprint_task(self) -> Task:
        return Task(
            config=self.tasks_config['blueprint_task'],
            output_pydantic=Blueprint
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=[self.architect()],
            tasks=[self.blueprint_task()],
            verbose=True,
            max_rpm=15
        )
