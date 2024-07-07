import React, { useEffect } from "react";
import gsap from "gsap";
import "./About.css";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(useGSAP);

const About = () => {
    useEffect(() => {

        gsap.from(".about-header", {
            opacity: 0,
            stagger: 0.5,
            duration: 1,
            ease: "power3.out",
        });

        gsap.from(".about-paragraph", {
            opacity: 0,
            stagger: 0.5,
            duration: 1,
            ease: "power3.out",
        });
        gsap.to(".about-header", {
            opacity: 1,
            stagger: 0.5,
            duration: 1,
            ease: "power3.out",
        });

        gsap.to(".about-paragraph", {
            opacity: 1,
            stagger: 0.5,
            duration: 1,
            ease: "power3.out",
        });

    }, []);

    return (
        <>
            <div className={'about-container'}>
                <div className={'about-container-2'}>
                    <h1 className={'about-header first-header'}>About Me</h1>
                    <p className={'about-paragraph'}>My name is Marek Jóźwiak, and I am a web developer passionate about
                        creating modern and
                        functional websites. Although I am relatively new to the world of web development, I have been
                        learning intensively for the past year and have started working on my first commercial
                        projects.
                    </p>
                    <h2 className={'about-header'}>My Story</h2>
                    <p className={'about-paragraph'}>
                        Before embarking on my journey in programming, I spent many years working in the electronics
                        industry. My professional experience in electronics taught me precision, analytical thinking,
                        and technical problem-solving skills. These abilities have proven to be incredibly useful in my
                        new career path as a web developer.
                    </p>
                    <h2 className={'about-header'}>Why Me?</h2>
                    <p className={'about-paragraph last-paragraph'}>
                        I understand how important it is for you to have a website that is not only functional but also aesthetically pleasing and user-friendly. My experience allows me to approach projects from a technical perspective and pay attention to every detail, while my newly acquired programming skills enable me to implement modern and effective solutions.
                    </p>
                </div>
                <div className={'about-container-2-image'}>

                </div>
            </div>
        </>
    );
};

export default About;
