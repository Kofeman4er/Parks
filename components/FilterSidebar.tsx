"use client";

import type { Park } from "./TrailDirectory";

type Props = {
  parks: Park[];
  selected?: Park | null;
  onSelect?: (park: Park) => void;
};


export default function FilterSidebar({ parks, selected, onSelect }: Props) {
    <p className="text-xs text-gray-500 mb-2">Total parks: {parks.length}</p>
    return (
        
      <div className="h-full flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Parks List</h2>
  
        <ul className="space-y-2 overflow-y-auto flex-1">
          {parks.map((park, index) => (
            <li
              key={`${park.textOfficialName}-${index}`}
              onClick={() => onSelect?.(park)}
              className={`cursor-pointer p-2 rounded hover:bg-blue-100 transition text-sm ${
                selected?.numberID === park.numberID ? "bg-blue-200 font-semibold" : "bg-white"
              }`}
            >
              {park.textCommonName || park.textOfficialName}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  
