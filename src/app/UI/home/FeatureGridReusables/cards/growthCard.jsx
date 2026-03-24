"use client";

import { assets } from "@/app/assets/assets";
import { antonio,poppins,danfo } from "@/app/fonts";
import Image from "next/image";

const featureCards = [
  {
    feature: "Auto-Updating Images",
    description:
      "Contribution graphs and Streaks update with each commit and time intervals.",
    svg: assets.AutoUpdate,
  },
  {
    feature: "Visually Appealing Craft",
    description:
      "Customized eye-catching readme components to turn boring data into a masterpiece.",
    svg: assets.Eye,
  },
  {
    feature: "AI Powered Generation",
    description:
      "Transforms your codebase into clear, structured documentation automatically.",
    svg: assets.AI,
  },
];

export default function GrowthCard() {
  return (
    <div>
      <div className="flex w-[100%] ml-10 h-[30%] gap-2 text-[#FF7A1A] items-center">
        <div className="relative">
        <h1 className={`${antonio.className} text-9xl`}>4X</h1>
        </div>
        <div className="absolute ml-2 translate-x-25 translate-y-8 flex">
        <h1 className={`text-[140px] opacity-100 ${danfo.className}`}>{">"}</h1>
        <h1 className={`text-[140px] opacity-50 ${danfo.className}`}>{">"}</h1>
        <h1 className={`text-[140px] opacity-20 ${danfo.className}`}>{">"}</h1>
        </div>
      </div>
      <div>
        <div className="flex m-3 gap-3">
          {featureCards.map((item) => (
            <div key={item.feature}>
              <div className="bg-[#131313] h-[152px] w-[206px] pt-3">
                <div className="ml-2">
                  <Image src={item.svg} height={13} width={13} alt="svg" />
                </div>
                <h1 className={`text-[16px] ${antonio.className} font-bold`}>{item.feature}</h1>
                <div className="mt-1 h-[80%] flex justify-center items-top ml-5">
                  <p className={`text-gray-500 ${poppins.className} font-semibold text-left text-[12px] p-1`}>
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={`bg-[#131313] overflow-hidden h-[188px] flex justify-around items-center ml-4 mr-4`}>
          <div>
            <Image
              src={assets.AnalyzeGraph}
              width={255}
              alt="analyze graph"
              className="rounded-[10px]"
            />
          </div>

          <div className="w-[50%] h-[90%] flex flex-col justify-top items-center">
            <h1 className={`text-[19px] ${antonio.className} mt-2 mb-3 font-bold`}>
              Analyze Repositories
            </h1>
            <div>
              <p className={`text-gray-500 ${poppins.className} font-semibold text-center text-[12px] p-1`}>
                GitHance analyzes your repository to understand its structure,
                technologies, and key components using AI. It turns raw code
                into clear, structured insights for smarter documentation and
                presentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

