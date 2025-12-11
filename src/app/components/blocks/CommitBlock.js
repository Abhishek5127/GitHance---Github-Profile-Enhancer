import React from "react";
import { CommitGraph } from "commit-graph";

const CommitBlock = () => {
  const commits = [
    // Commits data according to the new Commit type
  ];
  const branchHeads = [
    // Branch heads data according to the new Branch type
  ];

  return (
    <CommitGraph
      commits={commits}
      branchHeads={branchHeads}
      graphStyle={{
        commitSpacing: 50,
        branchSpacing: 20,
        branchColors: ["#FF0000", "#00FF00", "#0000FF"],
        nodeRadius: 2,
      }}
      getDiff={async (base, head) => {
        // Your implementation to fetch diff stats
        return {
          files: [
            {
              filename: "example.txt",
              status: "modified",
              additions: 10,
              deletions: 2,
            },
          ],
        };
      }}
    />
  );
};

export default CommitBlock;