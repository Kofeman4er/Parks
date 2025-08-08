"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { GeoJsonObject } from "geojson";

/* =========================
   Types
========================= */
type DatasetKind = "trail" | "traffic";
type ViewMode = "map" | "list";

type GeometryLike = GeoJsonObject | string | null | undefined;

type PointLike =
  | string
  | {
      type?: string;
      coordinates?: [number, number];
      latitude?: number | string;
      longitude?: number | string;
    }
  | null
  | undefined;

interface BaseRow {
  infrastructure?: string;
  location_name?: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  latitude?: string;
  longitude?: string;
  geometry?: GeometryLike;
  the_geom?: GeometryLike;
}

interface TrailRow extends BaseRow {
  activity_type?: string;
  type_of_closure?: string;
  details?: string;
}

interface TrafficRow extends BaseRow {
  status?: string; // Current / REVISED
  description?: string;
  activity_type?: string;
  type_of_closure?: string;
  point?: PointLike; // string or object
}

/* =========================
   Constants
========================= */
const TRAIL_URL =
  "https://data.edmonton.ca/resource/k4mi-dkvi.json?$limit=500";

const TRAFFIC_URL =
  "https://data.edmonton.ca/resource/k4tx-5k8p.json?$query=SELECT%20*%20WHERE%20(%60status%60%20%3D%20'Current'%20OR%20%60status%60%20%3D%20'REVISED')";

const NEIGHBOURHOODS_URL = "https://data.edmonton.ca/resource/3did-mjnj.json";
const NO_LOC = "N/A";

/* =========================
   Helpers (typed)
========================= */
function formatStart(raw?: string): string {
  if (!raw) return "N/A";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "N/A";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

function parseGeom(raw: GeometryLike): GeoJsonObject | null {
  if (!raw) return null;
  try {
    if (typeof raw === "string") return JSON.parse(raw) as GeoJsonObject;
    return raw as GeoJsonObject;
  } catch {
    return null;
  }
}

// Parse lon/lat from Traffic "point"
function parseTrafficPoint(point: PointLike): { lat?: string; lon?: string } {
  if (!point) return {};
  if (typeof point === "string") {
    const nums = point.match(/-?\d+(\.\d+)?/g);
    if (!nums || nums.length < 2) return {};
    const lon = nums[0];
    const lat = nums[1];
    return { lat, lon };
  }
  if (Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
    const [lon, lat] = point.coordinates;
    return { lat: String(lat), lon: String(lon) };
  }
  if (
    typeof point.latitude !== "undefined" &&
    typeof point.longitude !== "undefined"
  ) {
    return { lat: String(point.latitude), lon: String(point.longitude) };
  }
  return {};
}

/* neighbourhood cache */
const neighbourhoodCache: Record<string, string> = {};

async function fetchNeighbourhoodName(lat: string, lon: string): Promise<string> {
  const key = `${lat},${lon}`;
  if (neighbourhoodCache[key]) return neighbourhoodCache[key];

  const radius = 100;
  const urls: ReadonlyArray<string> = [
    `${NEIGHBOURHOODS_URL}?$select=descriptive_name&$where=within_circle(the_geom,${lat},${lon},${radius})&$limit=1`,
    `${NEIGHBOURHOODS_URL}?$select=descriptive_name&$where=within_circle(geometry,${lat},${lon},${radius})&$limit=1`,
  ];

  for (const url of urls) {
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

/* =========================
   Component
========================= */
export default function ClosureList() {
  // dataset + view
  const [kind, setKind] = useState<DatasetKind>("trail");
  const [view, setView] = useState<ViewMode>("map");

  // data
  const [trailRows, setTrailRows] = useState<TrailRow[]>([]);
  const [trafficRows, setTrafficRows] = useState<TrafficRow[]>([]);
  const [neighNames, setNeighNames] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // client-only map libs (avoid SSR window access)
  const [rl, setRL] = useState<null | typeof import("react-leaflet")>(null);
  const [leaflet, setLeaflet] = useState<null | typeof import("leaflet")>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMapLibs() {
      if (typeof window === "undefined") return;
      const [reactLeaflet, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      if (!cancelled) {
        setRL(reactLeaflet);
        setLeaflet(L);
      }
    }
    loadMapLibs();
    return () => {
      cancelled = true;
    };
  }, []);

  // load dataset
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (kind === "trail") {
          const res = await fetch(TRAIL_URL);
          if (!res.ok) throw new Error("Failed to fetch trail data");
          const data = (await res.json()) as TrailRow[];
          if (!cancelled) setTrailRows(Array.isArray(data) ? data : []);
        } else {
          const res = await fetch(TRAFFIC_URL);
          if (!res.ok) throw new Error("Failed to fetch traffic data");
          let data = (await res.json()) as TrafficRow[];
          data = data.map((r) => {
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
          if (!cancelled) setTrafficRows(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          if (kind === "trail") setTrailRows([]);
          else setTrafficRows([]);
        }
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
      const rows: ReadonlyArray<TrailRow | TrafficRow> =
        kind === "trail" ? trailRows : trafficRows;

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
  }, [kind, trailRows, trafficRows, neighNames]);

  // dedupe + sort
  const items: ReadonlyArray<TrailRow | TrafficRow> = useMemo(() => {
    if (kind === "trail") {
      const seen = new Set<string>();
      const out: TrailRow[] = [];
      for (const r of trailRows) {
        const k = (r.details || "").trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          out.push(r);
        }
      }
      out.sort((a, b) =>
        (String(a.details || "")).toLowerCase().localeCompare(
          String(b.details || "").toLowerCase()
        )
      );
      return out;
    } else {
      const seen = new Set<string>();
      const out: TrafficRow[] = [];
      for (const r of trafficRows) {
        const k = (r.description || "").trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          out.push(r);
        }
      }
      out.sort((a, b) =>
        (String(a.description || "")).toLowerCase().localeCompare(
          String(b.description || "").toLowerCase()
        )
      );
      return out;
    }
  }, [kind, trailRows, trafficRows]);

  const toggleExpand = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const heading =
    kind === "trail" ? "Trail Cautions and Closures Map" : "Traffic Disruptions Map";

  /* ======= Tiny Map Preview (client-only via dynamic import) ======= */
  const MapPreview: React.FC<{
    lat?: string;
    lon?: string;
    geom?: GeoJsonObject | null;
  }> = ({ lat, lon, geom }) => {
    if (!rl || !leaflet) {
      // libs not ready yet — show a neutral placeholder box
      return (
        <div className="h-full w-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs">
          map…
        </div>
      );
    }
    const { MapContainer, TileLayer, Marker, GeoJSON, useMap } = rl;

    const FitToGeometry: React.FC<{ g: GeoJsonObject }> = ({ g }) => {
      const map = useMap();
      useEffect(() => {
        try {
          const layer = leaflet.geoJSON(g);
          const bounds = layer.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [8, 8] });
        } catch {
          /* ignore */
        }
      }, [g, map]);
      return null;
    };

    // simple green icon
    const icon = new leaflet.Icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    if (geom) {
      return (
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
          <GeoJSON data={geom} style={{ color: "#22c55e", weight: 2, fillOpacity: 0.2 }} />
          <FitToGeometry g={geom} />
        </MapContainer>
      );
    }

    if (lat && lon) {
      const latNum = Number(lat);
      const lonNum = Number(lon);
      if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
        return (
          <MapContainer
            center={[latNum, lonNum]}
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
            <Marker position={[latNum, lonNum]} icon={icon} />
          </MapContainer>
        );
      }
    }

    return (
      <div className="h-full w-full bg-gray-100 text-gray-500 flex items-center justify-center text-sm">
        {NO_LOC}
      </div>
    );
  };

  /* =========================
     Render
  ========================= */
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
            <span className={`text-sm ${view === "map" ? "font-semibold" : ""}`}>
              Map
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={view === "list"}
                onChange={(e) => setView(e.target.checked ? "list" : "map")}
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <span className={`text-sm ${view === "list" ? "font-semibold" : ""}`}>
              List
            </span>
          </div>
        </div>
      </div>

      {/* map view (iframes, full-width, viewport-height) */}
      {view === "map" ? (
        <div className="w-full">
          {kind === "trail" ? (
            <iframe
              allow="geolocation"
              src="https://data.edmonton.ca/dataset/River-Valley-Trail-Cautions-and-Closures-Map/2kvx-xvgm/embed?width=full&height=600"
              width="100%"
              style={{
                border: 0,
                padding: 0,
                margin: 0,
                height: "calc(100vh - 64px)",
              }}
            />
          ) : (
            <iframe
              allow="geolocation"
              src="https://data.edmonton.ca/dataset/Traffic-Disruptions-Map/mhbf-f3zb/embed?width=full&height=600"
              width="100%"
              style={{
                border: 0,
                padding: 0,
                margin: 0,
                height: "calc(100vh - 64px)",
              }}
            />
          )}
        </div>
      ) : loading ? (
        <p>Loading…</p>
      ) : (
        // list view
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {(
            (kind === "trail" ? trailRows : trafficRows) as ReadonlyArray<
              TrailRow | TrafficRow
            >
          ).map((r, idx) => {
            // dedupe + sort already done in parent memo if you prefer; here keep simple render
            // Build display fields
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
            const geom = parseGeom(r.geometry ?? r.the_geom);

            const isPermanent =
              String(r.type_of_closure || "").toLowerCase() === "permanent";

            const longText =
              (kind === "trail"
                ? (r as TrailRow).details
                : (r as TrafficRow).description) || "";
            const key = `${title}-${r.start_date ?? ""}-${idx}`;
            const isExpanded = !!expanded[key];
            const shown =
              !isExpanded && longText.length > 220
                ? `${longText.slice(0, 220).trim()}…`
                : longText;

            return (
              <div
                key={key}
                className={`bg-white border rounded shadow-sm overflow-hidden transition-all cursor-pointer ${
                  isPermanent ? "border-red-400" : "border-gray-200"
                } hover:border-2`}
                title={title}
              >
                {/* tiny non-interactive map (client-only) */}
                <div className="w-full h-40">
                  <MapPreview lat={lat} lon={lon} geom={geom} />
                </div>

                {/* card body */}
                <div className="p-4 text-sm space-y-1">
                  <h2 className="text-base font-semibold">{title}</h2>

                  <p>
                    <strong>Activity Type:</strong> {r.activity_type || "N/A"}
                  </p>
                  <p>
                    <strong>Type of Closure:</strong>{" "}
                    {r.type_of_closure || "N/A"}
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
