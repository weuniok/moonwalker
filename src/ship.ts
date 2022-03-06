import { KeyboardControls } from "./keyboardControls";
import { clamp, Vector2 } from "./math";

const DEBUG = false;

const meterConversion = 1 / 500_000;
const gravity = 9.81 * meterConversion;
// const gravity = 0;

const shipWidth = 20;
const shipHeight = 20;

const worldBounds = {
  top: 0,
  right: 1000,
  down: 1000,
  left: 0,
};

const shipShape = [
  new Vector2(-shipWidth / 2, shipHeight / 2),
  new Vector2(0, -shipHeight / 2),
  new Vector2(shipWidth / 2, shipHeight / 2),
];

const exhaustShape = [
  new Vector2(-shipWidth / 2, shipHeight / 2 + shipWidth / 16),
  new Vector2(-1 * (shipWidth / 7), shipHeight),
  new Vector2(1 * (shipWidth / 7), shipHeight),
  new Vector2(shipWidth / 2, shipHeight / 2 + shipWidth / 16),
];

const maxThrust = 0.00015;

export function createShip(keyboard: KeyboardControls) {
  const position = new Vector2(500, 500);
  const velocity = Vector2.zero();
  const acceleration = Vector2.zero();

  let thrust = 0;

  const rotationThrust: number = 90 * 0.5 * meterConversion;
  const safeVelocity: number = 0.001; // safe velocity for no kaboom on collision

  let rotationAngle = 0; // angle measured clockwise from upwards direction in degrees;
  let rotationAcceleration = 0;
  let rotationVelocity = 0;

  function readState() {
    return {
      position,
      velocity,
      acceleration,
      thrust,
      rotationAngle,
    } as const;
  }

  function updateUI() {
    const state = readState();

    updateExhaustUI(state);
    updateFlightPathPredictionUI(state);
  }

  return {
    readState,
    render() {
      return `
        <g id="spaceship-ui">
          <line
            id="spaceship-path-prediction"
            x1="0"
            x2="150"
            y1="0"
            y2="150"
            stroke="var(--slate-700)"
            stroke-width="2"
            stroke-dasharray="4 4 4 4"
          />
          <g id="spaceship">
            ${
              DEBUG
                ? `
              <rect
                width="${shipWidth}"
                height="${shipHeight}"
                x="-${shipWidth / 2}"
                y="-${shipHeight / 2}"
                fill="none"
                stroke="var(--slate-800)"
                stroke-width="2"
              />
            `
                : ""
            }        
            <polygon
              points="${svgPoints(shipShape)}"
              fill="var(--slate-black)"
              stroke="var(--slate-400)"
              stroke-width="2"
            />
            <polyline
              id="spaceship-exhaust"
              points="${svgPoints(exhaustShape)}"
              fill="none"
              stroke="#0ce4f0"
              stroke-width="2"
            />
          </g>
        </g>
      `;
    },
    update(deltaTime: number) {
      // reset acceleration
      acceleration.x = 0;
      acceleration.y = 0;
      rotationAcceleration = 0;

      // loop rotationAngle when out of (-180, 180) bonds
      rotationAngle = rotationAngle % 360;
      if (rotationAngle > 180) rotationAngle = rotationAngle - 360;

      if (keyboard.isPressed("ArrowRight"))
        rotationAcceleration = rotationThrust;
      else if (keyboard.isPressed("ArrowLeft"))
        rotationAcceleration = -rotationThrust;

      if (keyboard.isPressed("ArrowUp")) {
        // makes thrust increase when button is held longer
        const deltaThrust = maxThrust * 0.002;
        thrust = Math.min(maxThrust, thrust + deltaTime * deltaThrust);
      } else {
        thrust = 0;
      }

      // react to controls
      if (thrust) {
        const horizontal = Math.sin((rotationAngle * Math.PI) / 180);
        const vertical = Math.cos((rotationAngle * Math.PI) / 180);

        acceleration.y = -thrust * vertical; // - because y axis is downwards
        acceleration.x = thrust * horizontal;
      }

      // update physics
      // update rotational physics
      rotationVelocity += deltaTime * rotationAcceleration;
      rotationAngle += 0.5 * deltaTime * rotationVelocity;

      acceleration.y = gravity + acceleration.y;

      // update linear physics
      velocity.x += deltaTime * acceleration.x;
      velocity.y += deltaTime * acceleration.y;
      position.x += 0.5 * deltaTime * velocity.x;
      position.y += 0.5 * deltaTime * velocity.y;

      clampToWorldBounds(position, velocity);

      updateUI();
    },
  };
}

type Ship = ReturnType<typeof createShip>;
type ShipState = ReturnType<Ship["readState"]>;

function clampToWorldBounds(position: Vector2, velocity: Vector2) {
  const newPosX = clamp(
    worldBounds.left + shipWidth / 2,
    position.x,
    worldBounds.right - shipWidth / 2
  );
  const newPosY = clamp(
    worldBounds.top + shipWidth / 2,
    position.y,
    worldBounds.down - shipWidth / 2
  );

  if (newPosX !== position.x) {
    position.x = newPosX;
    velocity.x = 0;
  }
  if (newPosY !== position.y) {
    position.y = newPosY;
    velocity.y = 0;
  }
}

function svgPoints(points: Vector2[]) {
  return points.map((v) => `${v.x},${v.y}`).join(" ");
}

function updateFlightPathPredictionUI({ position, velocity }: ShipState) {
  const a = new Vector2(position.x, position.y);
  const b = a.add(velocity.multiplyScalar(100));

  const pathIndicator = document.getElementById("spaceship-path-prediction")!;

  pathIndicator.setAttribute("x1", String(a.x));
  pathIndicator.setAttribute("y1", String(a.y));
  pathIndicator.setAttribute("x2", String(b.x));
  pathIndicator.setAttribute("y2", String(b.y));
}

function updateExhaustUI({ position, rotationAngle, thrust }: ShipState) {
  const element = document.getElementById("spaceship")! as any as SVGGElement;

  element.setAttribute(
    "transform",
    `translate(${position.x}, ${position.y}) rotate(${rotationAngle})`
  );

  const exhaust = document.getElementById(
    "spaceship-exhaust"
  )! as any as SVGPolylineElement;
  const exhaustOpacity = thrust / maxThrust;

  exhaust.style.strokeOpacity = String(exhaustOpacity);
}
