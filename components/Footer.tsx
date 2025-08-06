"use client";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-600 py-6 px-4 text-center">
      <p>© {new Date().getFullYear()} Edmonton Trails Portal. All rights reserved.</p>
    </footer>
  );
}
