import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "@/app/utils/gsap/SplitText";
import { Scene } from "@/app/components/Scene/Scene";
import { useGSAP } from "@gsap/react";
import { useRef, useState, useEffect } from "react";

gsap.registerPlugin(SplitText, CustomEase);

export default function Hero() {
    const descRef = useRef<HTMLHeadingElement>(null);
    const [isLoaded, setIsLoaded] = useState(false); // Dodajemy stan dla załadowania komponentu

    CustomEase.create("customEase", "0.76,0,0.24,1");

    useEffect(() => {
        const handleLoad = () => {
            setIsLoaded(true);
        };

        handleLoad();
    }, []);

    useGSAP(() => {
        if (!isLoaded) return;

        const childSplit = new SplitText(descRef.current, { type: "lines" });
        new SplitText(descRef.current, {
            type: "lines",
            linesClass: "line-wrapper overflow-hidden",
        });
        const texts = childSplit.lines;
        const tl = gsap.timeline({ defaults: { ease: "customEase" } });
        tl.fromTo(
            "#hero-title",
            { x: -100, opacity: 0 },
            { x: 0, opacity: 1, duration: 1 }
        )
            .fromTo(
                "#hero-scene",
                { opacity: 0, filter: "blur(10px)", scale: 0.75 },
                { opacity: 1, filter: "blur(0px)", scale: 1, duration: 1.5 },
                "-=1"
            )
            .fromTo(
                texts,
                { y: '100%', opacity: 0 },
                { y: '0%', opacity: 1, duration: 1 },
                "-=0.5"
            );
    }, [isLoaded]);

    return (
        <section
            id="home"
            className="h-svh w-screen p-4 font-AeonikProRegular text-textPrimary"
        >
            <div className="h-1/3 w-full grid grid-cols-4">
                <div className="col-span-1 h-full">
                    <h1 id="hero-title" className="text-6xl">
                        hex.
                    </h1>
                </div>
                <div className="col-span-4 xl:col-span-2 h-full flex justify-end items-end pb-4 md:pb-8 px-0 md:px-8">
                    <h1 ref={descRef} id="hero-description" className="text-xl md:text-4xl">
                        Empowering visionary brands, crafting exceptional digital products,
                        and delivering unforgettable experiences.
                    </h1>
                </div>
            </div>
            <div
                id="hero-scene"
                className="h-2/3 w-full bg-card shadow-cardShadow flex flex-col justify-center items-center overflow-hidden relative rounded-cardRadius"
            >
                <Scene />
            </div>
        </section>
    );
}
