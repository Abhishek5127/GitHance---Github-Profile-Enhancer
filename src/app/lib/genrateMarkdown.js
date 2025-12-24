export default function generateMarkdown(canvasItems) {
    let markdown = "";

    canvasItems.forEach((item) => {

        if (item.type === "header") {
            markdown += `# ${item.data.text}\n\n`;
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
