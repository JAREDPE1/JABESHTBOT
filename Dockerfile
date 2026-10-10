FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        ffmpeg \
        python3 \
        python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY requirements-instagram.txt ./
RUN python3 -m venv /opt/instagram-venv \
    && /opt/instagram-venv/bin/pip install --no-cache-dir -r requirements-instagram.txt

COPY . .

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV AUTH_DIR=/data/auth
ENV TMP_DIR=/tmp/jabesht-bot
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV INSTAGRAM_PYTHON=/opt/instagram-venv/bin/python

CMD ["npm", "start"]
