"use client";

export default function ContributionGraph() {
  return (
    <div>
      <h4 className="font-semibold mb-2">GitHub Contributions</h4>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 bg-green-500/50 rounded"
          />
        ))}
        
        
      </div>
    </div>
  );
}