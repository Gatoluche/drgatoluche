import { Timer } from './timer.js';

// Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Page loaded!")
    if (!loadTimerData()) {
        addTimerBlock();
        addTimerBlock();
    }
    setAllTimersInactive();
    updateTimerRatios();
    setInterval(saveTimerData, 10000); // Save data every 10 seconds
});

// Global variable to track the currently running timer
let currentRunningTimer = null;

// Function to save timer data to cookies
function saveTimerData() {
    const allTimerBlocks = document.querySelectorAll('.timer-block');
    const timerData = [];

    allTimerBlocks.forEach(block => {
        const timerTitle = block.querySelector('.timer-title').value;
        const timerDisplay = block.querySelector('.timer-display').textContent;
        timerData.push({ title: timerTitle, time: timerDisplay });
    });

    document.cookie = `timerData=${JSON.stringify(timerData)}; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
}

// Function to load timer data from cookies
function loadTimerData() {
    const cookies = document.cookie.split('; ');
    const timerDataCookie = cookies.find(cookie => cookie.startsWith('timerData='));

    if (timerDataCookie) {
        const timerData = JSON.parse(timerDataCookie.split('=')[1]);

        timerData.forEach(data => {
            const timerBlock = addTimerBlock();
            timerBlock.querySelector('.timer-title').value = data.title;
            timerBlock.querySelector('.timer-display').textContent = data.time;
        });
        return true;
    }
    return false;
}

// Function to add a new timer block to the DOM
function addTimerBlock() {
    const timerContainer = document.getElementById('timer-container');
    const timerBlock = document.createElement('div');
    timerBlock.className = 'timer-block';
    timerBlock.classList.add('inactive');
    
    // Timer title input
    const timerTitle = document.createElement('input');
    timerTitle.className = 'timer-title';
    timerTitle.type = 'text';
    timerTitle.placeholder = 'Title';
    timerBlock.appendChild(timerTitle);
    
    // Timer display
    const timerDisplay = document.createElement('div');
    timerDisplay.className = 'timer-display';
    timerDisplay.textContent = '00:00:00';
    timerDisplay.style.textAlign = 'center';
    timerDisplay.onclick = () => showEditDialog(timerBlock);
    timerBlock.appendChild(timerDisplay);
    
    // Create a new Timer object and associate it with the timer block
    const timer = new Timer(timerTitle.value, timerDisplay);
    timerBlock.timer = timer;
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    
    // Start/Pause button
    const startPauseButton = document.createElement('button');
    startPauseButton.className = 'play-button';
    startPauseButton.style.backgroundImage = 'url("../pictures/play.png")';
    startPauseButton.onclick = () => toggleTimer(timerBlock, startPauseButton);
    buttonContainer.appendChild(startPauseButton);
    
    // Edit button
    const editButton = document.createElement('button');
    editButton.style.backgroundImage = 'url("../pictures/transfer.png")';
    editButton.onclick = () => showDialog(timerBlock);
    buttonContainer.appendChild(editButton);
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.style.backgroundImage = 'url("../pictures/trash-bin.png")';
    deleteButton.onclick = () => timerBlock.remove();
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

    return timerBlock; // Return the created timer block
}

// Function to show the edit dialog for the timer value
function showEditDialog(timerBlock) {
    const timerDisplay = timerBlock.querySelector('.timer-display');
    const [hours, minutes, seconds] = timerDisplay.textContent.split(':').map(Number);

    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <input type="number" class="edit-hours" value="${hours}" min="0" max="99"> :
        <input type="number" class="edit-minutes" value="${minutes}" min="0" max="59"> :
        <input type="number" class="edit-seconds" value="${seconds}" min="0" max="59">
    `;
    document.body.appendChild(dialog);

    const closeDialog = () => {
        const newHours = dialog.querySelector('.edit-hours').value.padStart(2, '0');
        const newMinutes = dialog.querySelector('.edit-minutes').value.padStart(2, '0');
        const newSeconds = dialog.querySelector('.edit-seconds').value.padStart(2, '0');
        timerDisplay.textContent = `${newHours}:${newMinutes}:${newSeconds}`;
        document.body.removeChild(dialog);
        updateTimerRatios();
    };

    dialog.querySelectorAll('input').forEach(input => {
        input.addEventListener('blur', closeDialog);
    });

    if (currentRunningTimer && currentRunningTimer[0] === timerBlock) {
        toggleTimer(timerBlock, timerBlock.querySelector('.play-button'));
    }
}

// Function to toggle the timer (start/pause)
function toggleTimer(timerBlock, button) {
    const allTimerBlocks = document.querySelectorAll('.timer-block');
    const timer = timerBlock.timer;
    
    if (button.style.backgroundImage.includes('play.png')) {
        if (currentRunningTimer) {
            const [currentBlock, currentButton] = currentRunningTimer;
            currentButton.style.backgroundImage = 'url("../pictures/play.png")';
            currentBlock.timer.stopTimer();
            currentBlock.classList.add('inactive');
        }
        button.style.backgroundImage = 'url("../pictures/pause.png")';
        currentRunningTimer = [timerBlock, button];
        timerBlock.classList.remove('inactive');
        
        timer.startTimer();
    } else {
        button.style.backgroundImage = 'url("../pictures/play.png")';
        timer.stopTimer();
        currentRunningTimer = null;
        timerBlock.classList.add('inactive');
    }

    allTimerBlocks.forEach(block => {
        if (block !== timerBlock) {
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
function updateTimerRatios() {
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
