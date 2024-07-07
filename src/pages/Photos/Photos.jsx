import React from "react";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./photos.css";
import WorkImage1 from "/work/lean-bulls/leanbulls-home.jpg";
import WorkImage2 from "/work/lean-bulls/leanbulls-about.jpg";
import WorkImage3 from "/work/lean-bulls/leanbulls-coaches.jpg";
import WorkImage4 from "/work/lean-bulls/leanbulls-powerlifting.jpg";
import WorkImage5 from "/work/mo-commerce/mo-home.jpg";
import WorkImage6 from "/work/mo-commerce/mo-about.jpg";
import WorkImage7 from "/work/mo-commerce/mo-services.jpg";
import WorkImage8 from "/work/mo-commerce/mo-contact.jpg";
import WorkImage9 from "/work/natalia-jasinska/natalia-home.jpg";
import WorkImage10 from "/work/natalia-jasinska/natalia-home-2.jpg";
import WorkImage11 from "/work/natalia-jasinska/natalia-products.jpg";
import WorkImage12 from "/work/natalia-jasinska/natalia-powereater.jpg";

gsap.registerPlugin(useGSAP);

const Photos = () => {
  const container = useRef();
  useGSAP(
      () => {
        gsap.from(".photos-col img", { y: 300, stagger: 0.025, opacity: 0 });
      },
      { scope: container }
  );
  return (
      <div className="container page-photos" ref={container}>
          <div className="photos-col">
              <img src={WorkImage1} alt=""/>
              <img src={WorkImage2} alt=""/>
              <img src={WorkImage3} alt=""/>
              <img src={WorkImage4} alt=""/>
              <img src={WorkImage5} alt=""/>
              <img src={WorkImage6} alt=""/>
          </div>
          <div className="photos-col">
              <img src={WorkImage9} alt=""/>
              <img src={WorkImage10} alt=""/>
              <img src={WorkImage11} alt=""/>
              <img src={WorkImage12} alt=""/>
              <img src={WorkImage7} alt=""/>
              <img src={WorkImage8} alt=""/>
          </div>
      </div>
  );
};

export default Photos;
