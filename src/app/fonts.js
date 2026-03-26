import { Antonio, Danfo, Poppins } from "next/font/google";

export const antonio = Antonio({
  subsets: ["latin"],
  variable: "--font-antonio",
  display: "swap",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const danfo = Danfo({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-danfo",
  display: "swap",
});

