"use client";

type Alert = {
  id: number;
  title: string;
  description: string;
  severity: "low" | "moderate" | "high";
};

const mockAlerts: Alert[] = [
  {
    id: 1,
    title: "River Valley Trail Closure",
    description: "Due to recent flooding, a portion of the River Valley trail is temporarily closed.",
    severity: "high",
  },
  {
    id: 2,
    title: "Mill Creek Tree Maintenance",
    description: "Expect minor delays due to pruning activities along the trail.",
    severity: "moderate",
  },
];

export default function Alerts() {
  return (
    <section className="px-4 py-10 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">Trail Alerts & Closures</h2>
      {mockAlerts.length === 0 ? (
        <p className="text-gray-600 text-center">There are currently no active alerts.</p>
      ) : (
        <ul className="space-y-6">
          {mockAlerts.map((alert) => (
            <li key={alert.id} className="border rounded-lg p-5 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold">{alert.title}</h3>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${
                    alert.severity === "high"
                      ? "bg-red-100 text-red-800"
                      : alert.severity === "moderate"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-700">{alert.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
