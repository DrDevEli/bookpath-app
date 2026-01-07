import Joi from "joi";
import { ApiError } from "../utils/errors.js";

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email(),
    firstName: Joi.string().max(50),
    lastName: Joi.string().max(50),
    bio: Joi.string().max(500),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),
};

// Collection validation schemas
const collectionSchemas = {
  createCollection: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(500).allow('', null),
    isPublic: Joi.boolean().default(false),
    category: Joi.string().valid('general', 'wishlist', 'favorites', 'currently-reading', 'completed', 'custom').default('general'),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#3B82F6'),
    tags: Joi.array().items(Joi.string().trim().max(50)).default([]),
  }),

  updateCollection: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(500).allow('', null),
    isPublic: Joi.boolean(),
    category: Joi.string().valid('general', 'wishlist', 'favorites', 'currently-reading', 'completed', 'custom'),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    tags: Joi.array().items(Joi.string().trim().max(50)),
    sortBy: Joi.string().valid('addedAt', 'title', 'author', 'rating', 'dateFinished'),
    sortOrder: Joi.string().valid('asc', 'desc'),
  }),

  addBookToCollection: Joi.object({
    bookId: Joi.string().required(),
    title: Joi.string().required(),
    authors: Joi.array().items(Joi.string()).default([]),
    coverImage: Joi.string().uri().allow('', null),
    publisher: Joi.string().max(100).allow('', null),
    publishedDate: Joi.string().allow('', null),
    pageCount: Joi.number().integer().min(0).allow(null),
    isbn: Joi.string().max(20).allow('', null),
    language: Joi.string().max(10).allow('', null),
    genres: Joi.array().items(Joi.string().max(50)).default([]),
    notes: Joi.string().max(1000).allow('', null),
    readStatus: Joi.string().valid('to-read', 'reading', 'completed', 'abandoned', 'dnf').default('to-read'),
    rating: Joi.number().min(1).max(5).allow(null),
    dateStarted: Joi.date().allow(null),
    dateFinished: Joi.date().allow(null),
    progress: Joi.number().min(0).max(100).default(0),
    favorite: Joi.boolean().default(false),
    personalTags: Joi.array().items(Joi.string().max(30)).default([]),
  }),

  updateBookInCollection: Joi.object({
    notes: Joi.string().max(1000).allow('', null),
    rating: Joi.number().min(1).max(5).allow(null),
    readStatus: Joi.string().valid('to-read', 'reading', 'completed', 'abandoned', 'dnf'),
    dateStarted: Joi.date().allow(null),
    dateFinished: Joi.date().allow(null),
    progress: Joi.number().min(0).max(100),
    favorite: Joi.boolean(),
    personalTags: Joi.array().items(Joi.string().max(30)),
  }),

  searchBooks: Joi.object({
    query: Joi.string().max(200).allow(''),
    status: Joi.string().valid('to-read', 'reading', 'completed', 'abandoned', 'dnf'),
    genre: Joi.string().max(50),
    favorite: Joi.string().valid('true', 'false'),
  }),
};

// Book search validation schemas
const bookSearchSchemas = {
  searchBooks: Joi.object({
    query: Joi.string().min(1).max(200).required(),
    author: Joi.string().max(100),
    isbn: Joi.string().max(20),
    subject: Joi.string().max(100),
    publisher: Joi.string().max(100),
    startIndex: Joi.number().integer().min(0).default(0),
    maxResults: Joi.number().integer().min(1).max(40).default(10),
  }),
};

// Generic validation middleware
export const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[property];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ApiError(400, 'Validation error', { details: errorDetails });
    }

    req[property] = value;
    next();
  };
};

// Specific validation middleware functions
export const validateUserRegistration = validateRequest(userSchemas.register);
export const validateUserLogin = validateRequest(userSchemas.login);
export const validateUserUpdate = validateRequest(userSchemas.updateProfile);
export const validatePasswordChange = validateRequest(userSchemas.changePassword);

export const validateCreateCollection = validateRequest(collectionSchemas.createCollection);
export const validateUpdateCollection = validateRequest(collectionSchemas.updateCollection);
export const validateAddBookToCollection = validateRequest(collectionSchemas.addBookToCollection);
export const validateUpdateBookInCollection = validateRequest(collectionSchemas.updateBookInCollection);
export const validateSearchBooksInCollection = validateRequest(collectionSchemas.searchBooks, 'query');

export const validateBookSearch = validateRequest(bookSearchSchemas.searchBooks, 'query');

export default {
  validateRequest,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
  validateCreateCollection,
  validateUpdateCollection,
  validateAddBookToCollection,
  validateUpdateBookInCollection,
  validateSearchBooksInCollection,
  validateBookSearch,
};
