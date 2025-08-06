"use client";

import { useEffect, useState } from "react";

type ClosureItem = {
  id: string;
  activity_type?: string;
  type_of_closure?: string;
  details?: string;
  infrastructure?: string;
  location_name?: string;
  image_url?: string;
  start_date?: string;
  end_date?: string;
  latitude?: string;
  longitude?: string;
};

const placeholderImage = "https://placehold.co/300x200";

export default function ClosureList() {
  const [items, setItems] = useState<ClosureItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://data.edmonton.ca/resource/k4mi-dkvi.json?$limit=50");
        if (!res.ok) throw new Error("Failed to fetch closure data");
        const data: ClosureItem[] = await res.json();
        setItems(data);
      } catch (e) {
        console.error("Error loading closures:", e);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Trail & Park Closures</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c, idx) => {
          const infra = c.infrastructure?.trim() || "Unknown Infrastructure";
          const loc = c.location_name?.trim()
            || (c.latitude && c.longitude ? `(${c.latitude}, ${c.longitude})` : "Unknown Location");
          const title = `${infra} – ${loc}`;
          const img = c.image_url?.trim() || placeholderImage;

          const formatDate = (raw?: string) => {
            if (!raw) return "N/A";
            const d = new Date(raw);
            if (isNaN(d.getTime())) return raw;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}/${mm}/${dd}`;
          };

          return (
            <div
              key={`${c.id}-${idx}`}
              className="bg-white border rounded shadow-sm hover:shadow-md overflow-hidden"
            >
              <img src={img} alt={title} className="w-full h-40 object-cover" />
              <div className="p-4 text-sm space-y-1">
                <h2 className="text-base font-semibold">{title}</h2>
                <p><strong>Activity Type:</strong> {c.activity_type || "N/A"}</p>
                <p><strong>Closure Type:</strong> {c.type_of_closure || "N/A"}</p>
                <p><strong>Start Date:</strong> {formatDate(c.start_date)}</p>
                <p><strong>End Date:</strong> {formatDate(c.end_date)}</p>
                {c.details && (
                  <p className="mt-1 text-gray-700"><strong>Details:</strong> {c.details}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
