import React from 'react';
import BookCard from './BookCard';

// Featured books — three landmark African novels. Covers are Open Library (https,
// no mixed content); ids are real Google Books volume IDs so the "View" button
// opens a working detail page. No prices — mock prices were removed (real prices
// need live Amazon PA-API data, which isn't wired for hardcoded features yet).
const featuredBooks = [
  {
    id: "google--Bkrc1Fbm-EC",
    title: "Half of a Yellow Sun",
    author: "Chimamanda Ngozi Adichie",
    cover: "https://covers.openlibrary.org/b/id/8472660-L.jpg",
    description: "Three lives entwined during the Nigerian Civil War, from the author of Americanah.",
  },
  {
    id: "google-7Z8CEAAAQBAJ",
    title: "Nervous Conditions",
    author: "Tsitsi Dangarembga",
    cover: "https://covers.openlibrary.org/b/id/7934158-L.jpg",
    description: "A Shona girl's coming of age under colonialism and patriarchy in 1960s Rhodesia.",
  },
  {
    id: "google-3Mdu2ius5AcC",
    title: "Disgrace",
    author: "J.M. Coetzee",
    cover: "https://covers.openlibrary.org/b/isbn/9780099289524-L.jpg",
    description: "A Cape Town professor's fall and a daughter's ordeal in post-apartheid South Africa.",
  },
  {
    id: "google-fh-eCgAAQBAJ",
    title: "Homegoing",
    author: "Yaa Gyasi",
    cover: "https://covers.openlibrary.org/b/id/8081171-L.jpg",
    description: "Two half-sisters born in eighteenth-century Ghana, and the generations that follow across continents.",
  },
];

export default function FeaturedBooks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {featuredBooks.map((book) => (
        <BookCard
          key={book.id}
          book={{
            id: book.id,
            title: book.title,
            authors: [book.author],
            coverImage: book.cover,
            description: book.description,
          }}
          source="featured"
        />
      ))}
    </div>
  );
}
