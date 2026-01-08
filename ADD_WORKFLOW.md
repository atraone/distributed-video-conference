# 🚀 Add Workflow File via GitHub Web UI

The workflow file needs to be added manually due to OAuth restrictions. Here's how:

## Quick Steps:

1. **Go to:** https://github.com/atraone/distributed-video-conference/new/main?filename=.github%2Fworkflows%2Fdeploy.yml

2. **Copy and paste this content:**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build:client
        env:
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
          VITE_TURN_CONFIG_URL: ${{ secrets.VITE_TURN_CONFIG_URL }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist/client'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

3. **Click "Commit new file"** at the bottom

4. **That's it!** The workflow will run automatically and deploy your site.

---

## Alternative: I can open the page for you

Run: `./open-setup.sh` or I can open it directly.

