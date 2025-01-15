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


   

    

    const categoriesCollection = client.db('libraryManagement').collection('categories');
     // categories collection
    app.get('/categories', async(req,res) => {
      const cursor = categoriesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // books collection

    const booksCollection = client.db('libraryManagement').collection('books');
    
    app.post('/book/borrow/:id', async (req, res) => {
      const {id} = req.params;
      const{name, email, returnDate} = req.body;

      const filter = { _id: new ObjectId(id)};
      const book = await booksCollection.findOne(filter);

      if(book.quantity <= 0){
        return res.send({ success:false, message: 'Sorry, this book is out of stock'});

      }
      const updateDoc = {
        $inc: { quantity: -1 },
      };

      try{
        const result = await booksCollection.updateOne(filter, updateDoc);
        if(result.modifiedCount > 0){

          const borrowedBook = {
            bookId: new ObjectId(id),
            name,
            email,
            returnDate,
            borrowedDate: new Date(),
          };

          const borrowedBooksCollection = client.db('libraryManagement').collection('borrowedBooks');
          const borrowResult = await borrowedBooksCollection.insertOne(borrowedBook);

          if (borrowResult.insertedId){
            res.send({ success: true, message: 'Book borrowed successfully'});
          }
          else{
            res.send({ success: false, message: 'Failed to add the book to BorrowedBooks'});
          }

        }
        else{
          res.send({ success: false, message: 'Failed to borrow the book'});
        }

      } catch(error){
        console.error('Error borrowing book:', error);
        res.send({success: false, message:'Error borrowing the book'});
      }
    });

    // post borrowed books
    app.post('/borrowedBooks/return/:id', async(req, res) =>{
      const {id} = req.params;
      const {bookId} = req.body;  // user is returning bookId

      const borrowedBookFilter = { _id: new ObjectId(id)};
      const bookFilter = { _id: new ObjectId(bookId)};

      try{
        // remove book 
        const deleteResult = await client.db('libraryManagement').collection('borrowedBooks').deleteOne(borrowedBookFilter);

        if(deleteResult.deletedCount > 0){
          const updateDoc = { $inc: {quantity: 1}};
          const updateResult = await booksCollection.updateOne(bookFilter, updateDoc);

          if(updateResult.modifiedCount > 0){
            res.send({ success: true, message: 'Book returned successfully'});
          } else{
            res.send({ success: false, message: 'Failed return book'});

          }
        }
        else{
          res.send({ success: false, message: 'Book not found borrowed list'});

        }
      }
      catch(error){
        res.send({ success: false, message: 'Error returning the book'});
      }


    });
    
    // get borrowed books data
    app.get('/borrowedBooks/:email', async(req, res) =>{
      const { email } = req.params;
      const borrowedBooks = await client.db('libraryManagement').collection('borrowedBooks').find({email}).toArray();

      // fetch the details from booksCollection
      const detailedBorrowedBooks = await Promise.all(
        borrowedBooks.map(async (borrowedBook) => {
          const book = await booksCollection.findOne({ _id: new ObjectId(borrowedBook.bookId)});

          return{
            ...borrowedBook,
            image: book?.image,
            name: book?.name,
            category: book?.category,
          };
        })
      )
      res.send(detailedBorrowedBooks);
    })
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


    // update books 
    app.put('/book/:id', async(req, res) => {
      const {id} = req.params;
      const {name, author, category, rating, image} = req.body;

      const filter = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          name,
          author,
          category,
          rating,
          image,
        },
      };
      try{
        const result = await booksCollection.updateOne(filter, updateDoc);
        res.send({ success: true, message: 'Book updated successfully'});

      }
      catch(error){
        res.send({success: false, message: 'Failed to update book'})

      }
    });

    // all books api

    app.get('/books', async (req, res) => {
      const books = await booksCollection.find().toArray();
      res.send(books);
    })

    // add book
    app.post('/addBook', async (req,res) => {
      const { image, name, quantity, author, category, description, rating} = req.body;
      const newBook = {
        image,
        name,
        quantity,
        author,
        category,
        description,
        rating,
      };

      try{
        const result = await booksCollection.insertOne(newBook);
        res.send({ success: true, message: 'Book added successfully'});

      } 
      catch(error){
        console.error('Failed to add book',error);
        res.send({ success: false, message: 'Failed to add book'});

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

