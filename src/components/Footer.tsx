import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-ink-700 bg-ink-950">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-extrabold text-brand-400">Adparlorr</div>
            <p className="mt-3 text-sm text-ink-400">
              Digital Marketing Solutions. Earn by completing simple product submission tasks.
            </p>
            <div className="mt-4 flex gap-3">
              {[Twitter, Facebook, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-ink-400 transition hover:bg-brand-500 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-400">
              <li><a href="#about" className="hover:text-brand-400">About Us</a></li>
              <li><a href="#how" className="hover:text-brand-400">How It Works</a></li>
              <li><a href="#faq" className="hover:text-brand-400">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-400">
              <li><a href="#" className="hover:text-brand-400">Blog</a></li>
              <li><a href="#" className="hover:text-brand-400">Help Center</a></li>
              <li><Link to="/register" className="hover:text-brand-400">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-400">
              <li>support@adparlorr-demo.com</li>
              <li>1-800-555-DEMO</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-ink-800 pt-6">
          <p className="text-center text-xs text-ink-500">
            © 2026 Adparlorr. All rights reserved.
          </p>
          <p className="mt-2 text-center text-[10px] text-ink-600">
            This is an authorized security awareness training simulation. Not for real-world use.
          </p>
        </div>
      </div>
    </footer>
  );
}
