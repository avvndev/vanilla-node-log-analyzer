# Vanilla Node.js Log Streamer 🚀

A light microservice written in **vanilla Node.js** (no external dependencies or frameworks), serving for analyzing, streaming, and securely ingesting high-volume log files through the HTTP protocol.

## 🧠 Main architecture assumptions

This project has been made to demonstrate a deep understanding of Node.js architecture, especially **managing memory usage**, the **Event Loop**, and raw HTTP protocol mechanics:

* **Zero Memory Leaks & OOM Prevention:** Instead of buffering the whole log file to the memory (like `fs.readFile` does), the application uses the **Streams API** (`fs.createReadStream`).
* **Backpressure Handling:** To process the stream of data, a `readline` module has been used along with **Asynchronous Generators** (`async function*` + `yield`). This keeps memory (RAM) usage constant (in the range of a few megabytes), regardless if the file size is 10 MB or 100 GB.
* **HTTP Streaming:** The results of the analysis are streamed directly to the HTTP client with `res.write()` in real time, instead of buffering the full response.
* **Native Routing & Controllers:** A custom router built from scratch to handle specific endpoints (`GET` and `POST` for `/api/logs`), including proper `404 Not Found` and `405 Method Not Allowed` fallbacks to prevent dangling requests.
* **Secure Data Ingestion:** Processing `POST` request bodies using native stream events (`req.on('data')` and `req.on('end')`) to safely construct JSON payloads without blocking the Event Loop.
* **Payload Size Limiting:** Defending against memory exhaustion attacks by calculating the exact buffer byte size (`Buffer.byteLength`) and terminating connections (`req.destroy()`) that exceed the maximum allowed size (1 MB).
* **Defensive Programming:** Log validation is based on efficient regular expressions using *Named Capture Groups*. The code safely catches operating system errors (e.g., `ENOENT`), handles `res.headersSent` to avoid crashes during active streaming, and prevents runtime errors with safe JSON parsing.

## 🛠️ Technologies
* Node.js (v24 LTS)
* Built-in Node.js modules: `node:fs`, `node:http`, `node:readline`, `node:path`