# Trasol SupportDesk 360 - Production Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

EXPOSE 8000

# Run entrypoint command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
