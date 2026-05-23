# AI Resume Builder

A full-stack resume tailoring app inspired by common AI resume builder workflows: paste a job description, paste your current profile, generate a tailored ATS-friendly resume, inspect matched keywords, copy the result, download a text file, or print to PDF.

Live demo:

```text
https://freekit.dev/s/EpyrDpMz
```

## Run

```bash
node server.js
```

Then open:

```text
http://localhost:4173
```

No install step is required.

## Optional AI Mode

The app works locally without an API key. To use model-powered writing, set:

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Then restart the server. If the API call fails, the app falls back to the local tailoring engine.

## Static Hosting

The files in `public/` also run as a standalone static site for GitHub Pages or other static hosts. The browser app includes a local tailoring fallback, so it can generate resumes even without the Node API.
