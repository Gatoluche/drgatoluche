// Main timer class
export class Timer {
    constructor(title = 'Timer', displayElement = null) {
        this.title = title;
        this.time = 0; // Time in milliseconds
        this.timeStarted = null;
        this.intervalId = null; // Interval ID for the timer
        this.displayElement = displayElement; // Element to update the display
    }

    startTimer() {
        this.timeStarted = Date.now();
        this.intervalId = setInterval(() => this.tickTimer(), 1000); // Create a one-second interval
    }

    stopTimer() {
        clearInterval(this.intervalId); // Stop timer from ticking any more ticking anymore.
        this.intervalId = null; // Reset interval ID, since there isn't an interval.
        this.timeStarted = null;    // Reset start time, to prevent reusing it by mistake.
    }

    resetTimer() {
        this.stopTimer();
        this.time = 0;
        this.updateDisplay();
    }

    tickTimer() {
        const elapsedTime = Date.now() - this.timeStarted;
        this.time += elapsedTime;
        this.timeStarted = Date.now();
        this.updateDisplay();
        // Update the timer display or perform other actions
    }

    isRunning() {
        return this.intervalId !== null; // Determine if the timer is running based on intervalId
    }

    getTime() { // Returns readable time value
        const totalSeconds = Math.floor(this.time / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateDisplay() {
        if (this.displayElement) {
            this.displayElement.textContent = this.getTime();
        }
    }
}