import { Antonio, Poppins} from "next/font/google";
import { Danfo } from "next/font/google";

export const antonio = Antonio({
  subsets: ["latin"],
  variable: "--font-antonio",
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});
export const danfo = Danfo({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-danfo",
});
