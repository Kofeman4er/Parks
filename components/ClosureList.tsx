"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  GeoJSON,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type DatasetKind = "trail" | "traffic";
type ViewMode = "map" | "list";

type TrailRow = {
  activity_type?: string;
  type_of_closure?: string;
  details?: string;
  infrastructure?: string;
  location_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  latitude?: string;
  longitude?: string;
  geometry?: any;
  the_geom?: any;
  [k: string]: any;
};

type TrafficRow = {
  status?: string; // Current / REVISED
  description?: string;
  activity_type?: string;
  type_of_closure?: string;
  infrastructure?: string;
  location_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  latitude?: string;
  longitude?: string;
  point?: any;       // <-- can be string or object
  geometry?: any;
  the_geom?: any;
  [k: string]: any;
};

const TRAIL_URL =
  "https://data.edmonton.ca/resource/k4mi-dkvi.json?$limit=500";

const TRAFFIC_URL =
  "https://data.edmonton.ca/resource/k4tx-5k8p.json?$query=SELECT%20*%20WHERE%20(%60status%60%20%3D%20'Current'%20OR%20%60status%60%20%3D%20'REVISED')";

const NEIGHBOURHOODS_URL = "https://data.edmonton.ca/resource/3did-mjnj.json";
const NO_LOC = "N/A";

const markerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function formatStart(raw?: string) {
  if (!raw) return "N/A";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "N/A";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

function FitToGeometry({ geom }: { geom: GeoJSON.GeoJsonObject }) {
  const map = useMap();
  useEffect(() => {
    if (!geom) return;
    try {
      const layer = L.geoJSON(geom);
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [8, 8] });
    } catch {
      // ignore malformed geometries
    }
  }, [geom, map]);
  return null;
}

function parseGeom(raw: any): GeoJSON.GeoJsonObject | null {
  if (!raw) return null;
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    return raw as GeoJSON.GeoJsonObject;
  } catch {
    return null;
  }
}

// ✅ FIX: handle string OR object shapes for Traffic "point"
function parseTrafficPoint(point: any): { lat?: string; lon?: string } {
  if (!point) return {};
  if (typeof point === "string") {
    // supports "POINT (lon lat)" or "(lon, lat)"
    const nums = point.match(/-?\d+(\.\d+)?/g);
    if (!nums || nums.length < 2) return {};
    const lon = nums[0];
    const lat = nums[1];
    return { lat, lon };
  }
  if (typeof point === "object") {
    // GeoJSON-like: { type: "Point", coordinates: [lon, lat] }
    if (Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
      const [lon, lat] = point.coordinates;
      return { lat: String(lat), lon: String(lon) };
    }
    // Socrata location: { latitude, longitude }
    if ("latitude" in point && "longitude" in point) {
      return { lat: String(point.latitude), lon: String(point.longitude) };
    }
  }
  return {};
}

// neighbourhood cache
const neighbourhoodCache: Record<string, string> = {};
async function fetchNeighbourhoodName(lat: string, lon: string): Promise<string> {
  const key = `${lat},${lon}`;
  if (neighbourhoodCache[key]) return neighbourhoodCache[key];

  const radius = 100;
  const queries = [
    `${NEIGHBOURHOODS_URL}?$select=descriptive_name&$where=within_circle(the_geom,${lat},${lon},${radius})&$limit=1`,
    `${NEIGHBOURHOODS_URL}?$select=descriptive_name&$where=within_circle(geometry,${lat},${lon},${radius})&$limit=1`,
  ];

  for (const url of queries) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const js = (await res.json()) as Array<{ descriptive_name?: string }>;
      const name = js?.[0]?.descriptive_name?.trim();
      if (name) {
        neighbourhoodCache[key] = name;
        return name;
      }
    } catch {
      // continue
    }
  }
  neighbourhoodCache[key] = NO_LOC;
  return NO_LOC;
}

export default function ClosureList() {
  const [kind, setKind] = useState<DatasetKind>("trail"); // default: Trail
  const [view, setView] = useState<ViewMode>("map");       // default: Map
  const [rows, setRows] = useState<(TrailRow | TrafficRow)[]>([]);
  const [neighNames, setNeighNames] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const url = kind === "trail" ? TRAIL_URL : TRAFFIC_URL;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch data");
        let data = (await res.json()) as (TrailRow | TrafficRow)[];

        // ✅ normalize traffic coords from "point" if lat/lon missing
        if (kind === "traffic") {
          data = (data as TrafficRow[]).map((r) => {
            let lat = r.latitude;
            let lon = r.longitude;
            if ((!lat || !lon) && r.point) {
              const p = parseTrafficPoint(r.point);
              if (p.lat && p.lon) {
                lat = p.lat;
                lon = p.lon;
              }
            }
            return { ...r, latitude: lat, longitude: lon };
          });
        }

        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  // neighbourhood lookups where location_name missing
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const todo: string[] = [];
      for (const r of rows) {
        const loc = (r.location_name || "").trim();
        const lat = (r.latitude || "").trim();
        const lon = (r.longitude || "").trim();
        if (!loc && lat && lon) {
          const k = `${lat},${lon}`;
          if (!neighNames[k]) todo.push(k);
        }
      }
      const subset = todo.slice(0, 40);
      const results = await Promise.all(
        subset.map(async (k) => {
          const [lat, lon] = k.split(",");
          const name = await fetchNeighbourhoodName(lat, lon);
          return { k, name };
        })
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const r of results) next[r.k] = r.name;
      if (Object.keys(next).length) {
        setNeighNames((prev) => ({ ...prev, ...next }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [rows, neighNames]);

  // dedupe + sort
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: (TrailRow | TrafficRow)[] = [];
    if (kind === "trail") {
      for (const r of rows as TrailRow[]) {
        const k = (r.details || "").trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          out.push(r);
        }
      }
      out.sort((a, b) =>
        (String((a as TrailRow).details || "")).toLowerCase()
          .localeCompare(String((b as TrailRow).details || "").toLowerCase())
      );
    } else {
      for (const r of rows as TrafficRow[]) {
        const k = (r.description || "").trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          out.push(r);
        }
      }
      out.sort((a, b) =>
        (String((a as TrafficRow).description || "")).toLowerCase()
          .localeCompare(String((b as TrafficRow).description || "").toLowerCase())
      );
    }
    return out;
  }, [rows, kind]);

  const toggleExpand = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const truncate = (text: string, max = 220) =>
    text.length > max ? text.slice(0, max).trim() + "…" : text;

  const heading =
    kind === "trail" ? "Trail Cautions and Closures Map" : "Traffic Disruptions Map";

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* header: dataset + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{heading}</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">Dataset:</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DatasetKind)}
            className="border rounded p-2 text-sm"
          >
            <option value="trail">Trail Cautions and Closures Map</option>
            <option value="traffic">Traffic Disruptions Map</option>
          </select>

          <div className="ml-4 flex items-center gap-2">
          <span className={`text-sm ${view === "map" ? "font-semibold" : ""}`}>Map</span>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={view === "list"}
                onChange={(e) => setView(e.target.checked ? "list" : "map")}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <span className={`text-sm ${view === "list" ? "font-semibold" : ""}`}>List</span>
          </div>
        </div>
      </div>

      {/* map view (iframes) */}
      {view === "map" ? (
        <div className="w-full">
          {kind === "trail" ? (
            <iframe
              allow="geolocation"
              src="https://data.edmonton.ca/dataset/River-Valley-Trail-Cautions-and-Closures-Map/2kvx-xvgm/embed?width=full&height=600"
              width="100%"
              height="600"
              style={{ border: 0, padding: 0, margin: 0 }}
            />
          ) : (
            <iframe
              allow="geolocation"
              src="https://data.edmonton.ca/dataset/Traffic-Disruptions-Map/mhbf-f3zb/embed?width=full&height=600"
              width="100%"
              height="600"
              style={{ border: 0, padding: 0, margin: 0 }}
            />
          )}
        </div>
      ) : loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No records found.</p>
      ) : (
        // list view
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {items.map((r, idx) => {
            const lat = (r.latitude || "").trim();
            const lon = (r.longitude || "").trim();
            const hasCoords = !!(lat && lon);

            const infra = (r.infrastructure || "").trim() || "Infrastructure";
            const locRaw = (r.location_name || "").trim();

            // neighbourhood when no location_name
            const neighKey = hasCoords ? `${lat},${lon}` : "";
            const neigh = neighKey ? neighNames[neighKey] : undefined;
            const locDisplay = locRaw || neigh || NO_LOC;

            const title = `${infra} – ${locDisplay}`;
            const endDisplay = r.end_date ? "N/A" : (r.duration || "N/A");
            const geom = parseGeom((r as any).geometry || (r as any).the_geom);

            const isPermanent =
              String((r as any).type_of_closure || "").toLowerCase() ===
              "permanent";

            const longText =
              (r as TrailRow).details ||
              (r as TrafficRow).description ||
              "";
            const key = `${title}-${r.start_date ?? ""}-${idx}`;
            const isExpanded = !!expanded[key];
            const shown =
              !isExpanded && longText.length > 220
                ? longText.slice(0, 220).trim() + "…"
                : longText;

            return (
              <div
                key={key}
                className={`bg-white border rounded shadow-sm overflow-hidden transition-all cursor-pointer ${
                  isPermanent ? "border-red-400" : "border-gray-200"
                } hover:border-2`}
                title={title}
              >
                <div className="w-full h-40">
                  {geom ? (
                    <MapContainer
                      center={[53.5461, -113.4938]}
                      zoom={15}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                      dragging={false}
                      touchZoom={false}
                      boxZoom={false}
                      keyboard={false}
                      zoomControl={false}
                      attributionControl={false}
                      className="h-full w-full"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      <GeoJSON
                        data={geom}
                        style={{ color: "#22c55e", weight: 2, fillOpacity: 0.2 }}
                      />
                      <FitToGeometry geom={geom} />
                    </MapContainer>
                  ) : hasCoords ? (
                    <MapContainer
                      center={[Number(lat), Number(lon)]}
                      zoom={15}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                      dragging={false}
                      touchZoom={false}
                      boxZoom={false}
                      keyboard={false}
                      zoomControl={false}
                      attributionControl={false}
                      className="h-full w-full"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      <Marker position={[Number(lat), Number(lon)]} icon={markerIcon} />
                    </MapContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                      {NO_LOC}
                    </div>
                  )}
                </div>

                <div className="p-4 text-sm space-y-1">
                  <h2 className="text-base font-semibold">{title}</h2>

                  <p>
                    <strong>Activity Type:</strong>{" "}
                    {(r as TrailRow).activity_type ||
                      (r as TrafficRow).activity_type ||
                      "N/A"}
                  </p>
                  <p>
                    <strong>Type of Closure:</strong>{" "}
                    {(r as TrailRow).type_of_closure ||
                      (r as TrafficRow).type_of_closure ||
                      "N/A"}
                  </p>
                  <p>
                    <strong>Start Date:</strong> {formatStart(r.start_date)}
                  </p>
                  <p>
                    <strong>End Date:</strong> {endDisplay}
                  </p>

                  {!!longText && (
                    <div className="mt-1 text-gray-700">
                      <strong>Details:</strong>{" "}
                      <span>
                        {shown || "N/A"}{" "}
                        {longText.length > 220 && (
                          <button
                            className="text-blue-600 underline ml-1"
                            onClick={() => toggleExpand(key)}
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
