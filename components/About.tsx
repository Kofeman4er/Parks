"use client";

export default function About() {
  return (
    <section className="px-4 py-10 max-w-3xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-4">About Edmonton Trails & Parks</h2>
      <p className="text-lg text-gray-700 mb-6">
        This web application is designed to help residents and visitors of Edmonton explore, plan, and enjoy the city’s extensive trail and park network.
      </p>

      <p className="text-gray-600 mb-4">
        The platform provides real-time trail information, interactive maps, public safety alerts, and trip planning tools to encourage outdoor activity and promote environmental appreciation.
      </p>

      <p className="text-gray-600 mb-4">
        All data is sourced from publicly available City of Edmonton GIS and Open Data programs. If you have feedback or would like to contribute, please reach out through the contact options below.
      </p>

      <div className="mt-8">
        <p className="text-sm text-gray-500">Version 1.0 – August 2025</p>
        <p className="text-sm text-gray-500">Created by local developers and nature enthusiasts</p>
      </div>
    </section>
  );
}
