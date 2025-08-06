"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-green-100 py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Explore Edmonton’s Green Spaces</h2>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto">
          Find and plan your next outdoor adventure with real-time trail info, maps, and local recommendations.
        </p>
        <div className="mt-6">
          <Link
            href="#trails"
            className="inline-block bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-md shadow-md"
          >
            Browse Trails
          </Link>
        </div>
      </section>

      {/* Featured Trails */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <h3 className="text-2xl font-semibold mb-6">Featured Trails</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((trail) => (
            <div
              key={trail}
              className="border rounded-lg shadow-sm p-4 hover:shadow-md transition"
            >
              <h4 className="font-semibold text-lg mb-2">Trail {trail}</h4>
              <p className="text-gray-600 mb-2">
                A short description of Trail {trail}. Great for walking and biking.
              </p>
              <Link href="/trails/trail-slug" className="text-green-700 underline">
                View Details
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
