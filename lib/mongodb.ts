import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const options = {};

let client: MongoClient;
let dbPromise: Promise<any>;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

client = new MongoClient(uri, options);
// Use "hr_portal" explicitly here if it's not in your URI string
dbPromise = client.connect().then((client) => client.db("hr_portal")); 

export { dbPromise };