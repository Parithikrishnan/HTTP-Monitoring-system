// server.js - VERY SIMPLE, NO LOGGING VERSION
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

// --- Configuration (override with environment variables) ---
const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "trafficlogger";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "httptrafficlogs";

// --- MongoDB connection management ---
let db;
let mongoClient;

async function connectDB() {
  // NO LOGGING HERE
  mongoClient = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  return db;
}

// --- Express setup ---
const app = express();
app.use(express.json());

// CORS: allow default dev origins + environment overrides
const defaultOrigins = [
  "http://localhost:4200",
  "http://localhost:3000", "http://10.110.120.236:4200","http://10.110.120.236:3000"
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : defaultOrigins);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      callback(new Error("CORS policy: origin not allowed: " + origin));
    }
  },
  credentials: true
}));

// --- Routes ---
app.get("/", (req, res) => {
  res.json({ message: "Hello from backend server", host: HOST, port: PORT });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// List requests (aggregated pipeline)
app.get("/requests", async (req, res) => {
  try {
    const pipeline = [
      { $match: { direction: "incoming_request" } },
      { $lookup: { from: COLLECTION_NAME, localField: "_id", foreignField: "linkedRequestId", as: "response" } },
      { $unwind: { path: "$response", preserveNullAndEmptyArrays: true } },
      { $project: {
          id: { $toString: "$_id" },
          method: "$method",
          url: "$url",
          status: "$response.statusCode",
          timestamp: "$timestamp",
          duration: { $cond: { if: "$response.timestamp", then: { $subtract: ["$response.timestamp", "$timestamp"] }, else: null } }
        }
      },
      { $sort: { timestamp: -1 } }
    ];
    const list = await db.collection(COLLECTION_NAME).aggregate(pipeline).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve requests" });
  }
});

app.get("/requests/:id", async (req, res) => {
  try {
    const requestId = new ObjectId(req.params.id);
    const pipeline = [
      { $match: { _id: requestId, direction: "incoming_request" } },
      { $lookup: { from: COLLECTION_NAME, localField: "_id", foreignField: "linkedRequestId", as: "response" } },
      { $unwind: { path: "$response", preserveNullAndEmptyArrays: true } },
      { $project: {
          _id: 0,
          id: { $toString: "$_id" },
          method: "$method",
          url: "$url",
          timestamp: "$timestamp",
          requestBody: "$body",
          requestHeaders: "$headers",
          requestCookies: { $split: [{ $ifNull: ["$headers.cookie", ""] }, "; "] },
          status: "$response.statusCode",
          duration: { $cond: { if: "$response.timestamp", then: { $subtract: ["$response.timestamp", "$timestamp"] }, else: null } },
          responseBody: "$response.body",
          responseHeaders: "$response.headers",
          responseCookies: {
            $cond: {
              if: { $isArray: "$response.headers.set-cookie" },
              then: "$response.headers.set-cookie",
              else: { $split: [{ $ifNull: [{ $arrayElemAt: ["$response.headers.set-cookie", 0] }, ""] }, "; "] }
            }
          }
        }
      }
    ];

    const detail = await db.collection(COLLECTION_NAME).aggregate(pipeline).toArray();
    if (detail.length === 0) return res.status(404).json({ error: "Not found" });

    const final = detail[0];
    if (typeof final.requestBody === "object" && final.requestBody !== null) final.requestBody = JSON.stringify(final.requestBody, null, 2);
    if (typeof final.responseBody === "object" && final.responseBody !== null) final.responseBody = JSON.stringify(final.responseBody, null, 2);
    return res.json(final);
  } catch (err) {
    // Basic error handling for invalid ID format without logging
    if (err.name === "BSONTypeError" || err.name === "TypeError") return res.status(400).json({ error: "Invalid ID format" });
    res.status(500).json({ error: "Failed to retrieve request details" });
  }
});

app.post("/data", async (req, res) => {
  // This endpoint now simply responds without any logging or database interaction here.
  res.json({ message: "Data received", processedAt: new Date().toISOString() });
});

// --- Start server + connect to DB ---
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, HOST, () => {
      // NO LOGGING HERE - server starts silently
    });
  } catch (err) {
    // If connectDB fails, the process will exit silently
    process.exit(1);
  }
}

// Start the server
startServer();