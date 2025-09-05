-- BookPath Database Schema
-- PostgreSQL database schema for BookPath application

-- Users table (extends Cognito user data)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    cognito_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_picture_url TEXT,
    bio TEXT,
    is_pro_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT,
    isbn VARCHAR(20),
    category VARCHAR(100),
    genre VARCHAR(100),
    published_date DATE,
    page_count INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    cover_image_url TEXT,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    created_by VARCHAR(255) REFERENCES users(cognito_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id VARCHAR(255) REFERENCES users(cognito_id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    cover_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection books junction table
CREATE TABLE IF NOT EXISTS collection_books (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(collection_id, book_id)
);

-- User book ratings
CREATE TABLE IF NOT EXISTS user_book_ratings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(cognito_id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

-- User reading progress
CREATE TABLE IF NOT EXISTS user_reading_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(cognito_id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER,
    reading_status VARCHAR(50) DEFAULT 'not_started', -- not_started, reading, completed, paused
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(cognito_id) ON DELETE CASCADE,
    favorite_genres TEXT[], -- Array of favorite genres
    reading_goal_pages INTEGER DEFAULT 0,
    reading_goal_books INTEGER DEFAULT 0,
    notification_preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_books_collection_id ON collection_books(collection_id);
CREATE INDEX IF NOT EXISTS idx_user_book_ratings_user_id ON user_book_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_ratings_book_id ON user_book_ratings(book_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_user_id ON user_reading_progress(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_book_ratings_updated_at BEFORE UPDATE ON user_book_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reading_progress_updated_at BEFORE UPDATE ON user_reading_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO users (cognito_id, email, first_name, last_name) VALUES
('sample-user-1', 'john.doe@example.com', 'John', 'Doe'),
('sample-user-2', 'jane.smith@example.com', 'Jane', 'Smith')
ON CONFLICT (cognito_id) DO NOTHING;

INSERT INTO books (title, author, description, isbn, category, genre, published_date, page_count, created_by) VALUES
('The Great Gatsby', 'F. Scott Fitzgerald', 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.', '978-0743273565', 'Fiction', 'Classic', '1925-04-10', 180, 'sample-user-1'),
('To Kill a Mockingbird', 'Harper Lee', 'The story of young Scout Finch and her father Atticus in a racially divided Alabama town.', '978-0446310789', 'Fiction', 'Classic', '1960-07-11', 281, 'sample-user-1'),
('1984', 'George Orwell', 'A dystopian social science fiction novel and cautionary tale.', '978-0451524935', 'Fiction', 'Dystopian', '1949-06-08', 328, 'sample-user-2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO collections (name, description, user_id, is_public) VALUES
('My Favorites', 'A collection of my favorite books', 'sample-user-1', true),
('Classic Literature', 'Timeless classics that everyone should read', 'sample-user-1', true),
('Summer Reading', 'Books perfect for summer vacation', 'sample-user-2', false)
ON CONFLICT (id) DO NOTHING;
