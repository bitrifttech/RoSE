FROM python:3.10-slim

WORKDIR /app

RUN python -m venv langflow-env
ENV PATH="/app/langflow-env/bin:$PATH"
RUN pip install --upgrade pip
RUN pip install uv

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN uv pip install -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
