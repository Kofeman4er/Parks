"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Geolocation coordinates type
type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Park = {
    numberID: number;
    textOfficialName: string;
    textCommonName: string;
    textStatus: string;
    textType: string;
    textClass: string;
    textAddress: string;
    numberArea: number;
    numberLongitude: number;
    numberLatitude: number;
    distance?: number;
  };

type Props = {
  onNavigate: (view: "home" | "trails" | "map" | "alerts" | "about") => void;
  onSelectPark: (park: Park) => void;
};

export default function TrailDirectory({ onNavigate, onSelectPark }: Props) {
  const [parks, setParks] = useState<Park[]>([]);
  const [filtered, setFiltered] = useState<Park[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusActiveOnly, setStatusActiveOnly] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [sortNearMe, setSortNearMe] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/parks");
        if (!res.ok) throw new Error("Failed to fetch parks");
        const raw = await res.json();

        if (!Array.isArray(raw)) return;
        type RawPark = {
            id?: string;
            official_name?: string;
            common_name?: string;
            status?: string;
            type?: string;
            class?: string;
            address?: string;
            area?: string | number;
            longitude?: string | number;
            latitude?: string | number;
          };

          const parsed: Park[] = (raw as RawPark[]).map((item, index) => {
            const id = item.id && !isNaN(Number(item.id)) ? Number(item.id) : index;
            return {
              numberID: id,
              textOfficialName: item.official_name || "",
              textCommonName: item.common_name || "",
              textStatus: item.status?.toLowerCase() || "",
              textType: item.type || "",
              textClass: item.class || "",
              textAddress: item.address || "",
              numberArea: Number(item.area || 0),
              numberLongitude: Number(item.longitude || 0),
              numberLatitude: Number(item.latitude || 0),
            };
          });

        setParks(parsed);
        setFiltered(parsed);
      } catch (err) {
        console.error(err);
        setParks([]);
        setFiltered([]);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();

    let filteredList = parks.filter((p) => {
      const matchesSearch =
        p.textOfficialName?.toLowerCase().includes(term) ||
        p.textCommonName?.toLowerCase().includes(term);
      const matchesStatus = statusActiveOnly ? p.textStatus === "active" : true;
      const matchesClass = classFilter ? p.textClass === classFilter : true;
      return matchesSearch && matchesStatus && matchesClass;
    });

    if (userCoords) {
      filteredList = filteredList.map((p) => {
        const dist = Math.hypot(
          p.numberLatitude - userCoords.latitude,
          p.numberLongitude - userCoords.longitude
        );
        return { ...p, distance: dist };
      });

      if (sortNearMe) {
        filteredList.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      }
    }

    setFiltered(filteredList);
  }, [searchTerm, statusActiveOnly, classFilter, sortNearMe, userCoords, parks]);

  const uniqueClasses = Array.from(
    new Set(parks.map((p) => p.textClass).filter(Boolean))
  );

  return (
    <section className="px-4 py-8 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Edmonton Parks Directory</h2>

      {/* Filter Bar */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 items-center bg-gray-50 p-4 rounded shadow-sm">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded text-sm h-10 w-full"
        />

        {/* Toggle for Status */}
        <label className="flex items-center gap-2 h-10">
          <span className="text-sm">
            {statusActiveOnly ? "Only Active" : "All Parks"}
          </span>
          <div
            className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer ${
              statusActiveOnly ? "bg-green-700" : "bg-gray-300"
            }`}
            onClick={() => setStatusActiveOnly(!statusActiveOnly)}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow transform duration-300 ${
                statusActiveOnly ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
        </label>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="p-2 border rounded text-sm h-10 w-full"
        >
          <option value="">All Classes</option>
          {uniqueClasses.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>

        {/* Buttons */}
        <div className="flex gap-2 h-10">
          <button
            onClick={() => setSortNearMe(!sortNearMe)}
            className={`p-2 text-sm rounded border w-full ${
              sortNearMe ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            {sortNearMe ? "Sorted by Distance" : "Sort: Near Me"}
          </button>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusActiveOnly(false);
              setClassFilter("");
              setSortNearMe(false);
            }}
            className="p-2 text-sm border rounded bg-white hover:bg-gray-100"
          >
            Reset
          </button>
        </div>
      </div>



      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((park, index) => (
          <div
            key={`${park.textOfficialName}-${index}`}
            onClick={() => {
              onSelectPark(park);
              onNavigate("map");
            }}
            className="cursor-pointer border rounded p-3 text-sm shadow-sm bg-white hover:shadow hover:bg-gray-50 transition"
          >
            <h3 className="font-semibold text-base truncate">
              {park.textCommonName || park.textOfficialName}
            </h3>
            <p className="text-gray-600">
              {park.textStatus} • {park.textType}
            </p>
            <p className="text-gray-600">Class: {park.textClass}</p>
            <p className="text-gray-500">
              Area: {Math.round(park.numberArea)} m²
            </p>
            {userCoords && park.distance && (
              <p className="text-gray-500">
                Distance: {(park.distance * 111).toFixed(1)} km
              </p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No parks found.
          </p>
        )}
      </div>
    </section>
  );
}
