// @ts-nocheck

import * as T from "../CS559FinalProject/libs/CS559-Three/build/three.module.js";
import { OrbitControls } from "../CS559FinalProject/libs/CS559-Three/examples/jsm/controls/OrbitControls.js";


let renderer = new T.WebGLRenderer({preserveDrawingBuffer:true});
renderer.setSize(500, 500);
document.getElementById("div1").appendChild(renderer.domElement);
renderer.domElement.id = "canvas";

// Code modified from WB6
let scene = new T.Scene();

scene.background = new T.Color(0x68b2e3);

// Add ground plane to scene
let basicMaterial = new T.MeshStandardMaterial({ color: "green", roughness: 1, metalness: 0})
let texturedMaterialTL = new T.TextureLoader().load("grass_texture.jpg");
let texturedMaterial = new T.MeshStandardMaterial({
  color: "white",
  metalness: 0,
  roughness: 1,
  map: texturedMaterialTL
});

let groundPlaneMesh = new T.Mesh(new T.BoxGeometry(20, 0.2, 20), basicMaterial);
groundPlaneMesh.position.set(0,-0.1,0);
scene.add(groundPlaneMesh);

// AI helped with writing the event listener
let grassCheckbox = document.getElementById("grassTexture");
grassCheckbox.addEventListener("change", function () {
  if (grassCheckbox.checked) {
    groundPlaneMesh.material = texturedMaterial;
  } else {
    groundPlaneMesh.material = basicMaterial;
  }
});

// Add light to scene
const light = new T.PointLight("white", 200, 100);
light.position.set(0, 10, 0);
scene.add(light);

// Add ambient skylight
const ambientLight = new T.AmbientLight(0x68b2e3, 0.5);
scene.add(ambientLight);

function getRandomPosition() {
  let sizeMult = 18;
  return {x: (Math.random()-0.5)*sizeMult, y: (Math.random()-0.5)*sizeMult}
}

function getDistance(pos1, pos2) {
  return Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
}

class Drawable {
  mesh = new T.Mesh(new T.SphereGeometry(), new T.MeshStandardMaterial({color:"#FFFFFF", roughness: 1, metalness: 0}));

  initialize = function() {
    scene.add(this.mesh);
  };

  position = getRandomPosition();

  move = function() {
    this.mesh.position.set(this.position.x,0,this.position.y);
  };

  delete = function () {
    scene.remove(this.mesh);
  };
}

class Bush extends Drawable {
  constructor(newSize) {
    super();
    this.size = newSize;
    this.mesh = new T.Mesh(new T.SphereGeometry(this.size*0.2), new T.MeshStandardMaterial({color:"#0caa49", roughness: 1, metalness: 0}));
  }
  // Bush size either 1 or 2
  size = 1;
}
let bushList = [];
for (let i = 0; i < 10; i++) {
  bushList.push(new Bush(1));
}
for (let i = 0; i < 15; i++) {
  bushList.push(new Bush(2));
}
bushList.forEach(bush => {
  bush.initialize();
  bush.move();
});

class Animal extends Drawable {
  constructor(newSpeed, newEndurance, newCamoflage) {
    super();
    this.speed = newSpeed;
    this.endurance = newEndurance;
    this.camoflage = newCamoflage;
  }

  // Basic animal stats that vary between generations. Traits are normalized to a sum of 1.
  // How fast an animal can run compared to normal
  speed = 1/3;
  // How long an animal can run for
  endurance = 1/3;
  // How close a predator animal needs to be in order to spot the animal
  camoflage = 1/3;

  // Base mults used in all speed, endurance, and camoflage calculations
  speedMult = 3;
  enduranceMult = 5;
  camoflageMult = 1;

  // How long the animal has been running for. Used for endurance.
  runTimer = 0;

  // How long animal is hiding in a bush.
  bushTimer = 0;

  // Size of the animal: 0 = hide in all bushes, 1 = hide in large bushes, 2 = no hiding
  size = 0;

  // State of the animal, higher states are greater priority: 0 = Wandering, 1 Hunting / Eating, 2 = Fleeing, 3 = Hidden
  state = 0;

  // Target bush the animal will go to when hunted
  bushTarget;

  // Animal which is currently hunting the animal
  huntedBy;

  // Finds the closest bush with the animal's size constraint
  findBush = function() {
    let currentClosest = null;
    bushList.forEach(bush => {
      if (this.size < bush.size && 
        (currentClosest == null || getDistance(this.position, bush.position) < getDistance(this.position, currentClosest.position))) {
          currentClosest = bush;
      }
    });

    // Update bush target
    this.bushTarget = currentClosest;
  }

  // Updates the animal's position based on the state
  // AI helped with writing the code
  
  // Variables for wandering
  wanderAngleChange = Math.random() * 3 + 2; // Time to change direction (between 2 and 5 seconds)
  wanderLastChange = 0; // Tracks the time since the last direction change
  wanderAngle = Math.random() * Math.PI * 2; // Initial random direction
  wanderSpeed = 0.5; // Speed in which the ai moves

  flee = function() {
    if (this.state < 3) {
      this.findBush();
      this.state = 3;
    }
  }

  // Resets state to wander
  wander() {
    this.state = 0;
  }

  update(timeDelta) {
    // Update the mesh position
    this.move();

    if (this.state == 0) {
      // Update the time since the last direction change
      this.wanderLastChange += timeDelta;
      // Reduce run timer as animal is not running
      this.runTimer = Math.max(this.runTimer - timeDelta / 10, 0);

      // If the time exceeds the random interval, change direction
      if (this.wanderLastChange >= this.wanderAngleChange) {
        this.wanderLastChange = 0; // Reset the timer
        this.wanderAngleChange = Math.random() * 3 + 2; // Get a new random time interval for the next change
        this.wanderAngle = Math.random() * Math.PI * 2; // Random new direction
      }

      // Calculate movement
      let dx = Math.cos(this.wanderAngle) * this.wanderSpeed * timeDelta;
      let dy = Math.sin(this.wanderAngle) * this.wanderSpeed * timeDelta;

      // Update position, ensuring predator stays within the world boundaries (0 to 10)
      this.position.x += dx;
      this.position.y += dy;
      this.position.x = Math.max(-10, Math.min(10, this.position.x));
      this.position.y = Math.max(-10, Math.min(10, this.position.y));

    } else if (this.state == 3) {
      // Test if bush is met
      if (getDistance(this.bushTarget.position, this.position) < 0.1) {
        this.state = 4;
        // Make other animal give up on the chase
        if (this.huntedBy.state < 2) this.huntedBy.wander();
      } else {
        // Update run time
        this.runTimer = Math.min(this.runTimer + timeDelta, this.enduranceMult*this.endurance);
    
        let runIndicator = this.runTimer < this.enduranceMult*this.endurance ? 1 : 0;

        // Calculate movement
        let dx = Math.cos(Math.atan2(this.bushTarget.position.y - this.position.y, this.bushTarget.position.x - this.position.x)) * (this.wanderSpeed + this.speedMult*this.speed * runIndicator) * timeDelta;
        let dy = Math.sin(Math.atan2(this.bushTarget.position.y - this.position.y, this.bushTarget.position.x - this.position.x)) * (this.wanderSpeed + this.speedMult*this.speed * runIndicator) * timeDelta;

        // Update position
        this.position.x += dx;
        this.position.y += dy;
      }
    } else if (this.state == 4) {
      this.bushTimer += timeDelta;
      // Reduce run timer as animal is not running
      this.runTimer = Math.max(this.runTimer - timeDelta / 10, 0);

      // Unhide after 8 seconds
      if (this.bushTimer >= 8) {
        this.wander();
        this.bushTimer = 0;
      }
    }
  }
}

class Prey extends Animal {
  // Time the animal was grazing
  eatTime = 0;

  // Time wandering
  wanderTimer = 0;
  // Time before eating from 5 to 7 seconds
  wanderInterval = 5 + Math.random() * 2;

  // Resets state to wander
  wander() {
    this.state = 0;
    this.wanderTimer = 0;
    this.wanderInterval = 5 + Math.random() * 2;
  }

  update(timeDelta) {
    super.update(timeDelta);

    if (this.state == 0) {
      this.wanderTimer += timeDelta;

      // Eat if prey has been wandering for 5 seconds
      if (this.wanderTimer >= this.wanderInterval) {
        this.state = 1;
      }
    } else if (this.state == 1) {
      // Reduce run timer as animal is not running
      this.runTimer = Math.max(this.runTimer - timeDelta / 10, 0);

      this.eatTime += timeDelta;
    }
  };
}

class Predator extends Animal {
  // List of animals hunted by the predator
  preyList = [];

  // Animal which is currently hunted by the predator
  preyTarget;

  update(timeDelta) {
    super.update(timeDelta);
    this.tryHunt();

    if (this.state == 1) {
      // Test if prey is met
      if (getDistance(this.preyTarget.position, this.position) < 0.3) {
        // Delete the animal
        this.preyList.splice(this.preyList.indexOf(this.preyTarget), 1);
        this.preyTarget.delete();

        this.wander();
        this.animalsConsumed += 1;
      } else {
        // Update run time
        this.runTimer = Math.min(this.runTimer + timeDelta, this.enduranceMult*this.endurance);
    
        let runIndicator = this.runTimer < this.enduranceMult*this.endurance ? 1 : 0;

        // Calculate movement
        let dx = Math.cos(Math.atan2(this.preyTarget.position.y - this.position.y, this.preyTarget.position.x - this.position.x)) * (this.wanderSpeed + this.speedMult*this.speed * runIndicator) * timeDelta;
        let dy = Math.sin(Math.atan2(this.preyTarget.position.y - this.position.y, this.preyTarget.position.x - this.position.x)) * (this.wanderSpeed + this.speedMult*this.speed * runIndicator) * timeDelta;

        // Update position
        this.position.x += dx;
        this.position.y += dy;
      }
    }
  };

  tryHunt = function() {
    // Have animal have full endurance for the hunt
    if (this.state == 0 && this.animalsConsumed < this.maxConsumption && this.runTimer <= 0) {
      let closestPrey = null;

      for (let i = 0; i < this.preyList.length; i++ ) {
        let prey = this.preyList[i];
        if (prey.state < 2 && getDistance(prey.position, this.position) < 3 / (0.5 + this.camoflageMult*prey.camoflage)) {
          if (closestPrey == null || getDistance(prey.position, this.position) < getDistance(closestPrey.position, this.position)) {
            closestPrey = prey;
          }
        }
      }

      if (closestPrey != null) {
        closestPrey.flee();
        this.state = 1;
        this.preyTarget = closestPrey;
        closestPrey.huntedBy = this;

        // If prey is actively hunting, set its hunting target's state to wander
        if (closestPrey instanceof Predator && closestPrey.state == 1) {
          closestPrey.preyTarget.wander();
        }
      }
    }   
  }

  // Maximum number of animals to be consumed
  maxConsumption = 3;

  // Animals consumed
  animalsConsumed = 0;
}

class Rabbit extends Prey {
  size = 0;
  mesh = new T.Mesh(new T.SphereGeometry(0.1), new T.MeshStandardMaterial({color:"#ddc5c5", roughness: 1, metalness: 0}));
  wanderSpeed = 0.5;
}
function createRandomRabbit() {
  let speed = Math.random();
  let endurance = Math.random();
  let camoflage = Math.random();
  let sum = speed + endurance + camoflage;

  // If sum is 0, normalize to 1/3
  if (sum == 0) {
    return new Rabbit(1/3,1/3,1/3);
  } else {
    return new Rabbit(speed / sum, endurance / sum, camoflage / sum);
  }
}
function createReproductionRabbit(parent) {
  // Base traits on parent with slight deviation
  //console.log(`Parent: S-${parent.speed} E-${parent.endurance} C-${parent.camoflage}`);
  let speed = Math.max(0, parent.speed + (1/30 - Math.random()/15));
  let endurance = Math.max(0, parent.endurance + (1/30 - Math.random()/15));
  let camoflage = Math.max(0, parent.camoflage + (1/30 - Math.random()/15));
  let sum = speed + endurance + camoflage;
  //console.log(`New: S-${speed / sum} E-${endurance / sum} C-${camoflage / sum}`);

  // If sum is 0, normalize to 1/3
  if (sum == 0) {
    return new Rabbit(1/3,1/3,1/3);
  } else {
    return new Rabbit(speed / sum, endurance / sum, camoflage / sum);
  }
}
let rabbitList = [createRandomRabbit()];
rabbitList.forEach(rabbit => {
  rabbit.initialize();
  rabbit.move();
});

class Wolf extends Predator {
  size = 1;
  mesh = new T.Mesh(new T.SphereGeometry(0.2), new T.MeshStandardMaterial({color:"#747474", roughness: 1, metalness: 0}));
  preyList = rabbitList;
  wanderSpeed = 0.7;
}
function createRandomWolf() {
  let speed = Math.random();
  let endurance = Math.random();
  let camoflage = Math.random();
  let sum = speed + endurance + camoflage;

  // If sum is 0, normalize to 1/3
  if (sum == 0) {
    return new Wolf(1/3,1/3,1/3);
  } else {
    return new Wolf(speed / sum, endurance / sum, camoflage / sum);
  }
}
function createReproductionWolf(parent) {
  // Base traits on parent with slight deviation
  let speed = Math.max(0, parent.speed + (1/30 - Math.random()/15));
  let endurance = Math.max(0, parent.endurance + (1/30 - Math.random()/15));
  let camoflage = Math.max(0, parent.camoflage + (1/30 - Math.random()/15));
  let sum = speed + endurance + camoflage;

  // If sum is 0, normalize to 1/3
  if (sum == 0) {
    return new Wolf(1/3,1/3,1/3);
  } else {
    return new Wolf(speed / sum, endurance / sum, camoflage / sum);
  }
}
let wolfList = [createRandomWolf()]
wolfList.forEach(wolf => {
  wolf.initialize();
  wolf.move();
});

class Lion extends Predator {
  size = 2;
  mesh = new T.Mesh(new T.SphereGeometry(0.5), new T.MeshStandardMaterial({color:"#e2bb0e", roughness: 1, metalness: 0}));
  preyList = wolfList;
  wanderSpeed = 1;
  maxConsumption = 1;
}
function createRandomLion() {
  let speed = Math.random();
  let endurance = Math.random();
  let camoflage = Math.random();
  let sum = speed + endurance + camoflage;

  // If sum is 0, normalize to 1/3
  if (sum == 0) {
    return new Lion(1/3,1/3,1/3);
  } else {
    return new Lion(speed / sum, endurance / sum, camoflage / sum);
  }
}
function createReproductionLion(parent) {
  // Base traits on parent with slight deviation
  let speed = Math.max(0, parent.speed + (1/30 - Math.random()/15));
  let endurance = Math.max(0, parent.endurance + (1/30 - Math.random()/15));
  let camoflage = Math.max(0, parent.camoflage + (1/30 - Math.random()/15));
  let sum = speed + endurance + camoflage;

  // If sum is 0, normalize to 1/3
  if (sum == 0) {
    return new Lion(1/3,1/3,1/3);
  } else {
    return new Lion(speed / sum, endurance / sum, camoflage / sum);
  }
}
let lionList = [createRandomLion()]
lionList.forEach(lion => {
  lion.initialize();
  lion.move();
});

let wid = 670;
let ht = 500;

let camera = new T.PerspectiveCamera(60, wid / ht, 1, 100);
camera.position.set(1, 5, 6);
renderer.render(scene, camera);

// Code modified from 06-09-01
let controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

// finally, draw the scene. Also, add animation.
renderer.render(scene, camera);

function updateHTML() {

  // Average all rabbit traits
  {
    let averageSpeed = 0;
    let averageEndurance = 0;
    let averageCamoflage = 0;
    rabbitList.forEach(rabbit => {
      averageSpeed += rabbit.speed;
      averageEndurance += rabbit.endurance;
      averageCamoflage += rabbit.camoflage;
    });
    averageSpeed /= rabbitList.length;
    averageEndurance /= rabbitList.length;
    averageCamoflage /= rabbitList.length;

    // Update traits in html
    document.getElementById("rabbit-speed").textContent = `Speed: ${averageSpeed.toFixed(3)}`;
    document.getElementById("rabbit-endurance").textContent = `Endurance: ${averageEndurance.toFixed(3)}`;
    document.getElementById("rabbit-camoflage").textContent = `Camouflage: ${averageCamoflage.toFixed(3)}`;
  }
  document.getElementById("rabbit-total").textContent = `Rabbits: ${rabbitList.length}`;

  // Average all wolf traits
  {
    let averageSpeed = 0;
    let averageEndurance = 0;
    let averageCamoflage = 0;
    wolfList.forEach(wolf => {
      averageSpeed += wolf.speed;
      averageEndurance += wolf.endurance;
      averageCamoflage += wolf.camoflage;
    });
    averageSpeed /= wolfList.length;
    averageEndurance /= wolfList.length;
    averageCamoflage /= wolfList.length;

    // Update traits in html
    document.getElementById("wolf-speed").textContent = `Speed: ${averageSpeed.toFixed(3)}`;
    document.getElementById("wolf-endurance").textContent = `Endurance: ${averageEndurance.toFixed(3)}`;
    document.getElementById("wolf-camoflage").textContent = `Camouflage: ${averageCamoflage.toFixed(3)}`;
  }
  document.getElementById("wolf-total").textContent = `Wolves: ${wolfList.length}`;

  // Average all lion traits
  {
    let averageSpeed = 0;
    let averageEndurance = 0;
    let averageCamoflage = 0;
    lionList.forEach(lion => {
      averageSpeed += lion.speed;
      averageEndurance += lion.endurance;
      averageCamoflage += lion.camoflage;
    });
    averageSpeed /= lionList.length;
    averageEndurance /= lionList.length;
    averageCamoflage /= lionList.length;

    // Update traits in html
    document.getElementById("lion-speed").textContent = `Speed: ${averageSpeed.toFixed(3)}`;
    document.getElementById("lion-endurance").textContent = `Endurance: ${averageEndurance.toFixed(3)}`;
    document.getElementById("lion-camoflage").textContent = `Camouflage: ${averageCamoflage.toFixed(3)}`;
  }
  document.getElementById("lion-total").textContent = `Lions: ${lionList.length}`;
}

// Refreshes the day and reproduces animals
function refreshDay() {
  // Delete all prey who didn't get a full meal
  for (let i = rabbitList.length - 1; i >= 0; i--) {
    let rabbit = rabbitList[i];
    if (rabbit.eatTime <= 1) {
      rabbit.delete();
      rabbitList.splice(i, 1);
    }
  }

  // Delete all predators who didn't get a meal
  // AI Helped with debugging this part
  for (let i = wolfList.length - 1; i >= 0; i--) {
    let wolf = wolfList[i];
    if (wolf.animalsConsumed == 0) {
      wolf.delete();
      wolfList.splice(i, 1);
    }
  }

  for (let i = lionList.length - 1; i >= 0; i--) {
    let lion = lionList[i];
    if (lion.animalsConsumed == 0) {
      lion.delete();
      lionList.splice(i, 1);
    }
  }

  // For each predator, add one animal for every prey consumed with traits similar to the predator
  let tempWolfList = [];
  wolfList.forEach(wolf => {
    for (let i = 0; i < wolf.animalsConsumed; i++) {
      let newWolf = createReproductionWolf(wolf);
      newWolf.initialize();
      tempWolfList.push(newWolf);
    }
  });
  tempWolfList.forEach(wolf => {
    wolfList.push(wolf);
  })

  let tempLionList = [];
  lionList.forEach(lion => {
    for (let i = 0; i < lion.animalsConsumed; i++) {
      let newLion = createReproductionLion(lion);
      newLion.initialize();
      tempLionList.push(newLion);
    }
  });
  tempLionList.forEach(lion => {
    lionList.push(lion);
  })

  // For each prey, add one animal for every second spent grazing
  let tempRabbitList = [];
  rabbitList.forEach(rabbit => {
    for (let i = 0; i < Math.min(4, rabbit.eatTime - 1); i++) {
      let newRabbit = createReproductionRabbit(rabbit);
      newRabbit.initialize();
      tempRabbitList.push(newRabbit);
    }
  });
  tempRabbitList.forEach(rabbit => {
    rabbitList.push(rabbit);
    rabbit.initialize();

    // Add a cap of 50 rabbits
    if (rabbitList.length > 50) {
      rabbitList[0].delete(0);
      rabbitList.shift();
    }

    // Add a cap of 20 wolves
    if (wolfList.length > 20) {
      wolfList[0].delete(0);
      wolfList.shift();
    }

    // Add a cap of 10 lions
    if (lionList.length > 10) {
      lionList[0].delete(0);
      lionList.shift();
    }
  })
  
  // Add one random animal to each list if the cap is not reached
  if (rabbitList.length < 50) {
    let randomRabbit = createRandomRabbit();
    rabbitList.push(randomRabbit);
    randomRabbit.initialize();
  }
  if (wolfList.length < 20) {
    let randomWolf = createRandomWolf();
    wolfList.push(randomWolf);
    randomWolf.initialize();
  }
  if (lionList.length < 10) {
    let randomLion = createRandomLion();
    lionList.push(randomLion);
    randomLion.initialize();
  }

  // Randomize position of all animals and reset their eating values
  rabbitList.forEach(rabbit => {
    rabbit.position = getRandomPosition();
    rabbit.wander();
    rabbit.eatTime = 0;
  });
  wolfList.forEach(wolf => {
    wolf.position = getRandomPosition();
    wolf.wander();
    wolf.animalsConsumed = 0;
  });
  lionList.forEach(lion => {
    lion.position = getRandomPosition();
    lion.wander();
    lion.animalsConsumed = 0;
  });

  // Update html
  updateHTML();
}

updateHTML();

let lastTimestamp; // undefined to start

// 20 second days
let dayCycle = 20;
let dayTimer = 0;

function animate(timestamp) {
  // Convert time change from milliseconds to seconds
  let timeDelta = 0.001 * (lastTimestamp ? timestamp - lastTimestamp : 0);
  lastTimestamp = timestamp;

  dayTimer += timeDelta

  if (dayTimer >= dayCycle) {
    refreshDay();
    dayTimer = 0;
  }

  // Update all animals
  rabbitList.forEach(rabbit => rabbit.update(timeDelta));
  wolfList.forEach(wolf => wolf.update(timeDelta));
  lionList.forEach(lion => lion.update(timeDelta));

  // draw and loop
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

window.requestAnimationFrame(animate);

