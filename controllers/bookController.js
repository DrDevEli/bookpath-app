import bookSearchService from '../services/bookSearchService.js';

class BookController {
  static async searchBooks(req, res) {
    try {
      const { q, page = 1 } = req.query;
      const result = await bookSearchService.search({
        query: q,
        searchType: 'author',
        page
      });

      res.render('books', {
        data: result.data,
        query: q,
        searchType: 'author'
      });
    } catch (error) {
      res.status(error.status || 500).render('books', {
        error: error.message || 'Book search failed'
      });
    }
  }

  static async searchBooksByTitle(req, res) {
    try {
      const { title, page = 1 } = req.query;
      const result = await bookSearchService.search({
        query: title,
        searchType: 'title',
        page
      });

      res.render('books', {
        data: result.data,
        query: title,
        searchType: 'title'
      });
    } catch (error) {
      res.status(error.status || 500).render('books', {
        error: error.message || 'Title search failed'
      });
    }
  }
}

export default BookController;
