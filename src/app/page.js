import LandingNav from "./components/landing/LandingNav";
import Hero from "./components/landing/Hero";
import Highlights from "./components/landing/Highlights";
import FeatureGrid from "./components/landing/FeatureGrid";
import Workflow from "./components/landing/Workflow";
import Footer from "./components/landing/Footer";
import Pricing from "./components/landing/Pricing";
import HowItWorks from "./components/landing/HowItWorks";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.35),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.25),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08),_transparent_60%)] blur-3xl" />
        <LandingNav />
        <Hero />
      </div>
      <HowItWorks/>
      <Highlights />
      <FeatureGrid />
      <Workflow />
      <Pricing/>
      <Footer />
    </div>
  );
}