export default function generateMarkdown(canvasItems) {
    let markdown = "";

    canvasItems.forEach((item) => {

        if (item.type === "header") {
            markdown += `<div className="rounded flex justify-center items-center bg-[#0b0d0f] p-4 border border-white/10">
      <img src="https://readme-typing-svg.demolab.com/?lines=Hi%20there,%20I%27m%20Abhishek!;Top+10+GitHub+Committer+in+India;Top+10+LeetCoder+in+India&font=Fira%20Code&center=true&width=640&height=45&color=ff79c6&vCenter=true&pause=1000&size=30" alt="img" />
    </div>`;
        }

        if (item.type === "bio") {
            markdown += `${item.data.text}\n\n`;
        }

        if (item.type === "skills") {
            markdown += "## Skills\n";
            item.data.skills.forEach((skill) => {
                markdown += `- ${skill}\n`;
            });
            markdown += "\n";
        }

        if (item.type === "contributions") {
            markdown += "## Contributions\n";
            markdown += `![GitHub Contributions](https://github-readme-activity-graph.vercel.app/graph?username=${item.data.username})\n\n`;
        }
    });

    return markdown;
}
