---
layout: page
title: Development of a Core-Shell-Shell 3-D Printer for the Manufacturing of Dielectric Elastomers
permalink: /project4/
---

**Bajaj Lab**

**August 2024 - May 2025**

**Skills: Solidworks, COMSOL, Motor Control, SLA 3-D Printing**

3-D printing has changed modern manufacturing by enabling the rapid prototyping of components that would be difficult to create using traditional subtractive methods. An important component of 3-D printing is the filament choice, which determines the material properties that the resulting print is made of. However, another way to use the filament is to combine multiple filaments together in a core-shell cross-sectional structure, resulting in a material that can have unique properties compared to single material filaments. 

### Application

As a part of my time in the Bajaj Lab at the University of Pittsburgh, I designed a nozzle and syringe pump system for a 3-D Printer which would be used to manufacture Core-Shell-Shell filaments for the purpose of making dielectric elastomers. These utilize a conductive ionic core and outer shell, and a dielectric center shell to allow the filament to bend or elongate when an electrical current is run through the filament.

<div style="text-align: center;">
  <img src="/assets/project4/bend.png" alt="Bend" width="250">
  <img src="/assets/project4/elongate.png" alt="Elongate" width="250">
  <p>
    Using dielectric elastomer filaments, we can create thin filaments that bend and elongate when powered. 
  </p>
</div>

### Design & Simulation

First, I created a basic nozzle design that would would act as a preliminary prototype. This was designed in solidworks with the goal of being easily adjustable to help validate fluid flow. 

<div style="text-align: center;">
  <img src="/assets/project4/nozzle.png" alt="Headgear" width="350">
</div>

Next, we needed to ensure that the fluid flow was laminar as it exited the nozzle. I utilized COMSOL, which generated Reynolds numbers for all 3 fluids. This allowed us to validate that the liquids would not be turbulent as they exited the nozzle as the Reynolds numbers were all significantly lower than the turbulent number. 

Lastly, each fluid needs to be added to the nozzle at a different rate as to ensure all the fluids flow at the same velocity, the volumetric flow must be different for each fluids. For this, I designed 3 syringe pumps that would be used to introduce unique flow rates allowing the fluids to all flow at the same rate. 

<div style="text-align: center;">
  <img src="/assets/project4/syringes.png" alt="Headgear" width="750">
  <p>
    3 independent syringe pumps to control the volumetric flow rate of each liquid. 
  </p>
</div>

Through this project I built a baseline for the future 

