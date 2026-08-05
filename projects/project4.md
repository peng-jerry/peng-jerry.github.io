---
layout: page
title: Development of a Core-Shell-Shell 3-D Printer for the Manufacturing of Dielectric Elastomers
permalink: /project4/
---

**Bajaj Lab**  
**August 2024 - May 2025**  
**Skills: Solidworks, COMSOL, Motor Control, SLA 3-D Printing**

### Design Motivation
3-D printing has changed modern manufacturing by enabling the rapid prototyping of components that would be difficult to create using traditional subtractive methods. An important component of 3-D printing is the filament choice, which determines the material properties that the resulting print is made of. However, another way to use the filament is to combine multiple filaments together in a core-shell cross-sectional structure, resulting in a material that can have unique properties compared to single material filaments. 

As a part of my time in the Bajaj Lab at the University of Pittsburgh, I designed a nozzle and syringe pump system for a 3-D Printer which would be used to manufacture Core-Shell-Shell filaments for the purpose of making dielectric elastomers. These utilize a conductive ionic core and outer shell, and a dielectric center shell to allow the filament to bend or elongate when an electrical current is run through the filament.

<div style="text-align: center;">
  <img src="/assets/project4/bend.png" alt="Bend" width="300">
  <img src="/assets/project4/elongate.png" alt="Elongate" width="300">
  <p>
    Taken from "Fiber-Format Dielectric Elastomer Actuators by the Meter" (https://doi.org/10.1002/adfm.202314056)
  </p>
</div>

### Nozzle Design & COMSOL Simulation
First, I created a basic nozzle design that would would act as a preliminary prototype. This was designed in Solidworks with the goal of being easily adjustable to help validate fluid flow. 

<div style="text-align: center;">
  <img src="/assets/project4/nozzle.png" alt="Nozzle" width="600">
</div>

Next, we needed to ensure that the fluid flow was laminar as it exited the nozzle. I utilized COMSOL, which generated Reynolds numbers for all 3 fluids. This allowed us to validate that the liquids would not be turbulent as they exited the nozzle.

<div style="text-align: center;">
  <img src="/assets/project4/COMSOL.png" alt="COMSOL" width="500">
</div>

From the simulation, the maximum Reynolds number generated was ~100, way lower than the 2000 threshold required to be laminar. 

### Syringe Pumps & Conclusion
Lastly, since each fluid occupies a different cross-sectional area within the nozzle, matching their exit velocities requires introducing each fluid at a different volumetric flow rate. To achieve this, I built three independent syringe pumps using Luer lock syringes, each capable of driving a unique flow rate so that all three fluids would exit the nozzle at the same velocity.

<div style="text-align: center;">
  <img src="/assets/project4/syringes.png" alt="Syringes" width="750">
  <p>
    3 independent controlled stepper motors allow each fluid to be pumped at a different rate. 
  </p>
</div>

This project established a foundation for future use to produce core-shell-shell filaments. The COMSOL simulations and prototype syringe pump testing demonstrates the viability of the project while leaving room for future improvements and design changes. Overall, this has been by far my most-open ended project. It gave me insights into the research process, as well has learning to be independent and generating next steps. 

