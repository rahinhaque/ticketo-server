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
      const search = req.query.search;
      const category = req.query.category;
      const price = req.query.price;
      const location = req.query.location;
      const query = {};
      if (search) {
        query.title = {
          $regex: search,
          $options: "i",
        };
      }
      if (category) {
        query.category = {
          $in: category.split(","),
        };
      }

      if (location) {
        query.location = {
          $regex: `^${location}$`,
          $options: "i",
        };
      }
      // sort handling
      let sortOption = {};
      if (req.query.sort === "price-asc") sortOption = { price: 1 };
      if (req.query.sort === "price-desc") sortOption = { price: -1 };
      if (req.query.sort === "date-asc") sortOption = { date: 1 };
      if (req.query.sort === "date-desc") sortOption = { date: -1 };

      const result = await eventsCollection
        .find(query)
        .sort(sortOption)
        .toArray();
      res.send(result);
    });
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
      });
      const organizerEventsCounts = await eventsCollection.countDocuments({
        organizerEmail: data?.organizerEmail,
      });
      // console.log(organizerEventsCounts);
      if (!organizer?.isPremium && organizerEventsCounts >= 3) {
        return res
          .status(403)
          .send({ message: "Your free plan can add only 3 events..." });
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
    });

    //Delete events for specific user api
    app.delete("/api/events/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.deleteOne(query);
      res.send(result);
    });

    //Get Attendee list for specific event
    app.get("/api/events/attendees/:id", async (req, res) => {
      const { id } = req.params;
      const query = { eventId: id };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    //Get attendee list across all events created by an organizer
    app.get("/api/organizer/attendees/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const organizerEvents = await eventsCollection
          .find({ organizerEmail: email })
          .project({ _id: 1 })
          .toArray();

        const eventIds = organizerEvents.map((event) => event._id);

        if (eventIds.length === 0) {
          return res.send([]);
        }

        const result = await bookingsCollection
          .find({ eventId: { $in: eventIds } })
          .toArray();

        res.send(result);
      } catch (err) {
        console.error("GET /api/organizer/attendees/:email error:", err);
        res.status(500).send({ error: err.message });
      }
    });

    //making the user premium after payment
    app.patch("/api/users/upgrade-premium/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const { stripeSessionId, amount, plan } = req.body;

        if (stripeSessionId) {
          const existing = await paymentsCollection.findOne({
            stripeSessionId,
          });
          if (existing) {
            return res.send({ alreadyProcessed: true });
          }
        }

        const result = await usersCollection.updateOne(
          { email },
          { $set: { isPremium: true } },
        );

        await paymentsCollection.insertOne({
          email,
          type: "organizer-subscription",
          stripeSessionId: stripeSessionId || null,
          amount: amount || 0,
          plan: plan || "premium",
          status: "paid",
          createdAt: new Date(),
        });

        res.send(result);
      } catch (err) {
        console.error("PATCH /api/users/upgrade-premium/:email error:", err);
        res.status(500).send({ error: err.message });
      }
    });
    // add this near your other routes, inside run()

    //Get bookings
    app.get("/api/bookings/:email", async (req, res) => {
      const { email } = req.params;
      const cursor = bookingsCollection.find({ userEmail: email });
      const result = await cursor.toArray();
      res.send(result);
    });

    //Booking api--------------------------------------------------------------------------
    //Booking api--------------------------------------------------------------------------
    app.post("/api/bookings", async (req, res) => {
      try {
        const {
          eventId,
          userEmail,
          quantity,
          totalPrice,
          stripeSessionId,
          status,
        } = req.body;
        const qty = Math.max(1, Number(quantity) || 1);

        if (stripeSessionId) {
          const existing = await bookingsCollection.findOne({
            stripeSessionId,
          });
          if (existing)
            return res.send({ booking: existing, alreadyExists: true });
        }

        const updated = await eventsCollection.findOneAndUpdate(
          {
            _id: new ObjectId(eventId),
            $expr: { $gte: [{ $toInt: "$seats" }, qty] },
          },
          [{ $set: { seats: { $subtract: [{ $toInt: "$seats" }, qty] } } }],
          { returnDocument: "after" },
        );
        const eventDoc = updated?.value ?? updated;

        if (!eventDoc) {
          return res.status(400).send({ error: "Not enough seats available" });
        }

        const booking = {
          eventId: new ObjectId(eventId),
          eventName: eventDoc.title,
          eventDate: eventDoc.date,
          userEmail,
          quantity: qty,
          totalPrice: totalPrice || 0,
          stripeSessionId: stripeSessionId || null,
          status: status || "confirmed",
          createdAt: new Date(),
        };

        const result = await bookingsCollection.insertOne(booking);
        const bookingId = result.insertedId;

        // record the payment — only for paid purchases (free RSVPs have no stripeSessionId)
        if (stripeSessionId && totalPrice > 0) {
          await paymentsCollection.insertOne({
            bookingId,
            eventId: new ObjectId(eventId),
            userEmail,
            amount: totalPrice,
            quantity: qty,
            stripeSessionId,
            status: "paid",
            createdAt: new Date(),
          });
        }

        res.send({ booking: { ...booking, _id: bookingId } });
      } catch (err) {
        console.error("POST /api/bookings error:", err);
        res.status(500).send({ error: err.message });
      }
    });

    //payments
    //Get all the payments
    app.get("/api/payments/:email", async (req, res) => {
      const { email } = req.params;
      const cursor = paymentsCollection.find({ userEmail: email });
      const result = await cursor.toArray();
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
