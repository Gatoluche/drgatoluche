import { updateTimerRatios } from './script.js';
import { timeToMs, msToTime } from './utils.js';

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
        // Prevent stupid error where timer starts as NaN due to cookie corruption.
        if(isNaN(this.time)) {
            console.log("ERROR: Timer is NaN. Setting to 0.");
            this.time = 0;
        }
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
        const elapsedTime = (Date.now() - this.timeStarted);
        this.time += elapsedTime;
        this.timeStarted = Date.now();
        this.updateDisplay();
        updateTimerRatios();
    }

    isRunning() {
        return this.intervalId !== null; // Determine if the timer is running based on intervalId
    }

    getTime() { // Returns readable time value
        const { hours, minutes, seconds } = msToTime(this.time);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    setTime(hours, minutes, seconds) {
        this.time = timeToMs(hours, minutes, seconds);
        this.updateDisplay();
    }

    addTime(hours, minutes, seconds) {
        const additionalTime = timeToMs(hours, minutes, seconds);
        this.time += additionalTime;
        if (this.time < 0) {
            console.warn(`Warning: Timer "${this.title}" time is less than zero.`);
            this.time = 0;
        }
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.displayElement) {
            this.displayElement.textContent = this.getTime();
        }
    }
}