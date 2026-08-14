/**
 * SEO landing-page catalog for BookPath.
 *
 * Each entry is one crawlable, indexable landing page rendered server-side.
 * Three page types: genre (broad category hub), topic (long-tail keyword),
 * author (notable author hub). EN + DE mix — DE targets the amazon.de tag.
 *
 * `query` is the Google Books search string. `category` maps to the backend's
 * normalized categories (Fiction, Sci-Fi, Fantasy, Mystery, Romance, History,
 * Biography, Self-Help, Business, Tech, Non-fiction) for internal linking and
 * breadcrumb/schema markup.
 */

export const SITE_URL = process.env.SITE_URL || "https://bookpath.org";

export const SITE_NAME = "BookPath";

export const GENRES = [
  { slug: "fiction", name: "Fiction", query: "fiction", category: "Fiction", lang: "en" },
  { slug: "non-fiction", name: "Non-fiction", query: "nonfiction", category: "Non-fiction", lang: "en" },
  { slug: "science-fiction", name: "Sci-Fi", query: "science fiction", category: "Sci-Fi", lang: "en" },
  { slug: "fantasy", name: "Fantasy", query: "fantasy", category: "Fantasy", lang: "en" },
  { slug: "mystery", name: "Mystery", query: "mystery", category: "Mystery", lang: "en" },
  { slug: "romance", name: "Romance", query: "romance", category: "Romance", lang: "en" },
  { slug: "history", name: "History", query: "history", category: "History", lang: "en" },
  { slug: "biography", name: "Biography", query: "biography", category: "Biography", lang: "en" },
  { slug: "self-help", name: "Self-Help", query: "self-help", category: "Self-Help", lang: "en" },
  { slug: "business", name: "Business", query: "business", category: "Business", lang: "en" },
  { slug: "technology", name: "Tech", query: "technology", category: "Tech", lang: "en" },
];

export const TOPICS = [
  // ---- Fiction ----
  { slug: "best-fiction-books", name: "Best Fiction Books", query: "best fiction books", category: "Fiction", lang: "en" },
  { slug: "best-novels-of-all-time", name: "Best Novels of All Time", query: "greatest novels", category: "Fiction", lang: "en" },
  { slug: "classic-literature", name: "Classic Literature", query: "classic literature", category: "Fiction", lang: "en" },
  { slug: "contemporary-fiction", name: "Contemporary Fiction", query: "contemporary fiction", category: "Fiction", lang: "en" },
  { slug: "historical-fiction", name: "Historical Fiction", query: "historical fiction", category: "Fiction", lang: "en" },
  { slug: "literary-fiction", name: "Literary Fiction", query: "literary fiction", category: "Fiction", lang: "en" },
  { slug: "short-story-collections", name: "Short Story Collections", query: "short stories", category: "Fiction", lang: "en" },
  { slug: "coming-of-age-books", name: "Coming of Age Books", query: "coming of age", category: "Fiction", lang: "en" },
  { slug: "war-novels", name: "War Novels", query: "war novel", category: "Fiction", lang: "en" },
  { slug: "adventure-books", name: "Adventure Books", query: "adventure", category: "Fiction", lang: "en" },

  // ---- Thriller / Mystery / Crime ----
  { slug: "best-thriller-books", name: "Best Thriller Books", query: "best thriller books", category: "Mystery", lang: "en" },
  { slug: "psychological-thrillers", name: "Psychological Thrillers", query: "psychological thriller", category: "Mystery", lang: "en" },
  { slug: "crime-fiction", name: "Crime Fiction", query: "crime fiction", category: "Mystery", lang: "en" },
  { slug: "detective-novels", name: "Detective Novels", query: "detective novels", category: "Mystery", lang: "en" },
  { slug: "best-mystery-books", name: "Best Mystery Books", query: "best mystery books", category: "Mystery", lang: "en" },
  { slug: "cozy-mysteries", name: "Cozy Mysteries", query: "cozy mystery", category: "Mystery", lang: "en" },
  { slug: "spy-thrillers", name: "Spy Thrillers", query: "spy thriller", category: "Mystery", lang: "en" },

  // ---- Horror ----
  { slug: "best-horror-books", name: "Best Horror Books", query: "best horror books", category: "Fiction", lang: "en" },
  { slug: "gothic-horror", name: "Gothic Horror", query: "gothic horror", category: "Fiction", lang: "en" },

  // ---- Romance ----
  { slug: "best-romance-books", name: "Best Romance Books", query: "best romance books", category: "Romance", lang: "en" },
  { slug: "contemporary-romance", name: "Contemporary Romance", query: "contemporary romance", category: "Romance", lang: "en" },
  { slug: "romantic-comedy-books", name: "Romantic Comedy Books", query: "romantic comedy", category: "Romance", lang: "en" },
  { slug: "romantasy-books", name: "Romantasy Books", query: "fantasy romance", category: "Fantasy", lang: "en" },

  // ---- Fantasy ----
  { slug: "best-fantasy-books", name: "Best Fantasy Books", query: "best fantasy books", category: "Fantasy", lang: "en" },
  { slug: "epic-fantasy-series", name: "Epic Fantasy Series", query: "epic fantasy", category: "Fantasy", lang: "en" },
  { slug: "urban-fantasy", name: "Urban Fantasy", query: "urban fantasy", category: "Fantasy", lang: "en" },
  { slug: "dark-fantasy", name: "Dark Fantasy", query: "dark fantasy", category: "Fantasy", lang: "en" },
  { slug: "high-fantasy", name: "High Fantasy", query: "high fantasy", category: "Fantasy", lang: "en" },
  { slug: "dragon-books", name: "Dragon Books", query: "dragon fantasy", category: "Fantasy", lang: "en" },

  // ---- Sci-Fi ----
  { slug: "best-sci-fi-books", name: "Best Sci-Fi Books", query: "best science fiction books", category: "Sci-Fi", lang: "en" },
  { slug: "hard-science-fiction", name: "Hard Science Fiction", query: "hard science fiction", category: "Sci-Fi", lang: "en" },
  { slug: "space-opera", name: "Space Opera", query: "space opera", category: "Sci-Fi", lang: "en" },
  { slug: "dystopian-books", name: "Dystopian Books", query: "dystopian", category: "Sci-Fi", lang: "en" },
  { slug: "cyberpunk-books", name: "Cyberpunk Books", query: "cyberpunk", category: "Sci-Fi", lang: "en" },
  { slug: "time-travel-books", name: "Time Travel Books", query: "time travel", category: "Sci-Fi", lang: "en" },
  { slug: "post-apocalyptic-books", name: "Post-Apocalyptic Books", query: "post apocalyptic", category: "Sci-Fi", lang: "en" },

  // ---- Young Adult ----
  { slug: "best-young-adult-books", name: "Best Young Adult Books", query: "young adult", category: "Fiction", lang: "en" },
  { slug: "ya-fantasy-books", name: "YA Fantasy Books", query: "young adult fantasy", category: "Fantasy", lang: "en" },

  // ---- History ----
  { slug: "best-history-books", name: "Best History Books", query: "best history books", category: "History", lang: "en" },
  { slug: "world-war-2-books", name: "World War 2 Books", query: "world war 2", category: "History", lang: "en" },
  { slug: "ancient-history-books", name: "Ancient History Books", query: "ancient history", category: "History", lang: "en" },
  { slug: "medieval-history-books", name: "Medieval History Books", query: "medieval history", category: "History", lang: "en" },
  { slug: "military-history-books", name: "Military History Books", query: "military history", category: "History", lang: "en" },
  { slug: "roman-empire-books", name: "Roman Empire Books", query: "roman empire", category: "History", lang: "en" },
  { slug: "american-history-books", name: "American History Books", query: "american history", category: "History", lang: "en" },

  // ---- Biography ----
  { slug: "best-biographies", name: "Best Biographies", query: "best biographies", category: "Biography", lang: "en" },
  { slug: "best-memoirs", name: "Best Memoirs", query: "memoir", category: "Biography", lang: "en" },
  { slug: "celebrity-memoirs", name: "Celebrity Memoirs", query: "celebrity memoir", category: "Biography", lang: "en" },
  { slug: "musician-biographies", name: "Musician Biographies", query: "musician biography", category: "Biography", lang: "en" },
  { slug: "entrepreneur-biographies", name: "Entrepreneur Biographies", query: "entrepreneur biography", category: "Biography", lang: "en" },

  // ---- Self-Help ----
  { slug: "best-self-help-books", name: "Best Self-Help Books", query: "best self help books", category: "Self-Help", lang: "en" },
  { slug: "personal-development-books", name: "Personal Development Books", query: "personal development", category: "Self-Help", lang: "en" },
  { slug: "productivity-books", name: "Productivity Books", query: "productivity", category: "Self-Help", lang: "en" },
  { slug: "mindfulness-books", name: "Mindfulness Books", query: "mindfulness", category: "Self-Help", lang: "en" },
  { slug: "meditation-books", name: "Meditation Books", query: "meditation", category: "Self-Help", lang: "en" },
  { slug: "habit-books", name: "Habit Books", query: "habits", category: "Self-Help", lang: "en" },
  { slug: "confidence-books", name: "Confidence Books", query: "confidence", category: "Self-Help", lang: "en" },
  { slug: "communication-skills-books", name: "Communication Skills Books", query: "communication skills", category: "Self-Help", lang: "en" },
  { slug: "leadership-books", name: "Leadership Books", query: "leadership", category: "Self-Help", lang: "en" },

  // ---- Business / Finance ----
  { slug: "best-business-books", name: "Best Business Books", query: "best business books", category: "Business", lang: "en" },
  { slug: "entrepreneurship-books", name: "Entrepreneurship Books", query: "entrepreneurship", category: "Business", lang: "en" },
  { slug: "investing-books", name: "Investing Books", query: "investing", category: "Business", lang: "en" },
  { slug: "personal-finance-books", name: "Personal Finance Books", query: "personal finance", category: "Business", lang: "en" },
  { slug: "marketing-books", name: "Marketing Books", query: "marketing", category: "Business", lang: "en" },
  { slug: "management-books", name: "Management Books", query: "management", category: "Business", lang: "en" },
  { slug: "startup-books", name: "Startup Books", query: "startup", category: "Business", lang: "en" },
  { slug: "sales-books", name: "Sales Books", query: "sales", category: "Business", lang: "en" },
  { slug: "negotiation-books", name: "Negotiation Books", query: "negotiation", category: "Business", lang: "en" },
  { slug: "economics-books", name: "Economics Books", query: "economics", category: "Business", lang: "en" },
  { slug: "money-management-books", name: "Money Management Books", query: "money management", category: "Business", lang: "en" },

  // ---- Tech ----
  { slug: "best-programming-books", name: "Best Programming Books", query: "programming", category: "Tech", lang: "en" },
  { slug: "software-engineering-books", name: "Software Engineering Books", query: "software engineering", category: "Tech", lang: "en" },
  { slug: "computer-science-books", name: "Computer Science Books", query: "computer science", category: "Tech", lang: "en" },
  { slug: "data-science-books", name: "Data Science Books", query: "data science", category: "Tech", lang: "en" },
  { slug: "machine-learning-books", name: "Machine Learning Books", query: "machine learning", category: "Tech", lang: "en" },
  { slug: "artificial-intelligence-books", name: "Artificial Intelligence Books", query: "artificial intelligence", category: "Tech", lang: "en" },
  { slug: "cybersecurity-books", name: "Cybersecurity Books", query: "cybersecurity", category: "Tech", lang: "en" },
  { slug: "python-programming-books", name: "Python Programming Books", query: "python programming", category: "Tech", lang: "en" },
  { slug: "javascript-books", name: "JavaScript Books", query: "javascript", category: "Tech", lang: "en" },

  // ---- German (DE) — amazon.de target ----
  { slug: "beste-fantasy-buecher", name: "Beste Fantasy Bücher", query: "fantasy", category: "Fantasy", lang: "de" },
  { slug: "sci-fi-buecher", name: "Sci-Fi Bücher", query: "science fiction", category: "Sci-Fi", lang: "de" },
  { slug: "romane-bestseller", name: "Romane Bestseller", query: "romane", category: "Fiction", lang: "de" },
  { slug: "krimis-bestseller", name: "Krimis Bestseller", query: "krimi", category: "Mystery", lang: "de" },
  { slug: "thriller-buecher", name: "Thriller Bücher", query: "thriller", category: "Mystery", lang: "de" },
  { slug: "horror-buecher", name: "Horror Bücher", query: "horror", category: "Fiction", lang: "de" },
  { slug: "liebesromane", name: "Liebesromane", query: "liebesroman", category: "Romance", lang: "de" },
  { slug: "buecher-ueber-geld", name: "Bücher über Geld", query: "geld", category: "Business", lang: "de" },
  { slug: "finanzen-buecher", name: "Finanzen Bücher", query: "finanzen", category: "Business", lang: "de" },
  { slug: "geldanlage-buecher", name: "Geldanlage Bücher", query: "geldanlage", category: "Business", lang: "de" },
  { slug: "aktien-buecher", name: "Aktien Bücher", query: "aktien", category: "Business", lang: "de" },
  { slug: "business-buecher", name: "Business Bücher", query: "business", category: "Business", lang: "de" },
  { slug: "persoenlichkeitsentwicklung-buecher", name: "Persönlichkeitsentwicklung Bücher", query: "persönlichkeitsentwicklung", category: "Self-Help", lang: "de" },
  { slug: "selbsthilfe-buecher", name: "Selbsthilfe Bücher", query: "selbsthilfe", category: "Self-Help", lang: "de" },
  { slug: "erfolg-buecher", name: "Erfolg Bücher", query: "erfolg", category: "Self-Help", lang: "de" },
  { slug: "produktivitaet-buecher", name: "Produktivität Bücher", query: "produktivität", category: "Self-Help", lang: "de" },
  { slug: "mindset-buecher", name: "Mindset Bücher", query: "mindset", category: "Self-Help", lang: "de" },
  { slug: "buecher-ueber-psychologie", name: "Bücher über Psychologie", query: "psychologie", category: "Self-Help", lang: "de" },
  { slug: "geschichte-buecher", name: "Geschichte Bücher", query: "geschichte", category: "History", lang: "de" },
  { slug: "biografien-bestseller", name: "Biografien Bestseller", query: "biografie", category: "Biography", lang: "de" },
  { slug: "kochbuecher-bestseller", name: "Kochbücher Bestseller", query: "kochbuch", category: "Non-fiction", lang: "de" },
  { slug: "gesundheit-buecher", name: "Gesundheit Bücher", query: "gesundheit", category: "Non-fiction", lang: "de" },
  { slug: "ernaehrung-buecher", name: "Ernährung Bücher", query: "ernährung", category: "Non-fiction", lang: "de" },
  { slug: "programmieren-lernen-buch", name: "Programmieren lernen", query: "programmieren lernen", category: "Tech", lang: "de" },
  { slug: "buecher-ueber-ki", name: "Bücher über Künstliche Intelligenz", query: "künstliche intelligenz", category: "Tech", lang: "de" },
  { slug: "englisch-lernen-buecher", name: "Englisch lernen Bücher", query: "englisch lernen", category: "Non-fiction", lang: "de" },
  { slug: "jugendbuecher-bestseller", name: "Jugendbücher Bestseller", query: "jugendbuch", category: "Fiction", lang: "de" },
  { slug: "buecher-fuer-kinder", name: "Bücher für Kinder", query: "kinderbuch", category: "Fiction", lang: "de" },
];

export const AUTHORS = [
  { slug: "jrr-tolkien", name: "J.R.R. Tolkien", query: "J.R.R. Tolkien", category: "Fantasy", lang: "en" },
  { slug: "brandon-sanderson", name: "Brandon Sanderson", query: "Brandon Sanderson", category: "Fantasy", lang: "en" },
  { slug: "george-rr-martin", name: "George R.R. Martin", query: "George R.R. Martin", category: "Fantasy", lang: "en" },
  { slug: "sarah-j-maas", name: "Sarah J. Maas", query: "Sarah J. Maas", category: "Fantasy", lang: "en" },
  { slug: "stephen-king", name: "Stephen King", query: "Stephen King", category: "Fiction", lang: "en" },
  { slug: "jk-rowling", name: "J.K. Rowling", query: "J.K. Rowling", category: "Fantasy", lang: "en" },
  { slug: "agatha-christie", name: "Agatha Christie", query: "Agatha Christie", category: "Mystery", lang: "en" },
  { slug: "lee-child", name: "Lee Child", query: "Lee Child", category: "Mystery", lang: "en" },
  { slug: "james-patterson", name: "James Patterson", query: "James Patterson", category: "Mystery", lang: "en" },
  { slug: "john-grisham", name: "John Grisham", query: "John Grisham", category: "Mystery", lang: "en" },
  { slug: "colleen-hoover", name: "Colleen Hoover", query: "Colleen Hoover", category: "Romance", lang: "en" },
  { slug: "taylor-jenkins-reid", name: "Taylor Jenkins Reid", query: "Taylor Jenkins Reid", category: "Romance", lang: "en" },
  { slug: "emily-henry", name: "Emily Henry", query: "Emily Henry", category: "Romance", lang: "en" },
  { slug: "isaac-asimov", name: "Isaac Asimov", query: "Isaac Asimov", category: "Sci-Fi", lang: "en" },
  { slug: "frank-herbert", name: "Frank Herbert", query: "Frank Herbert", category: "Sci-Fi", lang: "en" },
  { slug: "arthur-c-clarke", name: "Arthur C. Clarke", query: "Arthur C. Clarke", category: "Sci-Fi", lang: "en" },
  { slug: "ursula-k-le-guin", name: "Ursula K. Le Guin", query: "Ursula K. Le Guin", category: "Sci-Fi", lang: "en" },
  { slug: "haruki-murakami", name: "Haruki Murakami", query: "Haruki Murakami", category: "Fiction", lang: "en" },
  { slug: "stephen-hawking", name: "Stephen Hawking", query: "Stephen Hawking", category: "Non-fiction", lang: "en" },
  { slug: "yuval-noah-harari", name: "Yuval Noah Harari", query: "Yuval Noah Harari", category: "History", lang: "en" },
  { slug: "malcolm-gladwell", name: "Malcolm Gladwell", query: "Malcolm Gladwell", category: "Self-Help", lang: "en" },
  { slug: "robert-greene", name: "Robert Greene", query: "Robert Greene", category: "Self-Help", lang: "en" },
  { slug: "james-clear", name: "James Clear", query: "James Clear", category: "Self-Help", lang: "en" },
  { slug: "ryan-holiday", name: "Ryan Holiday", query: "Ryan Holiday", category: "Self-Help", lang: "en" },
  { slug: "cal-newport", name: "Cal Newport", query: "Cal Newport", category: "Self-Help", lang: "en" },
  { slug: "mark-manson", name: "Mark Manson", query: "Mark Manson", category: "Self-Help", lang: "en" },
  { slug: "dale-carnegie", name: "Dale Carnegie", query: "Dale Carnegie", category: "Self-Help", lang: "en" },
  { slug: "simon-sinek", name: "Simon Sinek", query: "Simon Sinek", category: "Business", lang: "en" },
  { slug: "ray-dalio", name: "Ray Dalio", query: "Ray Dalio", category: "Business", lang: "en" },
  { slug: "robert-kiyosaki", name: "Robert Kiyosaki", query: "Robert Kiyosaki", category: "Business", lang: "en" },
  { slug: "benjamin-graham", name: "Benjamin Graham", query: "Benjamin Graham", category: "Business", lang: "en" },
  { slug: "nassim-taleb", name: "Nassim Taleb", query: "Nassim Taleb", category: "Business", lang: "en" },
  { slug: "daniel-kahneman", name: "Daniel Kahneman", query: "Daniel Kahneman", category: "Business", lang: "en" },
  { slug: "walter-isaacson", name: "Walter Isaacson", query: "Walter Isaacson", category: "Biography", lang: "en" },
  { slug: "michelle-obama", name: "Michelle Obama", query: "Michelle Obama", category: "Biography", lang: "en" },
  { slug: "brene-brown", name: "Brené Brown", query: "Brené Brown", category: "Self-Help", lang: "en" },
];

// Convenience lookups keyed by slug for O(1) controller access.
const bySlug = (list) => Object.fromEntries(list.map((e) => [e.slug, e]));

export const GENRE_BY_SLUG = bySlug(GENRES);
export const TOPIC_BY_SLUG = bySlug(TOPICS);
export const AUTHOR_BY_SLUG = bySlug(AUTHORS);

export const CATALOG_COUNT = GENRES.length + TOPICS.length + AUTHORS.length;

export default { GENRES, TOPICS, AUTHORS, GENRE_BY_SLUG, TOPIC_BY_SLUG, AUTHOR_BY_SLUG, CATALOG_COUNT };
