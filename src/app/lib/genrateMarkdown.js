export default function generateMarkdown(canvasItems,simpleHeaderTitle,simpleHeaderSubTitle) {
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
            <div className="flex align-center">
<img src="https://ghchart.rshah.org/abhishek5127" alt="contribution Graph Image"></img>
</div>
`;
        }
        if (block === "header" && item.variant === "simple") {
            markdown += `![${simpleHeaderTitle}](https://img.shields.io/badge/Abhishek%20Choudhary-cfe8ff?style=for-the-badge&labelColor=cfe8ff&color=#238636)
<br/>
![${simpleHeaderSubTitle}](https://img.shields.io/badge/Senior%20Software%20Engineer-3c3c3c?style=for-the-badge&labelColor=#238636&color=3c3c3c)
`
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
            markdown += `<img src="https://ghchart.rshah.org/abhishek5127" alt="contribution Graph Image"></img>`;
        }
    });

    return markdown.trim();
}
