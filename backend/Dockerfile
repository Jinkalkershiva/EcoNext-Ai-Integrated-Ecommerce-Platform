# Production Dockerfile for EcoNext Django Monolithic Backend
FROM python:3.13-slim AS builder

WORKDIR /app

# Install system build dependencies required for compiling wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    default-libmysqlclient-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production runtime stage
FROM python:3.13-slim

WORKDIR /app

# Install runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-mysql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed dependencies from builder
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Create non-root system user for application security
RUN groupadd -r econext && useradd -r -g econext -d /app -s /sbin/nologin econext

# Copy application source code
COPY . .

# Ensure staticfiles and media directories exist with appropriate ownership
RUN mkdir -p /app/staticfiles /app/media && \
    chown -R econext:econext /app

# Switch to non-root user
USER econext

# Expose default Django port
EXPOSE 8000

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Production WSGI startup command with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "econext.wsgi:application"]
