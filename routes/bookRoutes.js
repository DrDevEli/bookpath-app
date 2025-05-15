import express from 'express';                                       
import { searchBooks } from '../controllers/bookController.js';      
import { rateLimiterMiddleware } from '../middleware/rateLimiter.js';
                                                                     
const router = express.Router();                                     
                                                                     
router.get('/', rateLimiterMiddleware, searchBooks);                 
router.get('/title', rateLimiterMiddleware, searchBooks);            
                                                                     
export default router; 