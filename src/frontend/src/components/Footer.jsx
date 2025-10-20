import Link from "next/link";
import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary-dark text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="SafePath Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="text-white font-bold text-lg">SafePath</div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Empowering safer journeys through intelligent routing, community
              insights, and real-time hazard awareness.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://github.com/KaranJoseph12/SafePath.git"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex items-center justify-center h-10 w-10 rounded-full
             text-text-secondary hover:text-accent focus:outline-none
             focus:ring-2 focus:ring-accent/40 transition"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <div className="space-y-3">
              <Link
                href="/suggested-routes"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Suggested Routes
              </Link>
              <Link
                href="/hazard-reporting"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Report Hazard
              </Link>
              <Link
                href="/find-buddy"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Find Buddy
              </Link>
              <Link
                href="#"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Safety Tips
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <div className="space-y-3">
              <Link
                href="#"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Contact Us
              </Link>
              <Link
                href="#"
                className="block text-gray-400 hover:text-accent transition-colors text-sm"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
