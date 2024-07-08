let timers = [
    { name: 'Timer 1', time: 0, interval: null },
    { name: 'Timer 2', time: 0, interval: null }
];
let runningTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTimersFromStorage();
    loadTimers();
    document.getElementById('add-timer').addEventListener('click', addTimer);
    document.getElementById('reset-data').addEventListener('click', resetData);
});

function loadTimers() {
    const timersContainer = document.getElementById('timers');
    timersContainer.innerHTML = '';
    timers.forEach((timer, index) => {
        const timerElement = createTimerElement(timer, index);
        timersContainer.appendChild(timerElement);
    });
}

function createTimerElement(timer, index) {
    const timerElement = document.createElement('div');
    timerElement.classList.add('timer');

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
    display.textContent = formatTime(timer.time);

    const toggleButton = document.createElement('button');
    toggleButton.classList.add('timer-toggle');
    toggleButton.textContent = timer.interval ? 'Stop' : 'Start';
    toggleButton.addEventListener('click', () => toggleTimer(index));

    const removeButton = document.createElement('button');
    removeButton.classList.add('timer-remove');
    removeButton.textContent = 'X';
    removeButton.style.display = timers.length > 2 ? 'block' : 'none';
    removeButton.addEventListener('click', () => removeTimer(index));

    timerElement.appendChild(nameInput);
    timerElement.appendChild(display);
    timerElement.appendChild(toggleButton);
    timerElement.appendChild(removeButton);

    return timerElement;
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function toggleTimer(index) {
    if (runningTimer !== null) {
        clearInterval(timers[runningTimer].interval);
        timers[runningTimer].interval = null;
        if (runningTimer === index) {
            runningTimer = null;
            loadTimers();
            saveTimersToStorage();
            return;
        }
    }
    runningTimer = index;
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
    const ratiosContainer = document.getElementById('ratios');
    ratiosContainer.innerHTML = '';
    for (let i = 0; i < timers.length; i++) {
        for (let j = 0; j < timers.length; j++) {
            if (i !== j) {
                const ratioElement = document.createElement('div');
                const ratio = timers[i].time / timers[j].time || 0;
                ratioElement.textContent = `${timers[i].name} is ${ratio.toFixed(2)} of ${timers[j].name}`;
                ratiosContainer.appendChild(ratioElement);
            }
        }
    }
}

function saveTimersToStorage() {
    localStorage.setItem('timers', JSON.stringify(timers));
}

function loadTimersFromStorage() {
    const storedTimers = localStorage.getItem('timers');
    if (storedTimers) {
        timers = JSON.parse(storedTimers);
        timers.forEach(timer => timer.interval = null);
    }
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
