let express = require('express');
let path = require('path');
let fs = require('fs');
let bodyParser = require('body-parser');
let { MongoClient } = require('mongodb');

let app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===== MongoDB Setup =====
let mongoUrlLocal = "mongodb://admin:password@localhost:27017";
let mongoClientOptions = { useNewUrlParser: true, useUnifiedTopology: true };
let databaseName = "user-account";

// ===== In-memory fallback =====
let fakeDB = {
  userid: 1,
  name: "Guest",
  email: "guest@example.com"
};

// ===== Routes =====

// Serve main HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve image
app.get('/profile-picture', (req, res) => {
  let img = fs.readFileSync(path.join(__dirname, "images/profile-1.jpg"));
  res.writeHead(200, { 'Content-Type': 'image/jpg' });
  res.end(img, 'binary');
});

// Update profile (DB or memory)
app.post('/update-profile', async (req, res) => {
  let userObj = req.body;
  userObj.userid = 1;

  try {
    const client = await MongoClient.connect(mongoUrlLocal, mongoClientOptions);
    const db = client.db(databaseName);

    await db.collection("users").updateOne(
      { userid: 1 },
      { $set: userObj },
      { upsert: true }
    );

    client.close();
    console.log("✅ Profile updated in MongoDB");
  } catch (err) {
    console.log("⚠️ MongoDB not reachable. Using in-memory store.");
    fakeDB = { ...fakeDB, ...userObj };
  }

  res.send(userObj);
});

// Get profile (DB or memory)
app.get('/get-profile', async (req, res) => {
  try {
    const client = await MongoClient.connect(mongoUrlLocal, mongoClientOptions);
    const db = client.db(databaseName);

    const result = await db.collection("users").findOne({ userid: 1 });
    client.close();

    if (result) {
      console.log("✅ Fetched profile from MongoDB");
      res.send(result);
    } else {
      console.log("ℹ️ No profile found in DB. Sending default data.");
      res.send(fakeDB);
    }
  } catch (err) {
    console.log("⚠️ MongoDB not reachable. Sending in-memory data.");
    res.send(fakeDB);
  }
});

// Start server
app.listen(3000, () => {
  console.log("🚀 App listening on port 3000 (MongoDB optional mode)");
});
