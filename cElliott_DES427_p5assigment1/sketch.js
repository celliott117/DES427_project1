var song;
var img;
var fft; //audio frequency analyzer that is used throughout the visualizer
var particles = [];
var uiContainer;
var sizeSlider, accelerationSlider, colorPicker, playButton, randomButton;
var particleSize;
var particleSpeed = 0.05; // Default speed of particles
var accelerationFactor = 0.00005; // Default acceleration factor for particles
var playPauseClicked = false; // Track if play/pause button was clicked
var randomColorInterval;
var isRandomized = false; // Track the state of the random color button
var visualizerRadius = 150; // Radius for mouselclickplayback and the visualizer circle on the canvas

// Preloading sound and image files
function preload() {
  song = loadSound("pinkponyclub.m4a"); // Load the song
  img = loadImage("bg-pinkunicornVignette.jpg"); // Load the background image
}

// Setup function, executed once when the program starts
function setup() {
  createCanvas(windowWidth, windowHeight); // Create a canvas with window height and width
  angleMode(DEGREES); // Set angle mode to degrees
  imageMode(CENTER); // Set image mode to center
  rectMode(CENTER); // Set rectangle mode to center

  fft = new p5.FFT(); // Create a new FFT (Fast Fourier Transform) object

  img.filter(BLUR, 5); // Apply a blur effect to the background image

  // Create the UI container div
  //adjustments for x y pos
  uiContainer = createDiv();
  uiContainer.position(width / 2 - 150 + 55, height / 2 - 150); // Position in the center with pixel shift down 55px
  uiContainer.style("display", "flex");
  uiContainer.style("flex-direction", "column");
  uiContainer.style("align-items", "center");
  uiContainer.style("padding", "20px");
  uiContainer.style("border-radius", "10px");

  // Play button
  playButton = createButton("Play");
  playButton.mousePressed(function () {
    togglePlay(); // Toggle play/pause when clicked
    playPauseClicked = true; // Set flag to true on play/pause click
  });
  playButton.parent(uiContainer);

  // Style the Play/Pause button
  playButton.style("font-size", "24px");
  playButton.style("padding", "15px 30px");
  playButton.style("margin-bottom", "10px");
  playButton.style("background-color", "rgb(255, 150, 255)");
  playButton.style("border", "none");
  playButton.style("color", "white");
  playButton.style("border-radius", "10px");
  playButton.style("width", "150px");

  // Particle size slider
  sizeSlider = createSlider(1, 10, 5.5, 0.1); // Slider to control particle size (min,max,default,increment values)
  createLabel("Particle Size").parent(uiContainer); // Add label for particle size
  sizeSlider.parent(uiContainer); //put this in the parent container

  // Acceleration slider
  accelerationSlider = createSlider(0.00000001, 0.00008, 0.00001, 0.00000001); // Slider to control particle acceleration (min,max,default,increment values)
  createLabel("Particle Acceleration").parent(uiContainer);
  accelerationSlider.parent(uiContainer); //put this in the parent container

  // Color picker for particles
  colorPicker = createColorPicker("#ff00ff"); // Default particle color (pink)
  createLabel("Color").parent(uiContainer); //put this in the parent container
  colorPicker.size(150, 80); //dimensions
  colorPicker.style("border-radius", "10px"); //add border radius
  colorPicker.parent(uiContainer); //put this in the parent container

   
}

// Function for text elements in UI
function createLabel(text) {
  var label = createDiv(text); // Create a div element to hold the label text
  label.style("color", "white"); // Set the text color to white
  label.style("font-size", "16px"); // Set the font size
  label.style("font-family", "sans-serif"); // Set the font family
  label.style("margin-top", "10px"); // Add some space above the label
  return label; // Return the label div
}
// etch-a-sketch begins
function draw() {
  background(0); // Clear background with black

  fft.analyze(); // Always analyze the FFT for the waveform

  line(width / 2, 0, width / 2, height);
  // Get energy in bass (20–440 Hz) and treble (440–20000 Hz)
  var bass = fft.getEnergy(20, 440); // analyzes Bass frequencies, sets var based on amplitude
  var treble = fft.getEnergy(440, 20000); // Treble frequencies (see var bass)

  // Map the bass energy to the amplitude (amp) value for effects
  var amp = map(bass, 0, 255, 0, 255); //takes bass amplitude range and maps it for a new variable

  // Background image positioning and drawing
  translate(width / 2, height / 2); // Translate to center of canvas
  push();
  if (amp > 225) {
    rotate(random(-0.5, 0.5)); // Apply random rotation if amp is above a threshold
  }
  let imgRatio = img.width / img.height;
  let newWidth = height * imgRatio;
  image(img, 0, 0, newWidth, height); // Draw the square background image, don't stretch
  pop();

  // bump the UI container if amplitude exceeds a threshold
  if (amp > 229) {
    push();
    rotate(random(-10, 10)); // Random rotation of UI
    uiContainer.style(
      "transform",
      `translate(${random(-5, 5)}px, ${random(-5, 5)}px)` //query a random number between two values and insert in string value
    );
    pop();
  } else {
    // Reset UI position when amplitude is below threshold
    uiContainer.style("transform", "translate(0px, 0px)");
  }

  // Apply a rectangle overlay with dynamic transparency
  let alpha = map(amp, 180, 255, 150, 50); // Alpha transparency based on amplitude (bass amp,inputMin,inputMax,alphawhenquiet,alphawhenbumping)
  fill(0, 0, 0, alpha); // Black color with transparency
  noStroke();
  rect(0, 0, width + 100, height + 100); // Overlay rectangle larger than canvas

  // console.log("Alpha value: " + alpha); // Log alpha value
  // console.log("Screen height ",height,);
  // console.log("Screen width ",width,);

  // Use the color picker for waveform line color
  let waveColor = colorPicker.color(); // Get selected color
  stroke(waveColor); // Apply color to waveform line
  strokeWeight(3);
  noFill();

  // Smooth the waveform for better visuals
  var wave = fft.waveform(); // Get the waveform
  var smoothedWave = smoothWave(wave, 5); // Smooth the waveform (see function below)

  // Draw the smoothed waveform shape
  for (var t = -1; t <= 1; t += 2) {
    //for loop creates a symmetric waveform on both sides of y axis
    //runs once at -1, once at +1, then stops
    beginShape(); //starts new shape
    for (var i = 0; i <= 180; i += 0.5) {
      //for loop again from 0to180, in 0.5 increments
      var index = floor(map(i, 0, 180, 0, smoothedWave.length - 1)); //indexes current angle of i and then rounds down to a whole number
      var r = map(smoothedWave[index], -1, 1, 50, 400); //smoothing function applied to input range of -1 to 1 and output to much larger range)
      //r=height of wave section, t=size of wave, i=frequency between waves
      var x = r * sin(i) * t; //maps polar coordinates in x axis
      var y = r * cos(i); //same as var x but using cosine
      vertex(x, y); //this defines a point along the waveform path
    }
    endShape(); //all vertices are collected and a closed 'shape' (wave) is drawn
  }

  // Create new particles based on bass and treble energy (if song is playing)

  if (song.isPlaying()) {
    //check if song is playing
    var particleAcceleration = map(amp, 0, 255, 0.01, 0.5); // Map amplitude of bass frequencies onto smaller range 0.01 to 0.5 minmax
    var p1 = new Particle(amp, bass, treble); // uses Particle class and draws a new particle, says 'you shall be known as p1'
    var p2 = new Particle(amp, bass, treble); // ANOTHER ONE
    //these particles are based on the audio during the frame when they are created
    particles.push(p1); //SEND IT to the particles array
    particles.push(p2); //ANOTHER ONE!
  }
  if (amp > 220) {
    console.log("Amp:", amp);
    // prints to console only if Amp value exceeds threshold (helpful to fine tune response threshold)
  }

  // Update and show particles
  //FOR loop that goes backwards through the particles array, processing each one and updating
  for (var i = particles.length - 1; i >= 0; i--) {
    //figures out how many particles are in the array, keeps going until hit's the 0th element, and checks each one by counting backwards
    if (!particles[i].edges()) {
      //checks if THIS particle is still on the screen
      particles[i].update(song.isPlaying(), amp); // uses particle class to update position, acceleration etc.
      particles[i].show(); // Display the particle
    } else {
      particles.splice(i, 1); // Remove particles that go off screen, removes it from the array, and frees up memory so my computer doesn't combust immediately
    }
  }
  // console.log("Timestamp",song.currentTime());
  if (song.currentTime() <= 0.00001) {
    //64.17seconds reveal the following during the chorus ()
    push();
    let textAlpha = map(amp, 200, 240, 50, 255);
    
    fill(
      waveColor.levels[0],
      waveColor.levels[1],
      waveColor.levels[2],
      textAlpha
    );

    // line(285, -900, 285, 900); //guide to align letters
    
    textAlign(LEFT, CENTER);
    textSize(45);
    text("welcome to the", 277, -190);
    textSize(128);
    text("PINK", 275, -110);
    text("PONY", 275, 0);
    text("{CLUB}", 237, 110); 
     // Fades in and out with amplitude
    pop();
  }
  // Check if the song has been playing long enough to display
  if (song.currentTime() >= 64.17) {
    //64.17seconds reveal the following during the chorus ()
    push();
    let textAlpha = map(amp, 200, 240, 50, 255);
    // noStroke();
    fill(
      waveColor.levels[0],
      waveColor.levels[1],
      waveColor.levels[2],
      textAlpha
    );

    // line(285, -900, 285, 900); //guide to align letters
    
    textAlign(LEFT, CENTER);
    textSize(45);
    text("welcome to the", 277, -190);
    textSize(128);
    text("PINK", 275, -110);
    text("PONY", 275, 0);
    text("{CLUB}", 237, 110);
     // Fades in and out with amplitude
    pop();
  }
}

// Toggle the play/pause state of the song
function togglePlay() {
  if (song.isPlaying()) {
    song.pause(); // Pause if currently playing
    noLoop(); // Stop drawing when song is paused
  } else {
    song.play(); // Play the song if not playing
    loop(); // Start drawing again when song is playing
  }
}

// Mouse click handler to toggle play/pause when clicking outside visualizer radius
function mouseClicked() {
  var distance = dist(mouseX, mouseY, width / 2, height / 2); // Calculate distance from center

  // Only toggle play/pause if the click is outside the visualizer radius
  if (distance > visualizerRadius) {
    togglePlay();
  }
}

// Reads audio wave spectrum and smoothes the waveform by averaging neighboring points based on the wave array
//smoothingRange set in draw function
function smoothWave(wave, smoothingRange) {
  var smoothedWave = []; //new array is the smoothed out wave values
  for (var i = 0; i < wave.length; i++) {
    //for loop repeats this codeblock
    //i set to 0 (first position in array)
    //keeps running as long as i is less than total number of array elements (wave.length)
    //every time the loop runs, add 1 to i
    var sum = 0; // total sum of values set to 0 first
    var count = 0; // counts number of total value, set to 0 also
    // Average neighboring values within the smoothing range
    for (var j = -smoothingRange; j <= smoothingRange; j++) {
      //another for loop
      //j is offset from i value being evaluated, then checks 'how different are these two elements?'
      var index = (i + j + wave.length) % wave.length;
      //corrects indexing errors (if i=0,j=-1,that would give a negative)
      //instead % will find the remainder of (i+j+wave.length)all divided again by wave.length and spits out a number that is within the bounds of the array
      sum += wave[index]; //adds the index array value to the sum
      count++; //increase value count by 1
    }
    smoothedWave.push(sum / count); // averages these array values
  }
  return smoothedWave; // once every array value is checked and averaged, return the smoothed waveform
}

// Particle class for making the shapes behind the visualizer
class Particle {
  //constructor uses analysis of music (total volume/amplitude, then specifically bass and treble amp)
  constructor(amp, bass, treble) {
    this.pos = p5.Vector.random2D().mult(200); // set random radial position from 0,0 center, displaced 240 pixels from origin/center of visualizer
    this.vel = createVector(0, 0); // particle doesn't move when first generated

    // acceleration of particles is based on the bass frequency volume (0-255) then mapped onto a much smaller scale between 0.0000001 and the current slider values (set above) --> almost no movement to hyperspace
    let accelerationFactor = map(
      bass,
      0,
      255,
      0.0000001,
      accelerationSlider.value()
    );
    this.acc = this.pos.copy().mult(accelerationFactor); //makes a copy of this.po, and sets the velocity change by applying accelerationFactor

    // Set particle size based on slider
    this.w = sizeSlider.value();

    // Random shape type (ellipse, rect, triangle) based on an integer from 0,1,or2
    this.shapeType = floor(random(3));

    // Random rotation for particle based on 360deg
    this.rotation = random(TWO_PI);

    // Set particle color from color picker
    this.color = colorPicker.color();
  }

  //listens every frame to update particle behaviour
  update(isPlaying, amp) {
    if (isPlaying) {
      this.vel.add(this.acc); // Update velocity plus add this.acc (acceleration factor above)
      this.vel.add(p5.Vector.random2D().mult(particleSpeed)); // Randomize movement for added chaos based on a random direction times the particle speed
      this.pos.add(this.vel); // Update position to move particles across the screen

      // check if the amplitude is above threshold (can be adjusted depending on the song) then add exaggerated shake effect to particles for amplitude spikes
      if (amp > 225) {
        this.pos.add(p5.Vector.random2D().mult(random(3, 8)));
      }
    }
  }

  edges() {
    //asks is this particle's x,y off the screen, returns boolean true/false
    // checks all four conditions, if any are true, returns "TRUE", otherwise we're still on the screen, says 'FALSE'
    return (
      this.pos.x < -width / 2 ||
      this.pos.x > width / 2 ||
      this.pos.y < -height / 2 ||
      this.pos.y > height / 2
    ); // Check if particle is off screen
  }

  show() {
    //runs if particle still on screen
    noStroke(); // No outline for the shapes
    //sets how far from center of canvas particles go before they disappear
    let maxDistance = (width / 2) * 0.5;
    let distance = dist(0, 0, this.pos.x, this.pos.y);

    // Set the alpha transparency based on distance (for fade out)
    //lerp = linear interpolation --> set between 255 and 0, based on the distance from the center, then setting the ratio from 1 (full alpha) to 0 (fully faded)
    let alpha = lerp(240, 0, map(distance, 0, maxDistance, 1, 0.1));

    // Adjust brightness and saturation based on distance
    //same as alpha but takes the current color HSB brightness (second value)
    // dimmer at edges
    let brightness = lerp(
      this.color.levels[2],
      255,
      map(distance, 0, maxDistance, 0.6, 1)
    ); // Brighter at center
    let saturation = lerp(
      this.color.levels[1],
      255,
      map(distance, 0, maxDistance, 0, 0.2)
    ); // More saturated at center, 50% saturation at edges

    // Randomize rotation for chaotic appearance
    push(); //takes a snapshot of drawing state
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation * 0.5); // Find the particle position and set this as 0,0 for a sec then rotates particle by random360deg value, then lessened by .5

    // Draw different shapes based on random selection
    // Uses color picker Hue, plus the saturation, brightness and alpha values and applies those to whatever shape type is chosen circle=0,square=1,triangle=2 (coordinates are based on the new 0,0 set at 'push')
    fill(this.color.levels[0], saturation, brightness, alpha);
    if (this.shapeType === 0) {
      ellipse(0, 0, this.w, this.w); // Ellipse
    } else if (this.shapeType === 1) {
      rectMode(CENTER);
      rect(0, 0, this.w, this.w); // Rectangle
    } else if (this.shapeType === 2) {
      triangle(0, -this.w / 2, this.w / 2, this.w / 2, -this.w / 2, this.w / 2); // Triangle
    }
    pop(); //snap back to reality (reset for next particle)
  }
}
