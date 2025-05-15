import axios from 'axios';
import { ApiError } from '../utils/errors.js';

const BOOK_API_ENDPOINT = process.env.BOOK_API_ENDPOINT;
const API_KEY = process.env.BOOK_API_KEY;
const ITEMS_PER_PAGE = 10;

class BookSearchService {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BOOK_API_ENDPOINT,
      timeout: parseInt(process.env.BOOK_API_TIMEOUT || '5000'),
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
  }

  async search({ query, searchType, page = 1 }) {
    try {
      const params = {
        [searchType === 'title' ? 'title' : 'search']: query,
        page,
        itemsPerPage: ITEMS_PER_PAGE
      };

      const response = await this.axiosInstance.get('/books', { params });
      return this.formatResponse(response, page);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  formatResponse(response, currentPage) {
    if (!response.data.items?.length) {
      throw new ApiError(404, 'No books found matching your search');
    }

    return {
      data: response.data.items,
      pagination: {
        currentPage,
        totalPages: Math.ceil(response.data.totalItems / ITEMS_PER_PAGE)
      }
    };
  }

  handleError(error) {
    return new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || 'Book search service unavailable'
    );
  }
}

export default new BookSearchService();
