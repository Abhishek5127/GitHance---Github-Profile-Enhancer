export function generateHeaderSvg({
  text,
  bannerUrl,
  fontSize = 36,
  color = "#ffffff",
}) {
  const WIDTH = 1600;
  const HEIGHT = 50;

  return `
<svg
  width="${WIDTH}"
  height="${HEIGHT}"
  viewBox="0 0 ${WIDTH} ${HEIGHT}"
  xmlns="http://www.w3.org/2000/svg"
>

  <defs>
    <style>
      @font-face {
        font-family: 'YujiBoku';
        src: url(data:font/woff2;base64,BASE64_FONT_DATA_HERE) format('woff2');
        font-weight: 400;
      }
    </style>
  </defs>

  <!-- Background image -->
  <image
    href="${bannerUrl}"
    width="${WIDTH}"
    height="${HEIGHT}"
    preserveAspectRatio="xMidYMid slice"
  />

  <!-- subtle dark overlay -->
  <rect
    width="${WIDTH}"
    height="${HEIGHT}"
    fill="black"
    opacity="0.35"
  />

  <!-- Centered text -->
  <text
    x="${WIDTH / 2}"
    y="${HEIGHT / 2}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="YujiBoku"
    font-size="${fontSize}"
    fill="${color}"
  >
    ${escapeXml(text)}
  </text>

</svg>
`;
}

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  }[c]));
}
