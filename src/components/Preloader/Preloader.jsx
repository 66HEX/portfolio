import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import './preloader.css';
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Preloader = () => {
    useEffect(() => {
        const counter3 = document.querySelector('.counter-3');

        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 10; j++) {
                const div = document.createElement('div');
                div.className = 'num';
                div.textContent = j;
                counter3.appendChild(div);
            }
        }
        const finalDiv = document.createElement('div');
        finalDiv.className = 'num';
        finalDiv.textContent = '0';
        counter3.appendChild(finalDiv);

        function animate(counter, duration, delay = 0) {
            const numHeight = counter.querySelector('.num').clientHeight;
            const totalDistance =
                (counter.querySelectorAll('.num').length - 1) * numHeight;
            gsap.to(counter, {
                y: -totalDistance,
                duration: duration,
                delay: delay,
                ease: 'power2.inOut',
            });
        }

        animate(counter3, 5);
        animate(document.querySelector('.counter-2'), 6);
        animate(document.querySelector('.counter-1'), 2, 4);

        // Zmienne do przechowania referencji do elementów preloadera
        const preloader = document.querySelector('.loading-screen');
        const loader = document.querySelector('.loader');

        // Ustawienie opóźnienia, aby schowanie preloadera nastąpiło po zakończeniu odliczania
        const totalAnimationDuration = 7.5 * 1000; // 7.5 sekundy (odpowiednio przeliczone na milisekundy)

        // Ustawienie opóźnienia dla schowania preloadera
        const hideDelay = totalAnimationDuration - 500; // Opóźnienie schowania o 500 ms przed końcem animacji

        // Animacja schowania preloadera po zakończeniu odliczania
        gsap.to(loader, { opacity: 0, duration: 0.5, ease: 'power1.inOut', delay: hideDelay / 1000 });
        gsap.to(preloader, { opacity: 0, duration: 0.5, ease: 'power1.inOut', delay: hideDelay / 1000, onComplete: () => {
                preloader.style.display = 'none'; // Ukrycie preloadera po zakończeniu animacji
            } });

    }, []);

    return (
        <div className="loading-screen">
            <div className="counter">
                <div className="counter-1 digit">
                    <div className="num">0</div>
                    <div className="num num1offset1">1</div>
                </div>
                <div className="counter-2 digit">
                    <div className="num">0</div>
                    <div className="num num1offset2">1</div>
                    <div className="num">2</div>
                    <div className="num">3</div>
                    <div className="num">4</div>
                    <div className="num">5</div>
                    <div className="num">6</div>
                    <div className="num">7</div>
                    <div className="num">8</div>
                    <div className="num">9</div>
                    <div className="num">0</div>
                </div>
                <div className="counter-3 digit">
                    <div className="num">0</div>
                    <div className="num">1</div>
                    <div className="num">2</div>
                    <div className="num">3</div>
                    <div className="num">4</div>
                    <div className="num">5</div>
                    <div className="num">6</div>
                    <div className="num">7</div>
                    <div className="num">8</div>
                    <div className="num">9</div>
                </div>
            </div>
        </div>
    );
};

export default Preloader;