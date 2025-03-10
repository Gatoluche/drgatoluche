// Main timer class
export class Timer {
    constructor(title = 'Timer') {
        this.title = title;
        this.time = 0; // Time in milliseconds
        this.started = null;
        this.intervalId = null; // Interval ID for the timer
    }

    startTimer() {
        this.started = Date.now();
        this.intervalId = setInterval(() => this.tickTimer(), 1000); // Create a one-second interval
    }

    stopTimer() {
        clearInterval(this.intervalId); // Timer isn't ticking anymore.
        this.intervalId = null; // Reset this, since there isn't an interval.
        this.started = null;
    }

    resetTimer() {
        this.stopTimer();
        this.time = 0;
    }

    tickTimer() {
        const elapsedTime = Date.now() - this.started;
        this.time += elapsedTime;
        this.started = Date.now();
        // Update the timer display or perform other actions
    }

    isRunning() {
        return this.intervalId !== null; // Determine if the timer is running based on intervalId
    }
}