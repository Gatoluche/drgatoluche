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
