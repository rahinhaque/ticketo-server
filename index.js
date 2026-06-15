const { ObjectId } = require("mongodb");
const { setServers } = require("dns").promises;

// Use Google Public DNS and Cloudflare DNS
setServers([
  "8.8.8.8", // Google
  "1.1.1.1", // Cloudflare
]);

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

//MongoDb

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    //Database collections=--------------------------------------------------------------------------
    const db = client.db("ticketoDB");
    const organizationCollection = db.collection("organizations");
    const eventsCollection = db.collection("events");
    const bookingsCollection = db.collection("bookings");
    const paymentsCollection = db.collection("payments");
    const usersCollection = db.collection("user");

    //organization api--------------------------------------------------------------------------

    //Get All Organizations
    app.get("/api/organizations/:email", async (req, res) => {
      const { email } = req.params;
      const query = { organizerEmail: email };
      const result = await organizationCollection.find(query).toArray();
      res.send(result);
    });

    //Create Organization
    app.post("/api/organizations", async (req, res) => {
      const { organization, logo, website, description, organizerEmail } =
        req.body;

      const addData = {
        organization,
        logo,
        website,
        description,
        organizerEmail,
        createdAt: new Date(),
        status: "active",
      };

      const result = await organizationCollection.insertOne(addData);
      res.send(result);
    });

    //Update Organization api
    app.patch("/api/organizations/:id", async (req, res) => {
      try {
        const { id } = req.params;
        // console.log("PATCH id:", id);

        const { organization, logo, website, description, organizerEmail } =
          req.body;

        const updateData = {
          organization,
          logo,
          website,
          description,
          organizerEmail,
          status: "active",
        };

        const result = await organizationCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData },
        );

        // console.log(result);
        res.send(result);
      } catch (err) {
        // console.error("PATCH /api/organizations/:id error:", err);
        res.status(500).send({ error: err.message });
      }
    });

    // Event Routes api--------------------------------------------------------------------------
    //Get all the events
    app.get("/api/events", async (req, res) => {
      const result = await eventsCollection.find().toArray();
      res.send(result);
    })
    //get single event
    app.get("/api/single-events/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.findOne(query);
      res.send(result);
    });

    //Get the events Added by the user
    app.get("/api/events/:email", async (req, res) => {
      const { email } = req.params;
      const query = { organizerEmail: email };
      const result = await eventsCollection.find(query).toArray();
      res.send(result);
    });

    //Post Event
    app.post("/api/events", async (req, res) => {
      const data = req.body;
      // console.log(data);
      const organizer = await usersCollection.findOne({
        email: data?.organizerEmail,
      })
      const organizerEventsCounts = await eventsCollection.countDocuments({organizerEmail: data?.organizerEmail})
      // console.log(organizerEventsCounts);
      if(!organizer?.isPremium && organizerEventsCounts >= 3){
        res.status(403).send({message: "Your free plan plan can add only 3 events, please upgrade to premium plan."})
      }


      const result = await eventsCollection.insertOne({
        ...data,
        status: "pending",
      });
      res.send(result);
    });

    //patch events api
    app.patch("/api/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        // console.log("PATCH id:", id);

        // ✅ Fix — match what your frontend actually sends
        const {
          title,
          description,
          location,
          date,
          price,
          seats,
          category,
          banner,
        } = req.body;

        const updateData = {
          title,
          description,
          location,
          date,
          price,
          seats,
          category,
          banner,
        };

        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData },
        );

        console.log(result);
        res.send(result);
      } catch (err) {
        console.error("PATCH /api/organizations/:id error:", err);
        res.status(500).send({ error: err.message });
      }
    })

    //Delete events for specific user api
    app.delete("/api/events/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Ticketo server is listening on port ${port}`);
});
