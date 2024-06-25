import express from "express";
import axios from "axios";
import morgan from "morgan";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3003;

const endpoint = 'https://openlibrary.org/search.json';
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(morgan('tiny'));

// Get the directory name in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Setting EJS as the view engine 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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