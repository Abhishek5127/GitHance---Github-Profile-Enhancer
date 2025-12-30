import { getRelevantFiles } from "../lib/repo/getRelevantFiles";

const getrepoTree =async()=>{
    const res = await fetch('/api/repo')
}


const relevantFiles = getRelevantFiles(repoTree);

return (
  <ul>
    {relevantFiles.map((item) => (
      <li key={item.path}>
        {item.type === "folder" ? "📁" : "📄"} {item.path}
      </li>
    ))}
  </ul>
);
