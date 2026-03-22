"use client";
import { useEffect, useRef } from "react";
import './FeatureGrid.css'
import Readme1 from "@/app/UI/home/FeatureGridElements/readme1";
import Readme2 from "@/app/UI/home/FeatureGridElements/readme2";
import Readme3 from "@/app/UI/home/FeatureGridElements/readme3";
import Readme4 from "@/app/UI/home/FeatureGridElements/readme4";
import Readme5 from "@/app/UI/home/FeatureGridElements/readme5";
import Readme6 from "@/app/UI/home/FeatureGridElements/readme6";
import Readme7 from "@/app/UI/home/FeatureGridElements/readme7";
import Readme8 from "@/app/UI/home/FeatureGridElements/readme8";

export default function FeatureGrid() {
  const sliderRef = useRef(null);
  let currentActive = useRef(null);
  let angle = useRef(0);

  useEffect(() => {
    const slider = sliderRef.current;

    function animate() {
      angle.current -=0.10;
      slider.style.setProperty("--rotate", angle.current + "deg");
      requestAnimationFrame(animate);
    }

    function trackMidPoint() {
      const rect = slider.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const el = document.elementFromPoint(centerX, centerY);

      if (el && el.closest(".fg-card")) {
        if (el.closest(".fg-card") !== currentActive.current) {
          if (currentActive.current) {
            currentActive.current.classList.remove("active");
          }

          const newActive = el.closest(".fg-card");
          newActive.classList.add("active");
          currentActive.current = newActive;
        }
      }

      requestAnimationFrame(trackMidPoint);
    }

    animate();
    trackMidPoint();
  }, []);

  const components = [
    Readme1,
    Readme2,
    Readme3,
    Readme4,
    Readme5,
    Readme6,
    Readme7,
    Readme8,
  ];

  return (
    <section id="solutions" className="feature-grid-section">
      <div className="fg-wrapper" style={{ "--quantity": components.length }}>
        <div className="fg-slider" ref={sliderRef}>
          {components.map((Comp, i) => (
            <div
              key={i}
              className="fg-item"
              style={{ "--position": i + 1 }}
            >
              <div className="fg-card">
                <Comp />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}