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
      angle.current -= 0.70;
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

  const FeatureCard = [
    {
      feature: "Auto-Updating Images",
      description: "Contribution graphs and Streaks update with each commit and time intervals."
    },
    {
      feature: "Visually Appealing Craft",
      description: "Customized Eye Catching readme components to turn boring data into masterpiece."
    },
    {
      feature: "AI Powered Genration",
      description: "Transforms your codebase into clear, structured documentation automatically."
    }
  ]

  return (
    <section id="solutions" className="feature-grid-section flex justify-between">

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


      <div className="h-full w-[60%] flex flex-col justify-center items-center text-center h-full bg-[#0D0D0D]">
        <div className="flex bg-blue-500 text-[#FF7A1A] justify-center items-center">
          <h1 className="font-antonio text-9xl">4X</h1>
          <h1 className="text-7xl font-danfo">{'>'}</h1>
          <h1 className="text-7xl font-danfo">{'>'}</h1>
          <h1 className="text-7xl font-danfo">{'>'}</h1>
        </div>
        <div>
          <div className="flex mt-4 gap-3">

            {FeatureCard.map((item) => (
              <div className="" key={item.feature}>
                <div className="bg-[#131313] h-[150px] w-[210px] pt-3">
                  <h1 className="text-[16px] font-bold">{item.feature}</h1>
                  <div className="mt-1 ml-5">

                  <p className="text-gray-500 text-left text-[12px] p-1">{item.description}</p>
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