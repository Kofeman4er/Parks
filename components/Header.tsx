"use client";

type HeaderProps = {
  onNavigate: (
    view: "home" | "trails" | "map" | "alerts" | "about" | "closures"
  ) => void;
};

export default function Header({ onNavigate }: HeaderProps) {
  return (
    <header className="w-full bg-green-700 text-white py-6 px-4 shadow-md">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <h1
          className="text-2xl font-bold cursor-pointer"
          onClick={() => onNavigate("home")}
        >
          Edmonton Trails & Parks
        </h1>
        <nav className="space-x-4">
          <button onClick={() => onNavigate("trails")}>Trails</button>
          <button onClick={() => onNavigate("map")}>Map</button>
          <button onClick={() => onNavigate("alerts")}>Alerts</button>
          <button onClick={() => onNavigate("closures")}>Closures</button>
          <button onClick={() => onNavigate("about")}>About</button>
        </nav>
      </div>
    </header>
  );
}
