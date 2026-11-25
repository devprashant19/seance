import "./homepage.css";
import "./homepage-arcade.css";
import { Navbar } from "./Navbar.js";
import { Hero } from "./Hero.js";
import { FeatureShowcase } from "./FeatureShowcase.js";
import { HowItWorks } from "./HowItWorks.js";
import { ExperimentShowcase } from "./ExperimentShowcase.js";
import { SensorPrecision } from "./SensorPrecision.js";
import { SocialProof } from "./SocialProof.js";
import { Platform } from "./Platform.js";
import { CallToAction } from "./CallToAction.js";
import { Footer } from "./Footer.js";
import { useScrollReveal } from "./useScrollReveal.js";

export function HomePage() {
  useScrollReveal();

  return (
    <div className="homepage">
      <Navbar />
      <Hero />
      <FeatureShowcase />
      <HowItWorks />
      <ExperimentShowcase />
      <SensorPrecision />
      <SocialProof />
      <Platform />
      <CallToAction />
      <section className="brand-billboard reveal">
        <span className="brand-billboard-text">Séance</span>
      </section>
      <Footer />
    </div>
  );
}
