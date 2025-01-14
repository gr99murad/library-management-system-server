const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c4vcn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    // categories collection

    const categoriesCollection = client.db('libraryManagement').collection('categories');

    app.get('/categories', async(req,res) => {
      const cursor = categoriesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // books collection

    const booksCollection = client.db('libraryManagement').collection('books');
    const borrowedBooksCollection = client.db('libraryManagement').collection('borrowedBooks');

    app.get('/books/:category', async (req, res) => {
      const category = req.params.category;
      const books = await booksCollection.find({category: category}).toArray();
      res.send(books);
    });

    // api for books Id
    app.get('/book/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const book = await booksCollection.findOne(query);
      res.send(book);
    });

    app.post('/borrowBook', async (req, res) => {
      const {bookId, returnDate, userName, userEmail} = req.body;
      const filter = { _id: new ObjectId(bookId)};
      const updateDoc = {
        $inc: { quantity: -1}
      };
      const book = await booksCollection.findOne(filter);
      if(book.quantity > 0){
        await booksCollection.updateOne(filter, updateDoc);
        const borrowEntry = {bookId,returnDate,userName,userEmail};
        await borrowedBooksCollection.insertOne(borrowEntry);
        res.send({ success: true, message: 'Book borrowed successfully'});

      }
      else{
        res.send({ success: false, message: 'Book out of stock'});
      }
    });



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/' , (req, res) => {
    res.send('Libarary management system')

})

app.listen(port, () =>{
    console.log(`Running library at: ${port}`)
})

