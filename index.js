const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin: [
    'http://localhost:5173'
    // 'https://cars-doctor-8e881.web.app',
    // 'https://cars-doctor-8e881.firebaseapp.com'
  ],

  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
//middleware//middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //error
    if (err) {
      return res.status(401).send({ message: 'Unauthorized' })
    }
    //decoded
    console.log('Value in the token', decoded);
    req.user = decoded;
    next()
  })

}






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vo6ptqf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middlewares
const logger = (req, res, next) => {
  console.log(req.method, req.url);
  next();
}

async function run() {
  try {

    await client.connect();

    const serviceCollection = client.db('carsDoctor').collection('services');
    const bookingCollection = client.db('carsDoctor').collection('booking');

    // AUTH RELATED 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send({ success: true });
    })
    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token',{maxAge:0}).send({ success: true })
    })

    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const option = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      }
      const result = await serviceCollection.findOne(query, option);
      res.send(result);
    })

    // booking start
    app.get('/booking', verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return req.status(403).send({ message: 'forbidden access' })
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    app.patch('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.delete('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })
    // booking end



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Doctors is running')
})
app.listen(port, () => {
  console.log(`Car doctor server is running on port ${port}`);
})