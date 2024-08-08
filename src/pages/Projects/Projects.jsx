import React, {useEffect} from "react";
import { Link } from "react-router-dom";
import "./projects.css";
import { useScramble } from "use-scramble";
import gsap from "gsap";
import {useGSAP} from "@gsap/react";

gsap.registerPlugin(useGSAP);

const useMultipleScrambles = (projects) => {
  return projects.map((project) => {
    const { ref: titleRef } = useScramble({
      text: project.title,
      speed: 1000,
    });
    const { ref: copyRef } = useScramble({
      text: project.copy,
      speed: 1000,
    });
    return { ...project, titleRef, copyRef };
  });
};

const Projects = () => {
  const projectData = [   
{
  title: "New Logo Design for Natalia Jasińska",
  copy: "Designed a fresh and distinctive logo to enhance brand identity",
  year: "2024",
  url: "https://nataliajasinska.pl/",
},
{
  title: "E-commerce Store for Natalia Jasińska",
  copy: "Launched a seamless online shopping experience using Shopify",
  year: "2024",
  url: "https://nataliajasinska.pl/",
},
{
  title: "Landing Page for Mo Commerce",
  copy: "Designed an impactful landing page highlighting marketing solutions",
  year: "2024",
  url: "https://66hex.github.io/mo-commerce/",
},
{
  title: "Sponsorship Proposal Design for Sports Club",
  copy: "Created a visually appealing sponsorship proposal to attract potential partners",
  year: "2024",
  url: "https://example.com/sportsclubproposal",
}
  ];

  const scrambledProjects = useMultipleScrambles(projectData);
  useEffect(() => {
    // Animacja tekstów wjeżdżających na planszę
    gsap.from(".projects-header", {
      opacity: 0,
      stagger: 0.4,
      duration: 1,
      ease: "power3.out",
    });

    gsap.to(".projects-header", {
      opacity: 1,
      stagger: 0.4,
      duration: 1,
      ease: "power3.out",
    });

  }, []);

  return (
      <div className="container page-projects">
        <h1 className={'projects-header'}>My projects</h1>
        {scrambledProjects.map((project, index) => (
            <Link key={index} to={project.url} className="project-item">
              <div className="project-title">
                <p ref={project.titleRef}>{project.title}</p>
              </div>
              <div className="project-copy">
                <p ref={project.copyRef}>{project.copy}</p>
              </div>
              <div className="project-divider"></div>
              <div className="project-year">
                <p>{project.year}</p>
              </div>
            </Link>
        ))}
      </div>
  )
};

export default Projects;
