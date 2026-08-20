import { useEffect } from "react";
import { Link } from "react-router-dom";

export function NotFound() {
  useEffect(() => {
    document.title = "Page not found | BookPath";
    // Tell crawlers not to index this soft-404 shell.
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, follow";
    return () => {
      if (meta) meta.content = "index, follow";
    };
  }, []);

  return (
    <div className="text-center py-24">
      <h1 className="text-4xl font-bold mb-4" style={{ color: "rgb(30, 41, 59)" }}>
        404 — Page not found
      </h1>
      <p className="text-gray-600 mb-6">
        The page you're looking for doesn't exist or was moved.
      </p>
      <Link
        to="/"
        className="inline-block px-5 py-2 rounded bg-primary text-white font-semibold hover:opacity-90"
      >
        Back to BookPath
      </Link>
    </div>
  );
}

export default NotFound;
