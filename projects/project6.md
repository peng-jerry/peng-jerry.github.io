---
layout: page
title: Autonomous Control for Unmanned Surface Vehicles (USVs)
permalink: /project6/
---
**Robomechanics Lab**

**August 2025 - Present**

**Skills: Python, Unreal Engine 5, MPPI & Optimal Control**

Unmanned Surface Vehicles (USVs) are vital for performing maritime tasks without the need for a human crew. Autonomous Oeration allow USVs to perform tasks in hazardous or hard-to-reach areas, reducing risks to human life.

However, designing USVs presents several challenges. Most notably, boat and water dynamics are often uncertain and too complex to model accurately, and while long-horizon control strategies exist, they are typically not well suited to handle sudden disturbances or changes in direction. 

As a part of Robomechanics Lab, I have been working to develop a controller to devise optimal steering configurations for unmanned surface vessels (USVs) in difficult maritime situations. 

In order to validate our results we must choose a controller and create a simulator to validate our choice. 

### Optimal Control
We found MPPI to be the best controller for our application. This was for a few main reasons: it was more easily tunable and had better disturbance rejection than other optimal control algorithms. As well, MPPI is not gradient-based, making it better at handling nonlinear dynamics. This means that we don't have to rely on our model to produce good steering configurations on an actual vessel.

<div style="text-align: center;">
  <img src="/assets/project_cards/mppi_sim.gif" alt="mppi_sim" width="500">
</div>

### Simulator
Next, we also needed to create a simulation environment to validate our control inputs. We chose Unreal Engine 5 as it had the best hydrodynamic modeling, easy integration of disturbance through waves, and gave us easy avenues for data collection. 

We used Open Sound Control to communicate between the simulator which allowed us to update controls in real time. 

### Future Work
In the future, we hope to implement our controller into Unreal Engine 5 to show that it works and work towards testing & validation on an actual boat. 

Through these, we look to show that these are able to provide the level of control and precision that we need and are looking to implement it on a physical system in the upcoming semester. 

<div style="text-align: center;">
  <img src="/assets/project6/BlueBoat.png" alt="BlueBoat" width="500">
  <p>
    BlueBoat, USV for Robotics to perform on-water validation
  </p>
</div>

