type TrailProps = {
    trail: {
      id: number;
      name: string;
      description: string;
      distance: number;
      difficulty: "easy" | "moderate" | "hard";
      tags: string[];
    };
  };
  
  export default function TrailCard({ trail }: TrailProps) {
    return (
      <div className="border rounded-md p-4 bg-white shadow hover:shadow-md transition">
        <h3 className="text-xl font-semibold mb-1">{trail.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{trail.description}</p>
        <p className="text-sm text-gray-500 mb-3">
          Distance: {trail.distance.toFixed(1)} km • Difficulty: {trail.difficulty}
        </p>
        <div className="flex flex-wrap gap-2">
          {trail.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }
  