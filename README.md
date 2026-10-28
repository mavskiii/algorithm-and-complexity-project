# Algorithm and Complexity Project — Group 4 BSCS 3-B

A local learning app with a React + TypeScript frontend and an Express backend. The tutor tries Gemini first and falls back to Groq when Gemini is rate-limited or temporarily unavailable.

## Start the app

1. Install Node.js 20 or later.
2. In a terminal opened in this folder, run `npm install`.
3. Copy `server/.env.example` to `server/.env`, then add at least one provider API key. Your local `.env` file is excluded from Git.
4. Run `npm run build`, then `npm start`.
5. Open http://localhost:3001. Keep the server running while using the website and AI tutor.

On Windows, double-click `RUN-APP.bat` to install dependencies when needed, build the frontend, and start the complete app on port 3001. Closing its terminal stops both the website and chat API.

For development with live frontend updates, run `npm run dev` and open the Vite address (usually http://localhost:5173).

Create API keys in [Google AI Studio](https://aistudio.google.com/app/apikey) and [Groq Console](https://console.groq.com/keys). Gemini is tried first; Groq is used if Gemini returns a rate limit, timeout, or server error. To prioritize Groq, swap the provider order in `server/src/index.js`. You can change model IDs in `server/.env`.

## Features

- Eight lessons grouped by traversal, shortest paths, spanning trees, and ordering.
- Searchable lessons, complexity summaries, pseudocode, quick checks, and local lesson progress.
- Larger reading text and a light/dark theme toggle; the chosen theme is saved in this browser.
- Plain-language descriptions, practical uses, real-world examples, and limitations for every lesson.
- React Flow examples for all eight algorithms, with draggable vertices, zoom controls, playback, a step slider, and final results.
- Distance/predecessor tables for Dijkstra and Bellman–Ford, an evolving Floyd–Warshall matrix, Prim/Kruskal tree costs and cycle checks, and topological in-degree/output views.
- Tutor chat that receives the selected lesson and current graph step as context.
- Interactive graphs in chat from vertex lists and weighted edges such as `A-B: 4, A-C: 2`.
- Draggable and keyboard-movable vertices, editable weighted connections, directed/undirected graphs, and a selectable start vertex.
- Locally computed Dijkstra traces with previous/next steps, reset, final distances, and AI explanations using the supplied graph.
- Requests for missing edges and weights, with negative-weight validation for Dijkstra.
- Provider fallback, request validation, rate limiting, server-only API keys, and useful error messages.

The app does not require accounts or a database. Completed lessons are stored in the current browser's local storage. For a shared class deployment, add user authentication and a database before storing individual student progress.

Run `npm test` for algorithm correctness checks, including shortest distances, the all-pairs matrix, minimum spanning trees, and dependency ordering.

## Production build

Run `npm run build`, then `npm start`. The Express server serves the built frontend and API from port 3001. The API is configured for local development and should be deployed behind HTTPS with its keys stored as hosting secrets.

## Project structure

```
client/       React + TypeScript user interface
server/       Express API and Gemini/Groq provider routing
server/.env.example   Configuration template without real API keys
server/.env           Your local provider keys (not committed)
```

