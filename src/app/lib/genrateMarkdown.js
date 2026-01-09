export default function generateMarkdown(canvasItems) {
    let markdown = "";

    canvasItems.forEach((item) => {
        if (!item.id) return;

        // 🔑 Extract block type from id
        const block = item.id.split("-")[1];

        /* ---------- HEADER ---------- */
        if (block === "header" && item.variant === "typingHeader") {
            markdown += `
<div align="center">
  <img src="https://readme-typing-svg.demolab.com/?lines=Hi%20there,%20I%27m%20Abhishek!;Top+10+GitHub+Committer+in+India;Top+10+LeetCoder+in+India&font=Fira%20Code&center=true&width=640&height=45&color=ff79c6&vCenter=true&pause=1000&size=30" />
</div>

`;
        }
        if (block === "header" && item.variant === "image") {
            markdown += `
<img src="./${item.data.exportPath}" />

`;
        }
        if (block === "header" && item.variant === "simple") {
            markdown += `<h1>${item.text}</h1>`
            console.log(item.text)
        }



        /* ---------- BIO ---------- */
        if (block === "bio") {
            markdown += `${item.data?.text || ""}\n\n`;
        }

        /* ---------- SKILLS ---------- */
        if (block === "skills") {
            markdown += "## Skills\n";
            item.data?.skills?.forEach((skill) => {
                markdown += `- ${skill}\n`;
            });
            markdown += "\n";
        }

        /* ---------- CONTRIBUTIONS ---------- */
        if (block === "contributions") {
            markdown += "## Contributions\n";
            markdown += `![GitHub Contributions](https://github-readme-activity-graph.vercel.app/graph?username=${item.data?.username})\n\n`;
        }
    });

    return markdown.trim();
}
