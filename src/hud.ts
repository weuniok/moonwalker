export function createHud() {
  let fps = 60;

  return {
    calculateFps(deltaTime: number) {
      fps = 1000 / deltaTime;
    },
    scheduleUpdates() {
      const updateHud = () => {
        const fpsCounter =
          document.querySelector<HTMLOutputElement>("#fps-counter")!;

        if (fpsCounter) {
          fpsCounter.innerText = `${Math.round(fps)} FPS`;
        }
      };

      const interval = setInterval(updateHud, 2000);

      return {
        cleanup() {
          clearInterval(interval);
        },
      };
    },
    render() {
      return `\
        <output id="fps-counter">${fps} FPS</output>
      `;
    },
  };
}
