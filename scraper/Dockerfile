FROM python:3.12-slim
WORKDIR /app

# Install deps first so this layer is cached across script edits.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY fetch_eva_prices.py .

# The app mounts the repo's public/ dir at /public and passes
# --out /public/prices.json. Pass scraper flags after the image name:
#   docker run --rm -v "$PWD/../public:/public" eva-scraper --start 2026-11-01
ENTRYPOINT ["python", "fetch_eva_prices.py"]
