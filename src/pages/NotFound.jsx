import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-4xl text-ink">Page not found</h1>
      <p className="mt-3 text-clay">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 text-thread hover:underline">
        Back to home
      </Link>
    </div>
  );
}
