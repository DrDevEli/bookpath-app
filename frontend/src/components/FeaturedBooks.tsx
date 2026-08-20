import React from 'react';
import BookCard from './BookCard';

// Featured books — six landmark African novels. Covers are Open Library (https,
// no mixed content); ids are real Google Books volume IDs so the "View" button
// opens a working detail page. No prices — mock prices were removed (real prices
// need live Amazon PA-API data, which isn't wired for hardcoded features yet).
const featuredBooks = [
  {
    id: "google-iJplAAAAMAAJ",
    title: "Things Fall Apart",
    author: "Chinua Achebe",
    cover: "https://covers.openlibrary.org/b/id/12816943-L.jpg",
    description: "Chinua Achebe's landmark novel of Okonkwo and the collision of Igbo tradition with colonial change.",
  },
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
    id: "google-meAQPwAACAAJ",
    title: "A Grain of Wheat",
    author: "Ngũgĩ wa Thiong'o",
    cover: "https://covers.openlibrary.org/b/isbn/0435913565-L.jpg",
    description: "Kenya on the eve of independence, and the betrayals and secrets of the Mau Mau struggle.",
  },
  {
    id: "google-zBBshCdGbVwC",
    title: "Season of Migration to the North",
    author: "Tayeb Salih",
    cover: "https://covers.openlibrary.org/b/id/692835-L.jpg",
    description: "A Sudanese man's return from Europe sets off a haunting reckoning with colonialism.",
  },
  {
    id: "google-3Mdu2ius5AcC",
    title: "Disgrace",
    author: "J.M. Coetzee",
    cover: "https://covers.openlibrary.org/b/isbn/9780099289524-L.jpg",
    description: "A Cape Town professor's fall and a daughter's ordeal in post-apartheid South Africa.",
  },
];

export default function FeaturedBooks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
