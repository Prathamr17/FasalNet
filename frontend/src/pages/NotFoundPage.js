// pages/NotFoundPage.js
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 text-center">
      <div className="font-display font-black text-8xl text-wattle/20 mb-4">404</div>
      <h1 className="font-display font-black text-2xl text-white mb-2">Page Not Found</h1>
      <p className="text-text-muted text-sm mb-6 max-w-sm">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/"
        className="font-display font-bold px-6 py-2.5 bg-wattle text-bottle rounded-xl
          hover:bg-wattle-dark transition-colors">
        ← Back to Home
      </Link>
    </div>
  );
}
