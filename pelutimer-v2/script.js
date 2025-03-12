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
        timerDisplay.onclick = () => showEditDialog(timerBlock);
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
        resetButton.onclick = () => timer.resetTimer();
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
