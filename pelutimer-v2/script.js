import { Timer } from './timer.js';
import { msToTime } from './utils.js';

// Attach Timer class to the window object
window.Timer = Timer;

// Array to store timer objects
const timers = [];

// Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Page loaded!");
    if (!loadTimerData()) {
        addTimer(new Timer());
        addTimer(new Timer());
    }
    setAllTimersInactive();
    updateTimerRatios();
    setInterval(saveTimerData, 10000); // Save data every 10 seconds
    createTransferDialog();
});

// Global variable to track the currently running timer
let currentRunningTimer = null;

// Function to save timer data to cookies
function saveTimerData() {
    const timerData = timers.map(timer => ({
        title: timer.title,
        time: timer.time
    }));

    document.cookie = `timerData=${JSON.stringify(timerData)}; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
}
// Make force local save possible
window.saveTimerData = saveTimerData;

// Function to load timer data from cookies
function loadTimerData() {
    const cookies = document.cookie.split('; ');
    const timerDataCookie = cookies.find(cookie => cookie.startsWith('timerData='));

    if (timerDataCookie) {
        const timerData = JSON.parse(timerDataCookie.split('=')[1]);

        timerData.forEach(data => {
            const timer = new Timer(data.title);
            timer.time = data.time;
            addTimer(timer);
        });
        return true;
    }
    return false;
}

// Function to add a new timer to the array and DOM
window.addTimer = function(timer = new Timer()) {
    timers.push(timer);
    renderTimers();
}

// Function to render all timers in the DOM
function renderTimers() {
    const timerContainer = document.getElementById('timer-container');
    timerContainer.innerHTML = ''; // Clear existing timers

    timers.forEach(timer => {
        const timerBlock = document.createElement('div');
        timerBlock.className = 'timer-block';
        timerBlock.classList.add('inactive');
        
        // Timer title input
        const timerTitle = document.createElement('input');
        timerTitle.className = 'timer-title';
        timerTitle.type = 'text';
        timerTitle.placeholder = 'Title';
        timerTitle.value = timer.title;
        timerTitle.oninput = () => timer.title = timerTitle.value;
        timerBlock.appendChild(timerTitle);
        
        // Timer display
        const timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer-display';
        timerDisplay.textContent = timer.getTime();
        timerDisplay.style.textAlign = 'center';
        timerDisplay.onclick = () => showEditFields(timerBlock, timer);
        timerBlock.appendChild(timerDisplay);
        
        // Associate the timer object with the timer block and set the display element
        timer.displayElement = timerDisplay;
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        // Start/Pause button
        const startPauseButton = document.createElement('button');
        startPauseButton.className = 'play-button';
        startPauseButton.style.backgroundImage = 'url("../pictures/play.png")';
        startPauseButton.onclick = () => toggleTimer(timer, startPauseButton);
        buttonContainer.appendChild(startPauseButton);
        
        // Reset button
        const resetButton = document.createElement('button');
        resetButton.style.backgroundImage = 'url("../pictures/transfer.png")';
        resetButton.onclick = () => {
            if (startPauseButton.style.backgroundImage.includes('pause.png')) {
                toggleTimer(timer, startPauseButton);
            }
            timer.resetTimer();
            updateTimerRatios();
        };
        buttonContainer.appendChild(resetButton);
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.style.backgroundImage = 'url("../pictures/trash-bin.png")';
        deleteButton.onclick = () => {
            timers.splice(timers.indexOf(timer), 1);
            renderTimers();
        };
        buttonContainer.appendChild(deleteButton);
        
        timerBlock.appendChild(buttonContainer);
        
        // Floating dialog
        const dialog = document.createElement('div');
        dialog.className = 'floating-dialog';
        dialog.textContent = 'TBD';
        timerBlock.appendChild(dialog);

        // Timer ratio container
        const ratioContainer = document.createElement('div');
        ratioContainer.className = 'timer-ratio';
        ratioContainer.style.whiteSpace = 'pre';
        timerBlock.appendChild(ratioContainer);
        
        timerContainer.appendChild(timerBlock);
    });
}

// Function to toggle the timer (start/pause)
function toggleTimer(timer, button) {
    const allTimerBlocks = document.querySelectorAll('.timer-block');
    
    if (button.style.backgroundImage.includes('play.png')) {
        if (currentRunningTimer) {
            const [currentTimer, currentButton] = currentRunningTimer;
            currentButton.style.backgroundImage = 'url("../pictures/play.png")';
            currentTimer.stopTimer();
            currentTimer.displayElement.parentElement.classList.add('inactive');
        }
        button.style.backgroundImage = 'url("../pictures/pause.png")';
        currentRunningTimer = [timer, button];
        timer.displayElement.parentElement.classList.remove('inactive');
        
        timer.startTimer();
    } else {
        button.style.backgroundImage = 'url("../pictures/play.png")';
        timer.stopTimer();
        currentRunningTimer = null;
        timer.displayElement.parentElement.classList.add('inactive');
    }

    allTimerBlocks.forEach(block => {
        if (block !== timer.displayElement.parentElement) {
            block.classList.add('inactive');
        }
    });
}

// Function to show/hide the floating dialog
function showDialog(timerBlock) {
    const dialog = timerBlock.querySelector('.floating-dialog');
    dialog.style.display = dialog.style.display === 'none' || dialog.style.display === '' ? 'block' : 'none';
}

// Function to set all timers to inactive
function setAllTimersInactive() {
    const allTimerBlocks = document.querySelectorAll('.timer-block');
    allTimerBlocks.forEach(block => {
        block.classList.add('inactive');
    });
}

// Function to update the timer ratios
export function updateTimerRatios() {
    const allTimerBlocks = document.querySelectorAll('.timer-block');
    allTimerBlocks.forEach(block => {
        const timerDisplay = block.querySelector('.timer-display').textContent;
        const timerTitle = block.querySelector('.timer-title').value || 'Timer';
        const [hours, minutes, seconds] = timerDisplay.split(':').map(Number);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        let ratiosText = '';

        allTimerBlocks.forEach(otherBlock => {
            if (block !== otherBlock) {
                const otherDisplay = otherBlock.querySelector('.timer-display').textContent;
                const otherTitle = otherBlock.querySelector('.timer-title').value || 'Timer';
                const [otherHours, otherMinutes, otherSeconds] = otherDisplay.split(':').map(Number);
                const otherTotalSeconds = otherHours * 3600 + otherMinutes * 60 + otherSeconds;

                const ratio = otherTotalSeconds === 0 ? '0.00' : (totalSeconds / otherTotalSeconds).toFixed(2);
                const color = ratio > 1 ? '#00ff00' : 'red';
                ratiosText += `<span style="color:${color}">${ratio}x</span> ${otherTitle}\n`;
            }
        });

        block.querySelector('.timer-ratio').innerHTML = ratiosText;
    });
}

function showEditFields(timerBlock, timer) {
    const timerDisplay = timerBlock.querySelector('.timer-display');
    const buttonContainer = timerBlock.querySelector('.button-container');
    const { hours, minutes, seconds } = msToTime(timer.time);

    // Add editing class
    timerBlock.classList.add('editing');

    // Create input fields for hours, minutes, and seconds
    const hoursInput = document.createElement('input');
    hoursInput.type = 'text';
    hoursInput.value = String(hours).padStart(2, '0');
    hoursInput.className = 'timer-input';
    hoursInput.style.width = '30px';

    const minutesInput = document.createElement('input');
    minutesInput.type = 'text';
    minutesInput.value = String(minutes).padStart(2, '0');
    minutesInput.className = 'timer-input';
    minutesInput.style.width = '30px';

    const secondsInput = document.createElement('input');
    secondsInput.type = 'text';
    secondsInput.value = String(seconds).padStart(2, '0');
    secondsInput.className = 'timer-input';
    secondsInput.style.width = '30px';

    // Replace the timer display with input fields
    timerDisplay.innerHTML = '';
    timerDisplay.appendChild(hoursInput);
    timerDisplay.appendChild(document.createTextNode(':'));
    timerDisplay.appendChild(minutesInput);
    timerDisplay.appendChild(document.createTextNode(':'));
    timerDisplay.appendChild(secondsInput);

    // Create confirm and cancel buttons
    const confirmButton = document.createElement('button');
    confirmButton.style.backgroundImage = 'url("../pictures/check.png")';
    confirmButton.onclick = () => {
        const newHours = parseInt(hoursInput.value, 10);
        const newMinutes = parseInt(minutesInput.value, 10);
        const newSeconds = parseInt(secondsInput.value, 10);

        // Check if the inputs are valid integers
        if (isNaN(newHours) || isNaN(newMinutes) || isNaN(newSeconds)) {
            console.log('ERROR: Tried to set timer to a non-numerical value.');
        } else {
            timer.setTime(newHours, newMinutes, newSeconds);
            
        }
        renderTimers();
        updateTimerRatios();
        // Remove editing class
        timerBlock.classList.remove('editing');
    };

    const cancelButton = document.createElement('button');
    cancelButton.style.backgroundImage = 'url("../pictures/close.png")';
    cancelButton.className = 'play-button';
    cancelButton.onclick = () => {
        renderTimers();
        updateTimerRatios();
        // Remove editing class
        timerBlock.classList.remove('editing');
    };

    // Replace the button container with confirm and cancel buttons
    buttonContainer.innerHTML = '';
    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(cancelButton);

    // Prevent the input fields from losing focus
    hoursInput.addEventListener('click', (e) => e.stopPropagation());
    minutesInput.addEventListener('click', (e) => e.stopPropagation());
    secondsInput.addEventListener('click', (e) => e.stopPropagation());
}

// Function to create the transfer dialog
function createTransferDialog() {
    const transferDialog = document.createElement('div');
    transferDialog.className = 'transfer-dialog';
    transferDialog.id = 'transfer-dialog';

    const timer1Select = document.createElement('select');
    timer1Select.id = 'timer1-select';
    const timer2Select = document.createElement('select');
    timer2Select.id = 'timer2-select';

    const hoursInput = document.createElement('input');
    hoursInput.type = 'number';
    hoursInput.placeholder = 'Hours';
    hoursInput.id = 'transfer-hours';

    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.placeholder = 'Minutes';
    minutesInput.id = 'transfer-minutes';

    const secondsInput = document.createElement('input');
    secondsInput.type = 'number';
    secondsInput.placeholder = 'Seconds';
    secondsInput.id = 'transfer-seconds';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Confirm';
    confirmButton.onclick = () => {
        const timer1 = timers[timer1Select.value];
        const timer2 = timers[timer2Select.value];
        const hours = parseInt(hoursInput.value, 10) || 0;
        const minutes = parseInt(minutesInput.value, 10) || 0;
        const seconds = parseInt(secondsInput.value, 10) || 0;

        if (timer1 && timer2 && (hours || minutes || seconds)) {
            timer1.addTime(-hours, -minutes, -seconds);
            timer2.addTime(hours, minutes, seconds);
            renderTimers();
            updateTimerRatios();
            transferDialog.style.display = 'none';
        }
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => {
        transferDialog.style.display = 'none';
    };

    transferDialog.appendChild(timer1Select);
    transferDialog.appendChild(hoursInput);
    transferDialog.appendChild(minutesInput);
    transferDialog.appendChild(secondsInput);
    transferDialog.appendChild(timer2Select);
    transferDialog.appendChild(confirmButton);
    transferDialog.appendChild(cancelButton);

    document.body.appendChild(transferDialog);
}

// Function to show the transfer dialog
window.showTransferDialog = function() {
    const transferDialog = document.getElementById('transfer-dialog');
    const timer1Select = document.getElementById('timer1-select');
    const timer2Select = document.getElementById('timer2-select');

    timer1Select.innerHTML = '';
    timer2Select.innerHTML = '';

    timers.forEach((timer, index) => {
        const option1 = document.createElement('option');
        option1.value = index;
        option1.textContent = timer.title || `Timer ${index + 1}`;
        timer1Select.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = index;
        option2.textContent = timer.title || `Timer ${index + 1}`;
        timer2Select.appendChild(option2);
    });

    transferDialog.style.display = 'block';
}

// Function to import timers from JSON
window.importTimersFromJSON = function() {
    const jsonInput = document.getElementById('data-field').textContent;
    try {
        const timerData = JSON.parse(jsonInput);
        timers.length = 0; // Clear existing timers
        timerData.forEach(data => {
            const timer = Timer.fromJSON(JSON.stringify(data));
            timers.push(timer);
        });
        renderTimers();
        updateTimerRatios();
    } catch (error) {
        console.error('Invalid JSON data:', error);
    }
}

// Function to export timers to JSON
window.exportTimersToJSON = function() {
    const jsonOutput = timers.map(timer => JSON.parse(timer.toJSON()));
    document.getElementById('data-field').textContent = JSON.stringify(jsonOutput, null, 2);
}

// Function to export timers to readable format
window.exportTimersToReadable = function(mkdown = false) {
    const readableOutput = timers.map(timer => timer.toString(mkdown)).join("\n\n");
    document.getElementById('data-field').innerHTML = readableOutput.replace(/\n/g, '<br>');
}
// Function to switch the theme
window.switchTheme = function() {
    const body = document.body;
    const timerRatios = document.querySelectorAll('.timer-ratio');

    if (body.style.backgroundColor === 'white') {
        body.style.backgroundColor = 'black';
        body.style.color = 'white';
        timerRatios.forEach(ratio => ratio.style.color = 'white');

    } else {
        console.log(body.style.backgroundColor);
        body.style.backgroundColor = 'white';
        body.style.color = 'black';
        timerRatios.forEach(ratio => ratio.style.color = 'black');
    }
}
