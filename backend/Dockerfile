# Single container for MVP (Django + Celery + Beat)
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    python3-dev \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Supervisor configuration for running multiple processes
COPY supervisor.conf /etc/supervisor/conf.d/supervisor.conf

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=thesikpan.settings

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Run supervisor to manage all processes
CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisor.conf"]