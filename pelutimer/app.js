// Array of all timers.
let timers = [
    { name: 'Timer 1', time: 0, interval: null },
    { name: 'Timer 2', time: 0, interval: null }
];
// The timer that is currently running.
let runningTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTimersFromStorage();
    loadTimers();

    document.getElementById('add-timer').addEventListener('click', addTimer);
    document.getElementById('reset-data').addEventListener('click', resetData);

    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-data').addEventListener('click', importData);
});

function importData() {
    const timerInput = document.getElementById('inputJSON').value;
    
    if (timerInput) {
        console.log(timerInput);
        importTimers(timerInput);
    } else {
        console.error('No timers input provided.');
    }
}

function exportData() {
    // Stringify timer data
    const timerData = JSON.stringify(timers);
    // Set the value of the input field 'inputJSON' to the JSON string
    document.getElementById('inputJSON').value = timerData;
}


// Load from input field to migrate between devices
function loadTimersFromInput() {
    console.log("alive");
    console.log(timerInput);
    const timerInput = document.getElementById('inputJSON').value;
    if (timerInput) {
        importTimers(timerInput);
        loadTimers();
        updateRatios();
        saveTimersToStorage();
    } else {
        console.error('No timers input provided.');
    }
}

// Separated import function to be usable with both import methods.
function importTimers(inputTimers) {
    timers = JSON.parse(inputTimers);
    timers.forEach(timer => timer.interval = null);
}

// Load from local storage to survive refreshing
function loadTimersFromStorage() {
    const storedTimers = localStorage.getItem('timers');
    if (storedTimers) {
        importTimers(storedTimers)
    }
}

function saveTimersToStorage() {
    localStorage.setItem('timers', JSON.stringify(timers));
}

function loadTimers() {
    const timersContainer = document.getElementById('timers');
    timersContainer.innerHTML = '';
    timers.forEach((timer, index) => {
        const timerElement = createTimerElement(timer, index);
        timersContainer.appendChild(timerElement);
    });
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
        saveTimersToStorage();
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
        saveTimersToStorage();
    });

    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.classList.add('timer-input');
    minutesInput.value = Math.floor((timer.time % 3600) / 60).toString().padStart(2, '0');
    minutesInput.addEventListener('change', () => {
        timer.time = (parseInt(hoursInput.value, 10) * 3600) + (parseInt(minutesInput.value, 10) * 60) + parseInt(secondsInput.value, 10);
        updateRatios();
        saveTimersToStorage();
    });

    const secondsInput = document.createElement('input');
    secondsInput.type = 'number';
    secondsInput.classList.add('timer-input');
    secondsInput.value = (timer.time % 60).toString().padStart(2, '0');
    secondsInput.addEventListener('change', () => {
        timer.time = (parseInt(hoursInput.value, 10) * 3600) + (parseInt(minutesInput.value, 10) * 60) + parseInt(secondsInput.value, 10);
        updateRatios();
        saveTimersToStorage();
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

function toggleTimer(index) {
    // If there's a timer running, STOP the timer.
    if (runningTimer !== null) {
        clearInterval(timers[runningTimer].interval);
        timers[runningTimer].interval = null;
        // Calculate elapsed time since start and update timer's time
        // Fetch date
        let currentTime = Date.now();

        let elapsedTime = Math.floor((currentTime - timers[runningTimer].startTime) / 1000);
        timers[runningTimer].time = timers[runningTimer].initialTime + elapsedTime;
        // Print current time in readable format
        console.log("Stopped " + timers[runningTimer].name +
            " at " + new Date(currentTime).toLocaleString() +
            ". " + elapsedTime + " seconds have passed."); 
        
        timers[runningTimer].startTime = null;
        timers[runningTimer].initialTime = 0;
        if (runningTimer === index) {
            runningTimer = null;
            loadTimers();
            saveTimersToStorage();
            return; // Break out.
        }
    }
    
    // START the timer.
    runningTimer = index;
    // Store start time (of day) and timer time.
    timers[index].startTime = Date.now(); // Record start time
    timers[index].initialTime = timers[index].time; // Store initial time when starting
    // Log start time.
    console.log("Started " + timers[runningTimer].name + " at " + new Date(timers[index].startTime).toLocaleString()); // Print start time in readable format
    // Start running.
    timers[index].interval = setInterval(() => {
        timers[index].time += 1;
        loadTimers();
        updateRatios();
        saveTimersToStorage();
    }, 1000);
    
    loadTimers();
    saveTimersToStorage();
}

function addTimer() {
    timers.push({ name: `Timer ${timers.length + 1}`, time: 0, interval: null });
    loadTimers();
    saveTimersToStorage();
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
    saveTimersToStorage();
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
