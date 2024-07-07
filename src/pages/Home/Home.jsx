import React, { useEffect } from "react";
import { gsap } from "gsap";
import Spline from "@splinetool/react-spline";
import LiveClockUpdate from "../../components/LiveClockUpdate/LiveClockUpdate";
import "./home.css";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Home = () => {
    useEffect(() => {

        gsap.from(".spline-container", {
            duration: 1,
            opacity: 0,
            ease: "power3.in",
            delay: 0,
        });

        gsap.from(".hero-paragraph", {
            duration: 1,
            y: -50,
            opacity: 0,
            ease: "power3.out",
            delay: 0.5,
        });

        gsap.from(".hero-paragraph2", {
            duration: 1,
            y: -50,
            opacity: 0,
            ease: "power3.out",
            delay: 1,
        });

        gsap.from(".live-clock", {
            duration: 1,
            y: -50,
            opacity: 0,
            ease: "power3.out",
            delay: 1.5,
        });

        gsap.from(".hero-logo", {
            duration: 1,
            opacity: 0,
            ease: "power3.out",
            delay: 0.5,
        });

        gsap.to(".spline-container", {
            duration: 1,
            opacity: 1,
            ease: "power3.in",
            delay: 0,
        });

        gsap.to(".hero-paragraph", {
            duration: 1,
            y: 0,
            opacity: 1,
            ease: "power3.out",
            delay: 0.5,
        });

        gsap.to(".hero-paragraph2", {
            duration: 1,
            y: 0,
            opacity: 1,
            ease: "power3.out",
            delay: 1,
        });

        gsap.to(".live-clock", {
            duration: 1,
            y: 0,
            opacity: 1,
            ease: "power3.out",
            delay: 1.5,
        });

        gsap.to(".hero-logo", {
            duration: 1,
            opacity: 1,
            ease: "power3.out",
            delay: 2,
        });
    }, []);

    return (
        <>
            <div className={'hero-container container'}>
                <img className="hero-logo" src="src/assets/images/hex-logo.png" alt="Logo"/>
                <div className="spline-container">
                    <Spline className="spline-blur"
                            scene="https://prod.spline.design/H-L8tIuQGwRClfeH/scene.splinecode"/>
                </div>
            </div>
            <div className="title">
                <p className="hero-paragraph">Freelance Web Developer</p>
            </div>
            <div className="title">
                <p className="hero-paragraph2">Marek Jóźwiak</p>
            </div>
            <div className="live-clock">
                <LiveClockUpdate/>
            </div>
        </>
    );
};

export default Home;
