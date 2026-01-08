import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Layout Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { BookDetails } from './pages/BookDetails';
import { Collections } from './pages/Collections';
import { CollectionDetail } from './pages/CollectionDetail';
import Category from './pages/Category';
import { BookSearch } from './components/BookSearch';

// Styles
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="App flex flex-col min-h-screen relative">
        {/* Background Image Layer */}
        <div 
          className="fixed inset-0 z-0 bg-background"
          style={{
            backgroundImage: 'url(/background_smooth.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            opacity: 0.3
          }}
        />
        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/search" element={<BookSearch />} />
            <Route path="/books/:id" element={<BookDetails />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/:id" element={<CollectionDetail />} />
            <Route path="/category" element={<Category />} />
            <Route path="/category/:category" element={<Category />} />
          </Routes>
          </main>
          <Footer />
          <Toaster />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
