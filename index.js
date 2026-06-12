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



    //organization api--------------------------------------------------------------------------
    app.post("/organization", async (req, res) => {
      const {organization, logo, website, description, organizerEmail} = req.body;

      const addData = {
        organization,
        logo,
        website,
        description,
        organizerEmail,
        createdAt: new Date(),
        status: "active",
      }

      const result = await organizationCollection.insertOne(addData);
      res.send(result);
    })

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
