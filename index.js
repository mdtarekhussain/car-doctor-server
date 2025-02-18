const express = require("express");
const cors = require("cors");

const cookieParser = require("cookie-parser");

const app = express();

// Middleware

app.use(express.json());
app.use(cookieParser());

const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
//  middle Ware

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vcokv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const logger = async (req, res, next) => {
  // console.log("colled:", req.host, req.originalUrl);
  next();
};
const verifyToken = async (req, res, next) => {
  console.log("Cookies:", req.cookies);
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized: No token provided" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized: Invalid token" });
    }
    console.log("Decoded Token:", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db("cardDoctor").collection("Service");
    const bookingCollection = client.db("cardDoctor").collection("booking");
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        })
        .send({ success: true });
    });

    app.get("/services", logger, async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, service_id: 1, price: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log("tok tok tok", req.cookies.token);
      console.log("value of the valid token", req.user);

      const email = req.query.email;
      if (req.user.email !== email) {
        return res.status(403).json({ error: "Access denied" });
      }

      const bookings = await bookingCollection.find({ email }).toArray();
      res.send(bookings);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    app.put("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const confirm = req.body;
      console.log(confirm);
      const updateDoc = {
        $set: {
          status: confirm.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running ");
});
app.listen(port, () => {
  console.log(`Car Doctor Server is running in Port ${port}`);
});
