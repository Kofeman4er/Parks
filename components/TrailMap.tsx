"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import type { Park } from "@/types/park";

// Neutral icon setup
const defaultIconUrl =
  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png";

type Props = {
  parks: Park[];
  selected?: Park | null;
  onSelect?: (park: Park) => void;
};

export default function TrailMap({ parks, selected, onSelect }: Props) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [filteredParks, setFilteredParks] = useState<Park[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = parks.filter((p) => {
      const matchesSearch =
        p.textCommonName?.toLowerCase().includes(term) ||
        p.textOfficialName?.toLowerCase().includes(term);
      const matchesStatus = statusFilter ? p.textStatus === "active" : true;
      const matchesClass = classFilter
        ? p.textClass === classFilter
        : true;
      return matchesSearch && matchesStatus && matchesClass;
    });

    filtered.sort((a, b) =>
      (a.textCommonName || a.textOfficialName).localeCompare(
        b.textCommonName || b.textOfficialName
      )
    );

    setFilteredParks(filtered);
  }, [parks, searchTerm, statusFilter, classFilter]);

  const uniqueClasses = Array.from(
    new Set(parks.map((p) => p.textClass).filter(Boolean))
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-80 p-4 border-r overflow-y-auto bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Filters</h2>
        <input
          type="text"
          placeholder="Search parks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full mb-2 p-2 border rounded text-sm"
        />
        <label className="flex items-center gap-2 mb-2 text-sm">
          <input
            type="checkbox"
            checked={statusFilter}
            onChange={(e) => setStatusFilter(e.target.checked)}
          />
          Only Active
        </label>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="w-full mb-2 p-2 border rounded text-sm"
        >
          <option value="">All Classes</option>
          {uniqueClasses.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
        <button
          className="w-full p-2 text-sm border rounded bg-white hover:bg-gray-100 mb-4"
          onClick={() => {
            setSearchTerm("");
            setStatusFilter(false);
            setClassFilter("");
          }}
        >
          Reset Filters
        </button>

        <h2 className="text-lg font-semibold mb-2">Parks</h2>
        <ul className="space-y-1">
          {filteredParks.map((park, i) => (
            <li
              key={`${park.textOfficialName}-${i}`}
              onClick={() => onSelect?.(park)}
              className={`cursor-pointer p-2 rounded text-sm hover:bg-blue-100 ${
                selected?.numberID === park.numberID
                  ? "bg-blue-200 font-semibold"
                  : ""
              }`}
            >
              {park.textCommonName || park.textOfficialName}
            </li>
          ))}
        </ul>
      </aside>

      {/* Map */}
      <div className="flex-1 h-full">
        <MapContainer
          center={[53.5461, -113.4938]}
          zoom={11}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredParks.map((park, i) => {
            const isSelected = selected?.numberID === park.numberID;
            const icon = new L.Icon({
              iconUrl: defaultIconUrl,
              iconSize: isSelected ? [38, 60] : [25, 41],
              iconAnchor: [12, 41],
              className: !isSelected ? "opacity-50" : "opacity-100",
            });

            return (
              <Marker
                key={`${park.textOfficialName}-${i}`}
                position={[park.numberLatitude, park.numberLongitude]}
                icon={icon}
              >
                <Popup autoPan>
                  <div className="text-sm">
                    <strong>
                      {park.textCommonName || park.textOfficialName}
                    </strong>
                    <br />
                    {park.textAddress}
                    <br />
                    Class: {park.textClass}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {userLocation && (
            <Marker position={userLocation}>
              <Popup>You are here</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
