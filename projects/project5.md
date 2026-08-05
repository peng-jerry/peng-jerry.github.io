---
layout: page
title: Launch-a-Birdie
permalink: /project5/
---

Badminton players need to practice many skills to improve their performance at the game. However, some drills require the shots to be practiced at high volume and high consistency in order to get a meaningful practice session. In most cases, these conditions cannot be provided by other players as they cannot hit the birdie consistently and continuously for the volume necessary for these practice drills.

Through the Launch-a-Birdie project, we set out to design a low-cost robotic launcher that could help these players achieve these results.

We broke the system into four subsystems — storage, feeding, aiming, and launching — and worked through structured concept generation, and CAD development for each. We landed on a rotating base for aiming, a star-wheel indexer for feeding, dual counter-rotating flywheels for launching, and a simple tube for storage.

<div style="text-align: center;">
  <img src="/assets/project_cards/Launch.png" alt="Launch">
  <p>
    Full CAD Model of our design
  </p>
</div>

Once that was completed, I primarily worked on the electrical wiring and code work for our motors to ensure our design worked. This included testing of the motors, power distribution, and programming of the motors. 

<div style="text-align: center;">
  <img src="/assets/project5/Wiring.png" alt="Wiring" width="350">
  <img src="/assets/project5/Arduino.png" alt="Arduino" width="350">
  <p>
    Using dielectric elastomer filaments, we can create thin filaments that bend and elongate when powered. 
  </p>
</div>

This was my first hands-on experience designing a full electrical system from scratch. It involved considering power budgeting, signal integrity, and failure points across a system with seven motors and multiple voltage levels. Working with ESCs and brushless motors gave me a much deeper understanding of how motor control signals translate to real mechanical output. As well, a challenge we faced was utilizing breadboards vs. circuit boards. On one hand, breadboards made changing circuits and wires easy, but increased overall complexity as you had to ensure every wire was correctly placed. On the other hand, when we used circuit boards, our soldering was sometimes imperfect, and if we had to make a change it required a lot of effort to correct. If I had to do this project over again, I would work to design a custom PCB, or buy one rather than soldering my own or using breadboards. 

We then validated our launcher by performing reliability, range and accuracy tests. These demonstrated the efficacy of our design and hitting performance targets. 

<div style="text-align: center;">
  <img src="/assets/project5/Landing.png" alt="Landing">
  <p>
    Full CAD Model of our design
  </p>
</div>

Overall, I was very satisfied with how our design turned out. Launch-a-birdie allowed us to take a concept, design specifications, manufacture prototypes and turn it into a working electromechanical system. Through the project, I gained many technical skills in mechatronics and also invaluable experience in working on a team. 

Video
