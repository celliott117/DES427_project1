var song;
var img;
var fft; //audio frequency analyzer that is used throughout the visualizer
var particles = [];
var uiContainer, fxToggle;
var sizeSlider, accelerationSlider, colorPicker, volumeSlider, playButton, rainbowToggle;
var startHint;
var particleSpeed = 0.05; // Default speed of particles
var visualizerRadius = 150; // Radius for mouselclickplayback and the visualizer circle on the canvas (in local, unscaled units)
var rainbowHue = 0; // Shared hue for rainbow mode; advances once per frame so all particles shift together
var RAINBOW_SPEED = 0.75; // Degrees the shared hue advances per frame while rainbow mode is on

// The visualizer's origin (in absolute canvas pixels) and scale, recomputed on resize.
// Desktop: pillarboxed so a square window shows the right half of the visualizer, widening
// windows reveal more of the left side. Narrow/mobile: scaled down to fit the window width,
// and shifted down to leave room above for the stacked title text.
var originX = 0;
var originY = 0;
var vizScale = 1;

// Local (unscaled) y-range of the stacked mobile title block, used to keep it above the
// circle and to position the start hint above it. See drawTitleCard()'s mobile branch.
var MOBILE_TITLE_TOP = -650;
var MOBILE_TITLE_BOTTOM = -260;

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

  // Create the UI container div: a horizontal row of controls that lives under the title
  uiContainer = createDiv();
  uiContainer.addClass("ui-panel");

  // Play button
  playButton = createButton("Play");
  playButton.addClass("play-button");
  playButton.mousePressed(function () {
    togglePlay(); // Toggle play/pause when clicked
  });
  playButton.parent(uiContainer);

  // Particle size slider
  sizeSlider = createSlider(1, 10, 5.5, 0.1); // Slider to control particle size (min,max,default,increment values)
  createControlGroup("Sparkle Size", sizeSlider).parent(uiContainer);

  // Acceleration slider
  accelerationSlider = createSlider(0.00000001, 0.00008, 0.00001, 0.00000001); // Slider to control particle acceleration (min,max,default,increment values)
  createControlGroup("Energy", accelerationSlider).parent(uiContainer);

  // Volume slider
  volumeSlider = createSlider(0, 1, 0.8, 0.01); // Slider to control song volume
  createControlGroup("Volume", volumeSlider).parent(uiContainer);

  // Color picker for particles: a small square swatch rather than a big rectangle
  colorPicker = createColorPicker("#ff00ff"); // Default particle color (pink)
  colorPicker.size(48, 48);
  createControlGroup("Color", colorPicker).parent(uiContainer);

  // Rainbow mode toggle: cycles each new particle's color through the hue wheel instead of using the color picker
  rainbowToggle = createCheckbox("Rainbow", false);
  rainbowToggle.addClass("ui-checkbox");
  rainbowToggle.parent(uiContainer);

  // Hamburger-style toggle shown only on narrow/mobile screens (see the media query in style.css)
  fxToggle = createButton("☰ FX Controls");
  fxToggle.addClass("fx-toggle");
  fxToggle.mousePressed(function () {
    uiContainer.toggleClass("open");
  });

  // Hint shown before the song has ever been started
  startHint = createDiv("click outside the circle to play");
  startHint.addClass("start-hint");

  updateLayout(); // Compute the initial origin/scale before positioning anything
  positionStartHint(); // The UI panel itself is centered/anchored entirely via CSS
}

// Wraps a labeled control (slider or color picker) in its own small vertical group,
// so the panel can lay controls out left-to-right as a row
function createControlGroup(labelText, element) {
  var group = createDiv();
  group.addClass("control-group");
  createLabel(labelText).parent(group);
  element.parent(group);
  return group;
}

// Recomputes the visualizer's origin and scale for the current window size.
// Desktop (width >= height): pillarboxed so a square window puts the visualizer's
// horizontal center at the left edge, and wider windows reveal more of its left side.
// Mobile/narrow (width < height): scaled down so the whole visualizer fits the width,
// and shifted down to leave room above for the stacked title text.
function updateLayout() {
  if (width >= height) {
    vizScale = 1;
    originX = max(0, (width - height) / 2);
    originY = height / 2;
  } else {
    vizScale = width / height;
    originX = width / 2;
    originY = height * 0.68;
  }
}

// Positions the start hint above the visualizer circle (desktop) or above the stacked
// title block (mobile). The UI panel itself is centered/anchored entirely via CSS.
function positionStartHint() {
  if (!startHint) return;
  let hintY =
    width >= height
      ? originY - visualizerRadius * vizScale - 50
      : originY + (MOBILE_TITLE_TOP - 40) * vizScale;
  startHint.position(originX - startHint.size().width / 2, hintY);
}

// Keep the canvas filling the window, and recompute layout/hint position on resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
  positionStartHint();
}

// Function for text elements in UI
function createLabel(text) {
  var label = createDiv(text); // Create a div element to hold the label text
  label.addClass("ui-label");
  return label; // Return the label div
}

// Change the cursor to a hand outside the visualizer's click-to-play radius
function mouseMoved() {
  var distance = dist(mouseX, mouseY, originX, originY);
  cursor(distance > visualizerRadius * vizScale ? HAND : ARROW);
}
// etch-a-sketch begins
function draw() {
  background(0); // Clear background with black

  updateLayout(); // Keep origin/scale current even if draw() was paused during a resize

  song.setVolume(volumeSlider.value()); // Apply the volume slider each frame

  fft.analyze(); // Always analyze the FFT for the waveform

  line(originX, 0, originX, height); // Vertical guideline at the visualizer's center, drawn before translating below

  // Bass (20-440Hz) energy doubles as our overall "reactivity" amplitude for effects
  var bass = fft.getEnergy(20, 440);
  var amp = bass;

  shakeUIContainer(amp); // DOM element, independent of the canvas transform below

  // The background image always fills/centers on the actual window, independent of the
  // visualizer's responsive origin and scale
  push();
  translate(width / 2, height / 2);
  drawBackgroundImage(amp);
  pop();

  drawDarkOverlay(amp); // Drawn in absolute canvas space so it fully covers the viewport at any scale

  if (rainbowToggle.checked()) {
    rainbowHue = (rainbowHue + RAINBOW_SPEED) % 360; // Shared hue advances once per frame, not per particle
  }

  let waveColor = colorPicker.color(); // Get selected color, used for both the waveform and the title card

  push();
  translate(originX, originY);
  scale(vizScale);
  drawWaveform(waveColor);
  drawClickHintRing();

  if (song.isPlaying()) {
    spawnParticles(bass);
  }
  updateAndShowParticles(amp);

  // Title card shows at song start, then again during the chorus (64.17s)
  if (song.currentTime() <= 0.00001 || song.currentTime() >= 64.17) {
    drawTitleCard(waveColor, amp);
  }
  pop();
}

// A subtle pulsing ring just outside the click-to-play radius, hinting where to click.
// Only shown before the song has ever been played (same lifetime as the start hint text).
function drawClickHintRing() {
  if (!startHint) return;
  push();
  noFill();
  let pulse = (sin(frameCount * 0.05) + 1) / 2; // Breathes between 0 and 1
  stroke(255, 255, 255, lerp(30, 110, pulse));
  strokeWeight(2);
  ellipse(0, 0, visualizerRadius * 2 + 40, visualizerRadius * 2 + 40);
  pop();
}

// Draws the blurred background image, with a small random tilt on loud bass hits
function drawBackgroundImage(amp) {
  push();
  if (amp > 225) {
    rotate(random(-0.5, 0.5)); // Apply random rotation if amp is above a threshold
  }
  let imgRatio = img.width / img.height;
  let newWidth = height * imgRatio;
  image(img, 0, 0, newWidth, height); // Draw the background image, don't stretch
  pop();
}

// Bumps the UI container around on loud bass hits, otherwise keeps it steady.
// The panel is horizontally centered via CSS (left: 50%), so every transform here
// keeps the "translateX(-50%)" centering term and just adds the shake offset to it.
function shakeUIContainer(amp) {
  if (amp > 229) {
    uiContainer.style(
      "transform",
      `translate(calc(-50% + ${random(-5, 5)}px), ${random(-5, 5)}px)`
    );
  } else {
    uiContainer.style("transform", "translateX(-50%)");
  }
}

// Applies a rectangle overlay with dynamic transparency (darker when quiet, brighter when loud).
// Drawn with the transform reset so it covers the full canvas regardless of the visualizer's scale.
function drawDarkOverlay(amp) {
  let alpha = map(amp, 180, 255, 150, 50, true); // Alpha transparency based on amplitude (bass amp,inputMin,inputMax,alphawhenquiet,alphawhenbumping), clamped so silence doesn't blow past full opacity
  push();
  resetMatrix();
  fill(0, 0, 0, alpha); // Black color with transparency
  noStroke();
  rect(width / 2, height / 2, width, height); // Covers the full canvas (rectMode(CENTER) is set in setup())
  pop();
}

// Draws the smoothed, symmetric polar waveform shape
function drawWaveform(waveColor) {
  stroke(waveColor); // Apply color to waveform line
  strokeWeight(3);
  noFill();

  var wave = fft.waveform(); // Get the waveform
  var smoothedWave = smoothWave(wave, 5); // Smooth the waveform (see function below)

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
}

// Spawns two new particles for this frame, based on the current bass energy
function spawnParticles(bass) {
  particles.push(new Particle(bass));
  particles.push(new Particle(bass));
}

// Updates and draws all active particles, removing any that have drifted off screen
function updateAndShowParticles(amp) {
  for (var i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].edges()) {
      particles[i].update(song.isPlaying(), amp);
      particles[i].show();
    } else {
      particles.splice(i, 1); // Remove particles that go off screen
    }
  }
}

// Draws the "welcome to the PINK PONY {CLUB}" title card, fading in/out with amplitude.
// Desktop: to the right of the circle. Mobile/narrow: centered and stacked above the circle.
function drawTitleCard(waveColor, amp) {
  push();
  let textAlpha = map(amp, 200, 240, 50, 255);
  fill(waveColor.levels[0], waveColor.levels[1], waveColor.levels[2], textAlpha);

  if (width >= height) {
    textAlign(LEFT, CENTER);
    textSize(45);
    text("welcome to the", 277, -190);
    textSize(128);
    text("PINK", 275, -110);
    text("PONY", 275, 0);
    text("{CLUB}", 237, 110);
  } else {
    textAlign(CENTER, CENTER);
    textSize(32);
    text("welcome to the", 0, MOBILE_TITLE_TOP + 30);
    textSize(90);
    text("PINK", 0, MOBILE_TITLE_TOP + 130);
    text("PONY", 0, MOBILE_TITLE_TOP + 230);
    text("{CLUB}", 0, MOBILE_TITLE_BOTTOM);
  }
  pop();
}

// Toggle the play/pause state of the song
function togglePlay() {
  if (song.isPlaying()) {
    song.pause(); // Pause if currently playing
    noLoop(); // Stop drawing when song is paused
    playButton.html("Play");
  } else {
    song.play(); // Play the song if not playing
    loop(); // Start drawing again when song is playing
    playButton.html("Pause");
    if (startHint) {
      startHint.remove(); // Only needed before the first play
      startHint = null;
    }
  }
}

// Mouse click handler to toggle play/pause when clicking outside visualizer radius
function mouseClicked(event) {
  // Ignore clicks on the UI panel or the mobile FX toggle (p5 fires this for clicks anywhere
  // on the page, not just the canvas, so interacting with a control shouldn't also toggle playback)
  if (event && (uiContainer.elt.contains(event.target) || fxToggle.elt.contains(event.target))) {
    return;
  }

  var distance = dist(mouseX, mouseY, originX, originY); // Calculate distance from the visualizer's center

  // Only toggle play/pause if the click is outside the visualizer radius
  if (distance > visualizerRadius * vizScale) {
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

// Returns the current shared rainbow color (see rainbowHue, advanced once per frame in draw())
function currentRainbowColor() {
  colorMode(HSB, 360, 100, 100, 255);
  let rainbowColor = color(rainbowHue, 85, 100);
  colorMode(RGB, 255); // Restore the default color mode used everywhere else
  return rainbowColor;
}

// Particle class for making the shapes behind the visualizer
class Particle {
  //constructor uses the bass frequency energy to drive the particle's outward acceleration
  constructor(bass) {
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

    // Color when rainbow mode is off; if it's on, show() uses the shared rainbow color instead
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
    // Divide by vizScale since these positions are in local (pre-scale) units, while width/height are absolute pixels
    let halfW = width / 2 / vizScale;
    let halfH = height / 2 / vizScale;
    return (
      this.pos.x < -halfW ||
      this.pos.x > halfW ||
      this.pos.y < -halfH ||
      this.pos.y > halfH
    ); // Check if particle is off screen
  }

  show() {
    //runs if particle still on screen
    noStroke(); // No outline for the shapes
    //sets how far from center of canvas particles go before they disappear
    let maxDistance = (width / 2 / vizScale) * 0.5;
    let distance = dist(0, 0, this.pos.x, this.pos.y);

    // In rainbow mode, every particle reads the same shared hue each frame (see draw()),
    // so they all shift color together instead of each keeping the hue from when it spawned
    let baseColor = rainbowToggle.checked() ? currentRainbowColor() : this.color;

    // Set the alpha transparency based on distance (for fade out)
    //lerp = linear interpolation --> set between 255 and 0, based on the distance from the center, then setting the ratio from 1 (full alpha) to 0 (fully faded)
    let alpha = lerp(240, 0, map(distance, 0, maxDistance, 1, 0.1));

    // Adjust brightness and saturation based on distance
    //same as alpha but takes the current color HSB brightness (second value)
    // dimmer at edges
    let brightness = lerp(
      baseColor.levels[2],
      255,
      map(distance, 0, maxDistance, 0.6, 1)
    ); // Brighter at center
    let saturation = lerp(
      baseColor.levels[1],
      255,
      map(distance, 0, maxDistance, 0, 0.2)
    ); // More saturated at center, 50% saturation at edges

    // Randomize rotation for chaotic appearance
    push(); //takes a snapshot of drawing state
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation * 0.5); // Find the particle position and set this as 0,0 for a sec then rotates particle by random360deg value, then lessened by .5

    // Draw different shapes based on random selection
    // Uses color picker Hue, plus the saturation, brightness and alpha values and applies those to whatever shape type is chosen circle=0,square=1,triangle=2 (coordinates are based on the new 0,0 set at 'push')
    fill(baseColor.levels[0], saturation, brightness, alpha);
    if (this.shapeType === 0) {
      ellipse(0, 0, this.w, this.w); // Ellipse
    } else if (this.shapeType === 1) {
      rect(0, 0, this.w, this.w); // Rectangle (rectMode(CENTER) is set once in setup())
    } else if (this.shapeType === 2) {
      triangle(0, -this.w / 2, this.w / 2, this.w / 2, -this.w / 2, this.w / 2); // Triangle
    }
    pop(); //snap back to reality (reset for next particle)
  }
}
