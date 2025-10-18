FROM python:3.11.9

WORKDIR /app

# Copy project files
COPY . /app

# Copy .env explicitly if needed (optional)
# COPY .env /app/.env

# Update OS packages
RUN apt update && apt upgrade -y

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port (optional)
EXPOSE 8000

# Run your app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
