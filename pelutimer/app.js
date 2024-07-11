// SETUP
// --- --- --- --- ---

// Array of all timers.
let timers = [
    // Initialized with minimum timers for core functionality to make sense.
    { name: 'Timer 1', time: 0, interval: null },
    { name: 'Timer 2', time: 0, interval: null }
];

// The timer that is currently running.
let runningTimer = null;

// Start time and value of the timer at that point.
let startTime = null;
let startValue = null;

// Event listeners - run initial tasks and connect buttons to functions
document.addEventListener('DOMContentLoaded', () => {
    loadLocal();
    loadTimers();
    // Main functionality
    document.getElementById('add-timer').addEventListener('click', addTimer);
    document.getElementById('reset-data').addEventListener('click', resetData);
    // Data migration
    document.getElementById('export-data').addEventListener('click', exportJSON);
    document.getElementById('import-data').addEventListener('click', importJSON);
    // Dark/light mode
    document.getElementById('toggle-theme').addEventListener('click', toggleTheme);
    // Record feature (TBD)
    //document.getElementById('end-day').addEventListener('click', endDay);
});

// SAVING/LOADING: Putting data in/out of local storage.
// --- --- --- --- ---

    // PROCESSING: Putting the data back on screen.
    // --- ---

// Read JSON data into timers.
function readJSON(input) {
    timers = JSON.parse(input);
    timers.forEach(timer => timer.interval = null);
}

    // LOCAL STORAGE
    // --- ---

// Load data from local storage.
function loadLocal() {
    const storedTimers = localStorage.getItem('timers');
    if (storedTimers) {
        readJSON(storedTimers);
    }
}

// Save data to local storage.
function saveLocal() {
    localStorage.setItem('timers', JSON.stringify(timers));
}

    // JSON input/output: Manual migration feature
    // --- ---

// Read data from JSON field.
function importJSON() {
    const timerInput = document.getElementById('inputJSON').value;
    
    if (timerInput) {
        console.log(timerInput);
        readJSON(timerInput);
    } else {
        console.error('No timers input provided.');
    }
}

// Output data to JSON field.
function exportJSON() {
    // Stringify timer data
    const timerData = JSON.stringify(timers);
    // Set the value of the input field 'inputJSON' to the JSON string
    document.getElementById('inputJSON').value = timerData;
}


// CORE: Main timer functionality
// --- --- --- --- ---


    // START/STOP: Handles pausing and resuming the timers.
    // --- --- ---

// Handle the logic of the pause/resume button.
function toggleTimer(index) {

    // Do we start a timer?
    var start = true;

    // Check if a timer is running
    if (runningTimer !== null) {
        // Stop said timer.
        stopTimer()
        // Was the button pressed a "stop" one?
        if (runningTimer === index) {
            // If so, no timers will run.
            runningTimer = null;
            start = false;
        }
    }
    // Start a new timer
    start ? startTimer(index) : null;
    
    // Update timers and save data.
    loadTimers();
    saveLocal();
}


function startTimer(index) {

    // Store timer's status at startup.
    startTime = Date.now();
    startValue = timers[index].time;

    // This is now the running timer.
    runningTimer = index;

    // Log start time.
    console.log("Started " + timers[runningTimer].name +
        " at " + new Date(startTime).toLocaleString());

    // Start interval.
    // !!! This is the code that runs every second.
    timers[index].interval = setInterval(() => {
        timers[index].time += 1;
        loadTimers();
        updateRatios();
        // Saving every second isn't optimal.
        // TBD changing it to once a minute later, at least.
        saveLocal();
    }, 1000);
}

function stopTimer() {

    // Find the timer's interval and stop it.
    clearInterval(timers[runningTimer].interval);
    timers[runningTimer].interval = null;

    // To account for tab snoozing,
    // Store current time
    let currentTime = Date.now();
    
    // Calculate time since the running timer started:
    // now - then = time since then
    let elapsedTime = Math.floor((currentTime - startTime) / 1000);
    
    timers[runningTimer].time = startValue + elapsedTime;
    // Print current time in readable format
    console.log("Stopped " + timers[runningTimer].name +
        " at " + new Date(currentTime).toLocaleString() +
        ". " + elapsedTime + " seconds have passed."); 
    
    startTime = null;
    startValue = 0;
}

//  PAGE LOADING: Making the HTML and connecting it to the rest.
// --- --- --- --- ---

// Dynamically generate each timer on screen
function loadTimers() {
    const timersContainer = document.getElementById('timers');
    timersContainer.innerHTML = '';
    // For each timer present,
    timers.forEach((timer, index) => {
        // Generate an element and place it in the container.
        const timerElement = createTimerElement(timer, index);
        timersContainer.appendChild(timerElement);
    });
    updateRatios();
}


function addTimer() {
    timers.push({ name: `Timer ${timers.length + 1}`, time: 0, interval: null });
    loadTimers();
    saveLocal();
}

function removeTimer(index) {
    if (timers[index].interval) {
        clearInterval(timers[index].interval);
    }
    timers.splice(index, 1);
    if (runningTimer === index) {
        runningTimer = null;
    } else if (runningTimer > index) {
        runningTimer -= 1;
    }
    loadTimers();
    updateRatios();
    saveLocal();
}

function updateRatios() {
    timers.forEach((timer, index) => {
        const ratiosContainer = document.getElementById(`ratios-${index}`);
        ratiosContainer.innerHTML = '';
        timers.forEach((otherTimer, otherIndex) => {
            if (index !== otherIndex) {
                const ratioElement = document.createElement('div');
                const ratio = timer.time / otherTimer.time || 0;
                const roundedRatio = Math.round(ratio / 0.25) * 0.25;
                ratioElement.innerHTML = `<strong>${roundedRatio.toFixed(2)}</strong>x ${otherTimer.name}`;
                ratiosContainer.appendChild(ratioElement);
            }
        });
    });
}


function resetData() {
    localStorage.removeItem('timers');
    timers = [
        { name: 'Timer 1', time: 0, interval: null },
        { name: 'Timer 2', time: 0, interval: null }
    ];
    runningTimer = null;
    loadTimers();
    updateRatios();
}

function createTimerElement(timer, index) {
    const timerElement = document.createElement('div');
    timerElement.classList.add('timer');

    const timerHeader = document.createElement('div');
    timerHeader.classList.add('timer-header');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.classList.add('timer-name');
    nameInput.value = timer.name;
    nameInput.addEventListener('input', (e) => {
        timer.name = e.target.value;
        saveLocal();
    });

    const display = document.createElement('div');
    display.classList.add('timer-display');

    const hoursInput = document.createElement('input');
    hoursInput.type = 'number';
    hoursInput.classList.add('timer-input');
    hoursInput.value = Math.floor(timer.time / 3600).toString().padStart(2, '0');
    hoursInput.addEventListener('change', () => {
        timer.time = (parseInt(hoursInput.value, 10) * 3600) + (parseInt(minutesInput.value, 10) * 60) + parseInt(secondsInput.value, 10);
        updateRatios();
        saveLocal();
    });

    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.classList.add('timer-input');
    minutesInput.value = Math.floor((timer.time % 3600) / 60).toString().padStart(2, '0');
    minutesInput.addEventListener('change', () => {
        timer.time = (parseInt(hoursInput.value, 10) * 3600) + (parseInt(minutesInput.value, 10) * 60) + parseInt(secondsInput.value, 10);
        updateRatios();
        saveLocal();
    });

    const secondsInput = document.createElement('input');
    secondsInput.type = 'number';
    secondsInput.classList.add('timer-input');
    secondsInput.value = (timer.time % 60).toString().padStart(2, '0');
    secondsInput.addEventListener('change', () => {
        timer.time = (parseInt(hoursInput.value, 10) * 3600) + (parseInt(minutesInput.value, 10) * 60) + parseInt(secondsInput.value, 10);
        updateRatios();
        saveLocal();
    });

    display.appendChild(hoursInput);
    display.appendChild(document.createTextNode(':'));
    display.appendChild(minutesInput);
    display.appendChild(document.createTextNode(':'));
    display.appendChild(secondsInput);

    const toggleButton = document.createElement('button');
    toggleButton.classList.add('timer-toggle');
    toggleButton.innerHTML = timer.interval ?
        '<span style="color: darkred;">◼</span>' : '▶';
    toggleButton.addEventListener('click', () => toggleTimer(index));

    const removeButton = document.createElement('button');
    removeButton.classList.add('timer-remove');
    removeButton.textContent = '🞮';
    removeButton.style.display = timers.length > 2 ? 'block' : 'none';
    removeButton.addEventListener('click', () => removeTimer(index));

    const ratiosContainer = document.createElement('div');
    ratiosContainer.classList.add('ratios');
    ratiosContainer.id = `ratios-${index}`;

    timerHeader.appendChild(nameInput);
    timerHeader.appendChild(display);
    timerHeader.appendChild(toggleButton);
    timerHeader.appendChild(removeButton);

    timerElement.appendChild(timerHeader);
    timerElement.appendChild(ratiosContainer);

    return timerElement;
}

// MISCELLANEOUS: Cosmetic, unimportant stuff.
// --- --- --- --- ---

function toggleTheme() {
    document.body.classList.toggle('dark');
}