import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

interface Book {
  id?: string;
  bookId?: string;
  title: string;
  authors: string[];
  firstPublishYear?: number;
  coverImage?: string;
  editionCount?: number;
  hasFullText?: boolean;
  ratingsAverage?: number;
  ratingsCount?: number;
  openLibraryKey?: string;
  price?: number;
  condition?: 'new' | 'used' | 'unknown';
  category?: string;
  description?: string;
  readStatus?: 'to-read' | 'reading' | 'completed' | 'abandoned';
  rating?: number;
  notes?: string;
  progress?: number;
  source?: string;
}

interface BookCardProps {
  book: Book;
  onAddToCollection?: (bookId: string) => void;
  onToggleFavorite?: (bookId: string) => void;
  isFavorite?: boolean;
  showAddButton?: boolean;
  isLoggedIn?: boolean;
  showReadStatus?: boolean;
  showProgress?: boolean;
  onEdit?: (bookId: string) => void;
  onRemove?: (bookId: string) => void;
}

export function BookCard({ 
  book, 
  onAddToCollection, 
  onToggleFavorite, 
  isFavorite = false, 
  showAddButton = false,
  isLoggedIn = false,
  showReadStatus = false,
  showProgress = false,
  onEdit,
  onRemove
}: BookCardProps) {
  const getRatingStars = (rating?: number) => {
    if (!rating) return 'No rating';
    return '⭐'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  const getReadStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'reading': return 'bg-blue-100 text-blue-800';
      case 'abandoned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReadStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'reading': return 'Reading';
      case 'abandoned': return 'Abandoned';
      default: return 'To Read';
    }
  };

  return (
    <div
      className="flex flex-col bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 hover:scale-[1.02] p-4 items-center min-h-[320px] group"
      style={{
        background: 'linear-gradient(135deg, rgba(74, 0, 127, 0.1) 0%, rgba(0, 230, 230, 0.1) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Cover Image */}
      <div className="relative mb-3">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-20 h-28 object-cover rounded transition-transform duration-300 group-hover:scale-105 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-28 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-gray-400 text-xs text-center">No Cover</span>
          </div>
        )}
        
        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(book.id || book.bookId || '')}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-white/80 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <span className={`text-sm transition-all duration-300 ${isFavorite ? 'text-red-500 scale-110' : 'text-gray-400'}`}> 
              {isFavorite ? '❤️' : '🤍'}
            </span>
          </button>
        )}
      </div>

      {/* Book Info */}
      <div className="w-full text-center flex-1 flex flex-col" style={{ color: 'rgb(30, 41, 59)' }}>
        <div className="font-semibold text-lg mb-1 line-clamp-2 group-hover:opacity-80 transition-opacity duration-300" title={book.title} style={{ color: 'rgb(30, 41, 59)' }}>
          {book.title}
        </div>
        <div className="text-sm mb-2 line-clamp-1" title={book.authors.join(', ')} style={{ color: 'rgb(30, 41, 59)' }}>
          by {book.authors.join(', ')}
        </div>
        
        {book.description && (
          <div className="text-xs mb-2 line-clamp-3" title={book.description} style={{ color: 'rgb(30, 41, 59)' }}>
            {book.description}
          </div>
        )}

        {/* Book Details */}
        <div className="space-y-1 text-xs mb-3" style={{ color: 'rgb(30, 41, 59)' }}>
          {book.firstPublishYear && (
            <p>Year: {book.firstPublishYear}</p>
          )}
          {book.category && (
            <p>Category: {book.category}</p>
          )}
          {book.editionCount && (
            <p>Editions: {book.editionCount}</p>
          )}
          {book.ratingsAverage && (
            <p>Rating: {getRatingStars(book.ratingsAverage)}</p>
          )}
          {book.rating && showReadStatus && (
            <p>Your Rating: {getRatingStars(book.rating)}</p>
          )}
        </div>

        {/* Read Status */}
        {showReadStatus && book.readStatus && (
          <div className="mb-3">
            <span className={`text-xs px-2 py-1 rounded-full ${getReadStatusColor(book.readStatus)}`}>
              {getReadStatusText(book.readStatus)}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {showProgress && book.progress !== undefined && book.progress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'rgb(30, 41, 59)' }}>
              <span>Progress</span>
              <span>{book.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${book.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        {book.notes && (
          <div className="text-xs mb-3 italic" style={{ color: 'rgb(30, 41, 59)' }}>
            "{book.notes}"
          </div>
        )}

        {/* Price Tag */}
        {typeof book.price === 'number' && (
          <span className="inline-block mb-3 px-2 py-0.5 bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-400 text-yellow-900 text-xs font-bold rounded-full shadow-sm border border-yellow-300">
            ${book.price.toFixed(2)}
          </span>
        )}
        {book.condition && book.condition !== 'unknown' && (
          <span className={`inline-block mb-3 ml-1 px-2 py-0.5 text-xs font-bold rounded-full shadow-sm border ${
            book.condition === 'new' 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-blue-100 text-blue-800 border-blue-200'
          }`}>
            {book.condition === 'new' ? 'New' : 'Used'}
          </span>
        )}

        {/* Action Buttons */}
        <div className="mt-auto flex gap-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="transition-all duration-300 hover:scale-105 text-xs px-2 py-1 h-8 min-h-0 w-full border-primary text-primary font-semibold"
          >
            <Link to={`/books/${book.openLibraryKey ? book.openLibraryKey.replace('/works/', '') : (book.id || book.bookId || '')}`}>View</Link>
          </Button>
          
          {showAddButton && isLoggedIn && onAddToCollection && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAddToCollection(book.id || book.bookId || '')}
              className="transition-all duration-300 hover:scale-105 text-xs px-2 py-1 h-8 min-h-0 w-full border-secondary text-secondary font-semibold"
            >
              +
            </Button>
          )}

          {onEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(book.id || book.bookId || '')}
              className="transition-all duration-300 hover:scale-105 text-xs px-2 py-1 h-8 min-h-0 w-full border-blue-500 text-blue-500 font-semibold"
            >
              Edit
            </Button>
          )}

          {onRemove && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onRemove(book.id || book.bookId || '')}
              className="transition-all duration-300 hover:scale-105 text-xs px-2 py-1 h-8 min-h-0 w-full border-red-500 text-red-500 font-semibold"
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookCard; 