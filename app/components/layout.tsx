import { Link, NavLink } from "react-router";

export const DEMO_BANNER = "Public demo — names and scores are visible to everyone";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-control px-3 py-2 font-medium hover:bg-gray-100 ${isActive ? "text-primary-dark" : "text-gray-700"}`;

/** Header, demo banner and footer around every page, including error pages. */
export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only rounded-control bg-primary px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10"
      >
        Skip to content
      </a>
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-dashboard items-center justify-between px-8 py-3">
          <Link to="/" className="text-h3 font-bold text-gray-900">
            Read AI
          </Link>
          <nav aria-label="Main">
            <ul className="flex gap-2">
              <li>
                <NavLink to="/start" className={navLink}>
                  Take a test
                </NavLink>
              </li>
              <li>
                <NavLink to="/portal" className={navLink}>
                  Portal
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <div role="note" aria-label="Demo notice" className="bg-banner text-banner-text">
        <p className="mx-auto max-w-dashboard px-8 py-2 text-sm font-medium">{DEMO_BANNER}</p>
      </div>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-dashboard gap-6 px-8 py-6 text-sm text-gray-600">
          <span>Read AI, a reading fluency demo</span>
          <Link className="underline hover:text-gray-900" to="/privacy">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
