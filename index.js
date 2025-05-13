 import 'dotenv/config'; 
 import session from 'express-session';                                      
 import flash from 'connect-flash';                                          
 import passport from './config/passport.js';                                
 import User from './models/User.js';
 import express from "express";
 import axios from "axios";
 import morgan from "morgan";
 import bodyParser from "body-parser";
 import path from "path";
 import { fileURLToPath } from "url";
 import { Book, Wishlist, Order } from './models/index.js';

const app = express();
const PORT = process.env.PORT || 3003;

//API endpoints configuration
const BOOK_APIS = {
    OPEN_LIBRARY: 'https://api.booklooker.de/2.0',
  };
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(morgan('tiny'));

  // Connect to MongoDB                                                       
  mongoose.connect(process.env.MONGODB_URI, {                 
    useNewUrlParser: true,                                                    
    useUnifiedTopology: true                                                  
  })                                                                          
  .then(() => console.log('MongoDB connected'))                               
  .catch(err => console.log('MongoDB connection error:', err)); 

// Session configuration                                                    
app.use(session({                                                           
    secret: process.env.SESSION_SECRET, // Change this to a real secret                
    resave: false,                                                            
    saveUninitialized: true,                                                  
    cookie: { secure: false } // Set to true if using HTTPS
                       
  }));                                                                        
  console.log('Session Secret:', process.env.SESSION_SECRET);                                                                           
  // Flash messages                                                           
  app.use(flash());                                                           
                                                                              
  // Initialize Passport                                                      
  app.use(passport.initialize());                                             
  app.use(passport.session());             

// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Setting EJS as the view engine 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user and messages available in all views                            
app.use((req, res, next) => {                                               
    res.locals.currentUser = req.user;                                        
    res.locals.success = req.flash('success');                                
    res.locals.error = req.flash('error');                                    
    next();                                                                   
  });



//GET home page
app.get('/', (req, res)=>{
  res.render('index');
});

// GET books by author
app.get('/books', async (req, res) => {
  try {
      const response = await axios.get(endpoint, {
          params: {
              q: req.query.q || '', // Example: search query parameter
          }
      });
      console.log(response.data.isbn)
      res.render('books', { data: response.data }); // Render the books.ejs file
  } catch (error) {
      console.error('Error fetching data from Open Library API:', error);
      res.status(500).json({ error: 'An error occurred while fetching data.' });
  }
});

app.get('/books/title', async (req, res) => {
  try {
      const response = await axios.get(endpoint, {
          params: {
              title: req.query.title || '', // Example: search by title
          }
      });
      console.log(response.data);
      res.render('books', { data: response.data }); // Render the books.ejs file
  } catch (error) {
      console.error('Error fetching data from Open Library API:', error);
      res.status(500).json({ error: 'An error occurred while fetching data.' });
  }
});

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));