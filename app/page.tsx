"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomePage from "@/components/HomePage";
import TrailDirectory from "@/components/TrailDirectory";
import Alerts from "@/components/Alerts";
import About from "@/components/About";

import type { Park } from "@/types/park";
import dynamic from "next/dynamic";

const TrailMap = dynamic(() => import("@/components/TrailMap"), {
  ssr: false,
});


export default function Page() {
  const [view, setView] = useState<"home" | "trails" | "map" | "alerts" | "about">("home");
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);

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

        const parsed: Park[] = (raw as RawPark[]).map((item, index) => ({
          numberID: item.id && !isNaN(Number(item.id)) ? Number(item.id) : index,
          textOfficialName: item.official_name || "",
          textCommonName: item.common_name || "",
          textStatus: item.status?.toLowerCase() || "",
          textType: item.type || "",
          textClass: item.class || "",
          textAddress: item.address || "",
          numberArea: Number(item.area || 0),
          numberLongitude: Number(item.longitude || 0),
          numberLatitude: Number(item.latitude || 0),
        }));

        setParks(parsed);
      } catch (err) {
        console.error("Error loading parks:", err);
      }
    }

    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <Header onNavigate={setView} />
      {view === "home" && <HomePage />}
      {view === "trails" && (
        <TrailDirectory
          onNavigate={setView}
          onSelectPark={setSelectedPark}
        />
      )}
      {view === "map" && (
        <TrailMap
          parks={parks}
          selected={selectedPark}
          onSelect={setSelectedPark}
        />
      )}
      {view === "alerts" && <Alerts />}
      {view === "about" && <About />}
      <Footer />
    </main>
  );
}
