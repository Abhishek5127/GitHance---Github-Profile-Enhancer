const cards = [
  {
    title: "Profile Builder",
    description: "Assemble sections with drag and drop controls and publish to your GitHub profile in minutes.",
  },
  {
    title: "README Studio",
    description: "Generate structure, add screenshots, and keep docs aligned with your repo in one flow.",
  },
  {
    title: "Repository Insights",
    description: "Find important files faster and onboard new contributors with clarity.",
  },
  {
    title: "Templates",
    description: "Start from curated layouts that match developer portfolios, startups, or OSS teams.",
  },
  {
    title: "Automation",
    description: "Sync your profile README with recent work and keep highlights fresh.",
  },
  {
    title: "Team Workspaces",
    description: "Maintain consistent branding across multiple repos and contributors.",
  },
];

export default function FeatureGrid() {
  return (
    <section id="solutions" className="mx-auto w-full max-w-7xl px-4 pb-20">
      <div className="w-full">
        <div className="">
          <div className="w-full flex justify-center items-center">
              {cards.map((item)=>(
                <div className="w-110px">
                  <div key={item.title}>
                 <div className="border-2 w-3xl h-[600px]" >
                  {item.title}
                 </div>
                  </div>                  
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}