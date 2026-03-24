import "./globals.css";
import ClientProviders from "./ClientProvider";
import { antonio, poppins, danfo } from "./fonts";
import "github-markdown-css/github-markdown.css";

export const metadata = {
  title: "Githance",
  description: "Github Profile Enhancer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${antonio.variable} ${poppins.variable} ${danfo.variable}`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
