# Runs the scandiary MCP server over stdio, with a browser inside the container.
# Used by MCP directories (Glama) that start servers in Docker to check them.
# Normal users do not need this: `npx -y scandiary --mcp` uses the browser they have.

FROM node:20-slim

# Chromium for the scans. Fonts so text renders and measures like a real visit.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin ./bin
COPY src ./src

# The container is the isolation here, so Chrome's own sandbox is turned off (see chrome.mjs).
ENV CHROME_PATH=/usr/bin/chromium \
    SCANDIARY_NO_SANDBOX=1

USER node
ENTRYPOINT ["node", "bin/scandiary.mjs", "--mcp"]
