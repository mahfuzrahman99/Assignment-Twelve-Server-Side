const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const morgan = require("morgan");
const app = express();
const port = process.env.PORT || 7000;

app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://assignment-twelve-c5a2f.web.app",
      "https://assignment-twelve-mahfuz-b8.surge.sh",
    ],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());

//   // TOKEN VERIFY USING COOKIE
// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token;
//   if (!token) {
//     return res.status(401).send({ message: "One Unauthorized access" });
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       console.log(err);
//       return res.status(401).send({ message: "Tow Unauthorized access" });
//     }
//     console.log("Value In The Token", decoded);
//     req.decoded = decoded;
//     next();
//   });
// };

// TOKEN VERIFY USING LOCALSTORAGE
const verifyToken = async (req, res, next) => {
  // console.log("console.log from here", req.headers);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "One Unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Tow Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.efkktro.mongodb.net/?retryWrites=true&w=majority`;

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
    // post jwt using http only cookies
    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "30d",});
    //   res
    //     // .cookie("token", token, {
    //     //   httpOnly: true,
    //     //   secure: true,
    //     //   sameSite: "none",
    //     // })
    //     .send({ success: true });
    // });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "30d",
      });
      res.send({ token });
    });

    // COLLECTIONS
    const campusCollection = client.db("MedicalCampDB").collection("campus");
    const upcomingCollection = client
      .db("MedicalCampDB")
      .collection("upcoming");
    const participantsCollection = client
      .db("MedicalCampDB")
      .collection("participants");
    const ORManganateCollection = client
      .db("MedicalCampDB")
      .collection("ORManganate");
    const campDetailsCollection = client
      .db("MedicalCampDB")
      .collection("camp_details");
    const paymentCollection = client.db("MedicalCampDB").collection("payments");
    const organizerReviewCollection = client
      .db("MedicalCampDB")
      .collection("organizerReview");
    const usersCollection = client.db("MedicalCampDB").collection("users");
    const feedbackCollection = client
      .db("MedicalCampDB")
      .collection("feedbackPost");
    const participantProfileCollection = client
      .db("MedicalCampDB")
      .collection("participantProfile");
    const upcomingRegisteredListCollection = client
      .db("MedicalCampDB")
      .collection("upcomingRegisteredList");

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // users related APIS
    // post method
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const role = { role: user.role };
      console.log(role);
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/getUserRole/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.send(user.role);
      } catch (error) {
        res.send(error)
      }
    })

    // get method
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // get method for user by email (example)
    app.get("/users/:email", async (req, res) => {
      const userEmail = req.params.email;
      const user = await usersCollection.findOne({ email: userEmail });
      res.send(user);
    });

    // delete method
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    // patch method
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      console.log(updatedInfo);
      const patchDoc = {
        $set: {
          role:updatedInfo.role,
        },
      };
      const result = await usersCollection.updateOne(query, patchDoc);
      res.send(result);
    });
    app.patch("/users/organizer/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      console.log(updatedInfo);
      const updatedCamp = {
        $set: {
          // ORGANIZER INFORMATION
          role: "Organizer",
          name: updatedInfo.name,
          photo: updatedInfo.photo,
          phoneNumber: updatedInfo.phoneNumber,
          address: updatedInfo.address,
          role1: updatedInfo.role1,
          organizations: updatedInfo.organizations,
          duration: updatedInfo.duration,
          degrees: updatedInfo.degrees,
          institutions: updatedInfo.institutions,
          graduation: updatedInfo.graduation,
          administration: updatedInfo.administration,
          financial: updatedInfo.financial,
          leadership: updatedInfo.leadership,
          compliance: updatedInfo.compliance,
          EHR: updatedInfo.EHR,
          Quality: updatedInfo.Quality,
          contributions: updatedInfo.contributions,
          personalTouch: updatedInfo.personalTouch,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedCamp);
      res.send(result);
    });
    app.patch("/users/participant/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      console.log(updatedInfo);
      const updatedCamp = {
        $set: {
          // ORGANIZER INFORMATION
          role: "Participant",
          photo: updatedInfo.photo,
          phoneNumber: updatedInfo.phoneNumber,
          address: updatedInfo.address,
          name: updatedInfo.name,
          nationality: updatedInfo.nationality,
          dateOfBirth: updatedInfo.dateOfBirth,
          background: updatedInfo.background,
          educationStatus: updatedInfo.educationStatus,
          training: updatedInfo.training,
          resume: updatedInfo.resume,
          careerHistory: updatedInfo.careerHistory,
          graduation: updatedInfo.graduation,
          goals: updatedInfo.goals,
          traits: updatedInfo.traits,
          involvement: updatedInfo.involvement,
          compliance: updatedInfo.compliance,
          EHR: updatedInfo.EHR,
          Quality: updatedInfo.Quality,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedCamp);
      res.send(result);
    });
    app.patch("/users/professional/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      console.log(updatedInfo);
      const updatedCamp = {
        $set: {
          // ORGANIZER INFORMATION
          role: "Professionals",
          photo: updatedInfo.photo,
          phoneNumber: updatedInfo.phoneNumber,
          address: updatedInfo.address,
          name: updatedInfo.name,
          nationality: updatedInfo.nationality,
          dateOfBirth: updatedInfo.dateOfBirth,
          background: updatedInfo.background,
          educationStatus: updatedInfo.educationStatus,
          training: updatedInfo.training,
          resume: updatedInfo.resume,
          careerHistory: updatedInfo.careerHistory,
          graduation: updatedInfo.graduation,
          goals: updatedInfo.goals,
          traits: updatedInfo.traits,
          involvement: updatedInfo.involvement,
          compliance: updatedInfo.compliance,
          EHR: updatedInfo.EHR,
          Quality: updatedInfo.Quality,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedCamp);
      res.send(result);
    });

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // MEDICAL CAMPS CRUD OPERATIONS
    // post menu items
    app.post("/campus", async (req, res) => {
      const cartItem = req.body;
      const result = await campusCollection.insertOne(cartItem);
      res.send(result);
    });
    // get all menus
    app.get("/campus", async (req, res) => {
      const { sort } = req.query;
      console.log(sort);
      let query = {};
      const result = await campusCollection
        .find(query)
        .sort({ participants: -1 })
        .toArray();
      res.send(result);
    });
    // get specific id
    app.get("/campus/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campusCollection.findOne(query);
      res.send(result);
    });
    // delete method
    app.delete("/campus/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campusCollection.deleteOne(query);
      res.send(result);
    });
    // patch request for campus
    app.patch("/campus/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      const updatedCamp = {
        $set: {
          camp_name: updatedInfo.camp_name,
          camp_fees: updatedInfo.camp_fees,
          scheduled_date_time: updatedInfo.scheduled_date_time,
          venue: updatedInfo.venue,
          specialized_Services: updatedInfo.specialized_Services,
          healthcare_Professionals: updatedInfo.healthcare_Professionals,
          target_audience: updatedInfo.target_audience,
          description: updatedInfo.description,
          image: updatedInfo.image,
          participants: updatedInfo.participants,
          paymentStatus: updatedInfo.paymentStatus,
          confirmationStatus: updatedInfo.confirmationStatus,
          campId: updatedInfo.campId,
        },
      };
      const result = await campusCollection.updateOne(filter, updatedCamp);
      res.send(result);
    });

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // MEDICAL UPCOMING CAMPS CRUD OPERATIONS
    // post upcoming camp
    app.post("/upcoming", async (req, res) => {
      const cartItem = req.body;
      const result = await upcomingCollection.insertOne(cartItem);
      res.send(result);
    });
    // get all upcoming
    app.get("/upcoming", async (req, res) => {
      const { sort } = req.query;
      console.log(sort);
      let query = {};
      const result = await upcomingCollection
        .find(query)
        .sort({ participants: -1 })
        .toArray();
      res.send(result);
    });
    // delete method
    app.delete("/upcoming/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await upcomingCollection.deleteOne(query);
      res.send(result);
    });
    // get specific id
    app.get("/upcoming/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await upcomingCollection.findOne(query);
      res.send(result);
    });
    // patch request for upcoming campus
    app.patch("/upcoming/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      const updatedCamp = {
        $set: {
          camp_name: updatedInfo.camp_name,
          camp_fees: updatedInfo.camp_fees,
          scheduled_date_time: updatedInfo.scheduled_date_time,
          venue: updatedInfo.venue,
          specialized_service: updatedInfo.specialized_service,
          healthcare_professional: updatedInfo.healthcare_professional,
          target_audience: updatedInfo.target_audience,
          description: updatedInfo.description,
          image: updatedInfo.image,
          participants: updatedInfo.participants,
          paymentStatus: updatedInfo.paymentStatus,
          confirmationStatus: updatedInfo.confirmationStatus,
          campId: updatedInfo.campId,
          interested: updatedInfo.interested,
        },
      };
      const result = await upcomingCollection.updateOne(filter, updatedCamp);
      res.send(result);
    });
    // update using put professional
    app.put("/upcomingPut/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateCount = req.body;
        const updatedCount = {
          $set: {
            interested: updateCount.interested,
          },
        }
        const result = await upcomingCollection.updateOne(query, updatedCount)
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })
    // update using put participant
    app.put("/upcomingPutParticipant/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateCount = req.body;
        const updatedCount = {
          $set: {
            participants: updateCount.participants,
          },
        }
        const result = await upcomingCollection.updateOne(query, updatedCount)
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })
    // update using put professional status
    app.put("/upcomingPutStatus/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateCount = req.body;
        const updatedCount = {
          $set: {
            professionalStatus: updateCount.professionalStatus,
          },
        }
        const result = await upcomingCollection.updateOne(query, updatedCount)
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })

    // Upcoming Registered List collection
    // post method
    app.post("/upcomingRegisteredList", async (req, res) => {
      try {
        const data = req.body;
        const result = await upcomingRegisteredListCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        res.send(error)
      }
    })

    // POST AND GET METHOD FOR FEEDBACK POST
    // post method
    app.post("/feedbackPost", async (req, res) => {
      const cartItem = req.body;
      console.log(cartItem);
      const result = await feedbackCollection.insertOne(cartItem);
      res.send(result);
    });
    app.get("/feedbackPost/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await feedbackCollection.findOne(query);
      res.send(result);
    });
    // get all method
    app.get("/feedbackPost", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      // const filteredData = result.filter((entry) => entry.participants > 0);
      res.send(result);
    });

    // POST AND GET METHOD FOR OrganizerReview POST
    // post method
    app.post("/organizerReview", async (req, res) => {
      const cartItem = req.body;
      console.log(cartItem);
      const result = await organizerReviewCollection.insertOne(cartItem);
      res.send(result);
    });
    app.get("/organizerReview/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await organizerReviewCollection.findOne(query);
      res.send(result);
    });
    // get all method
    app.get("/organizerReview", async (req, res) => {
      const result = await organizerReviewCollection.find().toArray();
      // const filteredData = result.filter((entry) => entry.participants > 0);
      res.send(result);
    });

    // POST AND GET METHOD FOR PARTICIPANT
    // post method
    app.post("/participants", async (req, res) => {
      const cartItem = req.body;
      const result = await participantsCollection.insertOne(cartItem);
      res.send(result);
    });
    app.get("/participants/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await participantsCollection.findOne(query);
      res.send(result);
    });
    // get all method
    app.get("/participants", async (req, res) => {
      const result = await participantsCollection.find().toArray();
      // const filteredData = result.filter((entry) => entry.participants > 0);
      res.send(result);
    });
    app.delete("/participants/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await participantsCollection.deleteOne(query);
      res.send(result);
    });
    app.put('/participants/incrementParticipants/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const doc = {$set: req.body}
        const result = await participantsCollection.updateOne( query, doc, {upsert:true});
        const result2 = await campusCollection.updateOne( query, doc, {upsert:true});
        console.log(result2);
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    })
    app.patch("/participants/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      const updatedCamp = {
        $set: {
          confirmationStatus: updatedInfo.confirmationStatus,
        },
      };
      await paymentCollection.updateOne(
        { transactionId: updatedInfo.transactionId },
        updatedCamp
      );
      const result = await participantsCollection.updateOne(
        filter,
        updatedCamp
      );
      res.send(result);
    });

    // POST AND GET METHOD FOR ORGANIZER MANAGEMENT
    // post method
    app.post("/ORManganate", async (req, res) => {
      const cartItem = req.body;
      const result = await ORManganateCollection.insertOne(cartItem);
      res.send(result);
    });
    // get all method
    app.get("/ORManganate", async (req, res) => {
      const result = await ORManganateCollection.find().toArray();
      res.send(result);
    });
    // patch request for canceling participants
    app.patch("/ORManganate/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateFields = {
        paymentStatus: "Canceled",
      };
      const result = await ORManganateCollection.updateOne(query, {
        $set: updateFields,
      });
      res.send(result);
    });
    // patch request for updating confirmation status
    app.patch("/ORManganate/:id", async (req, res) => {
      const id = req.params.id;
      const { confirmationStatus } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateFields = {
        confirmationStatus: confirmationStatus || "Confirmed",
      };

      try {
        const result = await ORManganateCollection.updateOne(query, {
          $set: updateFields,
        });

        if (result.modifiedCount === 1) {
          res.send({
            success: true,
            message: "Confirmation status updated successfully.",
          });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Participant not found." });
        }
      } catch (error) {
        console.error("Error updating confirmation status:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error." });
      }
    });

    // Delete request for canceling a organizer management
    app.delete("/ORManganate/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await ORManganateCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({
            success: true,
            message: "Participant deleted successfully.",
          });
        } else {
          res
            .status(404)
            .send({ success: false, message: "Participant not found." });
        }
      } catch (error) {
        console.error("Error deleting participant:", error);
        res
          .status(500)
          .send({ success: false, message: "Internal server error." });
      }
    });

    // MEDICAL CAMPS Details CRUD OPERATIONS
    // post menu items
    app.post("/camp_details", async (req, res) => {
      const cartItem = req.body;
      const result = await campDetailsCollection.insertOne(cartItem);
      res.send(result);
    });
    // get all menus
    app.get("/camp_details", async (req, res) => {
      const result = await campDetailsCollection.find().toArray();
      res.send(result);
    });
    // get with specific id
    app.get("/camp_details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campDetailsCollection.findOne(query);
      res.send(result);
    });

    // Payment intent
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { camp_fees } = req.body;
        const amount = parseInt(camp_fees * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        const paymentDetails = {
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
          // status: "Pending",
        };
        await paymentCollection.insertOne(paymentDetails);
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // GET PAYMENT
    // Get all payments
    app.get("/payments", async (req, res) => {
      const { email } = req.query;
      let query = {};
      if (email) {
        query = { email: email };
      }

      try {
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/payments/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await paymentCollection.findOne(query);
        if (!result) {
          res.status(404).send("Payment not found");
          return;
        }
        res.send(result);
      } catch (error) {
        // If any error occurs during database operation
        console.error("Error retrieving payment:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      participantsCollection.updateOne(
        { _id: new ObjectId(payment.participantId) },
        {
          $set: { paymentStatus: "paid", transactionId: payment.transactionId },
        },
        { upsert: true }
      );
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });
    app.patch("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedInfo = req.body;
      const updatedPayment = {
        $set: {
          Status: updatedInfo.Status,
          transactionId: updatedInfo.transactionId,
          date: updatedInfo.date,
          email: updatedInfo.email,
          camp_name: updatedInfo.camp_name,
          camp_fees: updatedInfo.camp_fees,
          confirmationStatus: updatedInfo.confirmationStatus,
          paymentStatus: updatedInfo.paymentStatus,
          venue: updatedInfo.venue,
          campId: updatedInfo.campId,
        },
      };
      const result = await paymentCollection.updateOne(filter, updatedPayment);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your Deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});