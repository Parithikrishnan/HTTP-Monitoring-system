// server.js (your backend API server)
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require('mongodb');

// --- Configuration ---
const PORT = 3000; // Your backend server will listen on this port
const MONGODB_URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "trafficlogger";
const COLLECTION_NAME = "httptrafficlogs"; // Collection where mitmproxy will store logs

let db;
let mongoClient;

// --- MongoDB Connection Management ---
async function connectDB() {
    console.log("Attempting to connect to MongoDB for backend server...");
    mongoClient = new MongoClient(MONGODB_URI);
    try {
        await mongoClient.connect();
        console.log("Backend server connected to MongoDB successfully!");
        db = mongoClient.db(DB_NAME);
        return db;
    } catch (error) {
        console.error("Backend server ERROR connecting to MongoDB:", error);
        console.error("Please ensure your MongoDB server is running on", MONGODB_URI);
        process.exit(1);
    }
}

async function closeDB() {
    if (mongoClient) {
        await mongoClient.close();
        console.log("Backend server disconnected from MongoDB.");
    }
}

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json());

// --- API Routes ---

app.get("/", (req, res) => {
    res.json({ message: "Hello from the backend server! Your request was successfully processed." });
});

app.get("/requests", async (req, res) => {
    try {
        const pipeline = [
            {
                $match: { direction: 'incoming_request' }
            },
            {
                $lookup: {
                    from: COLLECTION_NAME,
                    localField: '_id',
                    foreignField: 'linkedRequestId',
                    as: 'response'
                }
            },
            {
                $unwind: {
                    path: '$response',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    id: { "$toString": "$_id" },
                    method: '$method',
                    url: '$url',
                    status: '$response.statusCode',
                    timestamp: '$timestamp',
                    duration: {
                        $cond: {
                            if: '$response.timestamp',
                            then: { $subtract: ['$response.timestamp', '$timestamp'] },
                            else: null
                        }
                    }
                }
            },
            {
                $sort: { timestamp: -1 }
            }
        ];

        const requestsList = await db.collection(COLLECTION_NAME).aggregate(pipeline).toArray();
        res.json(requestsList);
    } catch (error) {
        console.error("Error fetching requests list from MongoDB:", error);
        res.status(500).json({ error: "Failed to retrieve requests list." });
    }
});

app.get("/requests/:id", async (req, res) => {
    try {
        const requestId = new ObjectId(req.params.id);

        const pipeline = [
            {
                $match: { _id: requestId, direction: 'incoming_request' }
            },
            {
                $lookup: {
                    from: COLLECTION_NAME,
                    localField: '_id',
                    foreignField: 'linkedRequestId',
                    as: 'response'
                }
            },
            {
                $unwind: {
                    path: '$response',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    id: { "$toString": "$_id" },
                    method: '$method',
                    url: '$url',
                    timestamp: '$timestamp',
                    requestBody: '$body',
                    requestHeaders: '$headers',
                    // Assuming headers.cookie is a string, split into array for display
                    requestCookies: { $split: [{ $ifNull: ['$headers.cookie', ''] }, '; '] },
                    status: '$response.statusCode',
                    duration: {
                        $cond: {
                            if: '$response.timestamp',
                            then: { $subtract: ['$response.timestamp', '$timestamp'] },
                            else: null
                        }
                    },
                    responseBody: '$response.body',
                    responseHeaders: '$response.headers',
                    // Assuming headers.set-cookie is an array of strings, or a single string
                    responseCookies: {
                        $cond: {
                            if: { $isArray: '$response.headers.set-cookie' },
                            then: '$response.headers.set-cookie',
                            else: { $split: [{ $ifNull: [{ $arrayElemAt: ['$response.headers.set-cookie', 0] }, ''] }, '; '] }
                        }
                    }
                }
            }
        ];

        const requestDetail = await db.collection(COLLECTION_NAME).aggregate(pipeline).toArray();

        if (requestDetail.length > 0) {
            const finalDetail = requestDetail[0];
            // Stringify bodies if they are objects for consistent frontend display
            finalDetail.requestBody = (typeof finalDetail.requestBody === 'object' && finalDetail.requestBody !== null)
                                      ? JSON.stringify(finalDetail.requestBody, null, 2)
                                      : finalDetail.requestBody;
            finalDetail.responseBody = (typeof finalDetail.responseBody === 'object' && finalDetail.responseBody !== null)
                                       ? JSON.stringify(finalDetail.responseBody, null, 2)
                                       : finalDetail.responseBody;

            res.json(finalDetail);
        } else {
            res.status(404).json({ error: "Request not found" });
        }
    } catch (error) {
        console.error(`Error fetching request details for ID ${req.params.id} from MongoDB:`, error);
        if (error.name === 'BSONTypeError') {
            return res.status(400).json({ error: "Invalid Request ID format." });
        }
        res.status(500).json({ error: "Failed to retrieve request details." });
    }
});


app.post("/data", (req, res) => {
    console.log("Received data on /data:", req.body);
    res.status(200).json({
        message: "Data received successfully by backend!",
        receivedData: req.body,
        processedAt: new Date().toISOString()
    });
});

// --- Start Server ---
async function startServer() {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`🚀 Backend API Server (server.js) running on http://localhost:${PORT}`);
        console.log(`Frontend should fetch from http://localhost:${PORT}/requests`);
        console.log("--------------------------------------------------");
    });

    process.on('SIGINT', async () => {
        console.log('\nShutting down backend server...');
        await closeDB();
        process.exit(0);
    });
}

startServer();