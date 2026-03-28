# Use the official Python lightweight image
FROM python:3.11-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED=True
ENV PORT=8080

# Set the working directory to the project root
WORKDIR /app

# Install system dependencies if required by CrewAI or other native packages
RUN apt-get update && apt-get install -y \
    build-essential \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements/project files
COPY pyproject.toml ./
COPY src/ ./src/
COPY api/ ./api/

# Install the package and dependencies
# Since we updated pyproject.toml to include crewai[tools,google-genai], this will install the required dependencies
RUN pip install --no-cache-dir .
RUN pip install python-dotenv

# Copy the rest of the application (like .env or other required state files)
COPY .env ./

# Expose the Cloud Run expected port
EXPOSE $PORT

# Run the FastAPI application using Uvicorn
CMD uvicorn api.main:app --host 0.0.0.0 --port $PORT
