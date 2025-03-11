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
        //console.log((Date.now() - this.timeStarted) + " (" + Date.now() + " - " + this.timeStarted +")");
        const elapsedTime = (Date.now() - this.timeStarted);
        //console.log(this.time + " + " + elapsedTime);
        this.time += elapsedTime;
        this.timeStarted = Date.now();
        //console.log(this.title + ": " + this.getTime());
        this.updateDisplay();
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

    setTime(hours, minutes, seconds) {
        this.time = (hours * 3600 + minutes * 60 + seconds) * 1000;
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.displayElement) {
            this.displayElement.textContent = this.getTime();
        }
    }
}