import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

async function* processFile(arg) {
  const filePath = resolve(arg);

  try {
    const fileStream = createReadStream(filePath, "utf-8");
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const logParserRegex =
      /^(?<timestamp>.+?) \[(?<level>\w+)\] (?<message>.*)$/;

    for await (const line of rl) {
      if (line.toString().includes("ERROR")) {
        const lineToString = line.toString();
        const match = lineToString.match(logParserRegex);

        if (!match || !match.groups) continue;

        const { timestamp, level, message } = match.groups;

        yield {
          timestamp,
          level,
          message,
        };
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      yield {
        code: error.code,
        message: `Error. File ${arg} cannot be found in directory ${filePath}`,
        originalError: error.message,
      };
    } else {
      yield {
        code: error.code,
        message: "Unexpected error occured.",
        originalError: error.message,
      };
    }
  }
}

const server = createServer(async (req, res) => {
  if (isNonExistingUrlPath(req)) {
    res.statusCode = 404;
    res.end("Provided url path does not exists!");

    return;
  }

  res.setHeader("Content-Type", "application/json");

  if (isLogsGetRequest(req)) {
    await processLogsGetRequest(res);
    return;
  }

  if (isLogsPostRequest(req)) {
    processLogsPostRequest(req, res);
    return;
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");

  return;
});

async function processLogsGetRequest(res) {
  for await (const line of processFile("logs.txt")) {
    const response = JSON.stringify(line);

    if (hasLineErrorObject(line)) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Error during processing." }));
      }

      res.end("Internal Server Error");

      return;
    }

    res.write(`${response}\n`);
  }

  res.end();

  return;
}

function processLogsPostRequest(req, res) {
  const maxAcceptableBodySize = 1048576;
  let body = "";

  req.on("data", (chunk) => {
    body += chunk.toString();

    if (checkBodySize(body) > maxAcceptableBodySize) {
      res.statusCode = 413;
      res.end("Payload Too Large");
      req.destroy();

      return;
    }
  });

  req.on("end", () => {
    try {
      const parsedBody = JSON.parse(body);
      console.log(parsedBody);
    } catch (error) {
      res.statusCode = 400;
      res.end("Invalid JSON");

      return;
    }

    res.statusCode = 201;
    res.end("Logs have been saved.");

    return;
  });
}

function checkBodySize(body) {
  return Buffer.byteLength(body, "utf8");
}

function isLogsGetRequest(req) {
  return req.method === "GET" && req.url === "/api/logs";
}

function isNonExistingUrlPath(req) {
  return req.url !== "/api/logs";
}

function isLogsPostRequest(req) {
  return req.method === "POST" && req.url === "/api/logs";
}

function hasLineErrorObject(line) {
  return line.error ? true : false;
}

server.listen(3000, () => {
  console.log("Server listening on port 3000. Go to http://localhost:3000");
});
