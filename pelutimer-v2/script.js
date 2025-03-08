// Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
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
    timerBlock.appendChild(timerDisplay);
    
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

// Function to toggle the timer (start/pause)
function toggleTimer(timerBlock, button) {
    const timerDisplay = timerBlock.querySelector('.timer-display');
    const allTimerBlocks = document.querySelectorAll('.timer-block');
    
    if (button.style.backgroundImage.includes('play.png')) {
        if (currentRunningTimer) {
            const [currentBlock, currentButton] = currentRunningTimer;
            currentButton.style.backgroundImage = 'url("../pictures/play.png")';
            clearInterval(currentBlock.timerInterval);
            currentBlock.classList.add('inactive');
        }
        button.style.backgroundImage = 'url("../pictures/pause.png")';
        currentRunningTimer = [timerBlock, button];
        timerBlock.classList.remove('inactive');
        
        let lastTickTime = Date.now();
        timerBlock.timerInterval = setInterval(() => {
            const currentTime = Date.now();
            const elapsedTime = Math.floor((currentTime - lastTickTime) / 1000);
            lastTickTime = currentTime;

            let [hours, minutes, seconds] = timerDisplay.textContent.split(':').map(Number);
            seconds += elapsedTime;
            if (seconds >= 60) {
                minutes += Math.floor(seconds / 60);
                seconds = seconds % 60;
                if (minutes >= 60) {
                    hours += Math.floor(minutes / 60);
                    minutes = minutes % 60;
                }
            }
            timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            updateTimerRatios();
        }, 1000);
    } else {
        button.style.backgroundImage = 'url("../pictures/play.png")';
        clearInterval(timerBlock.timerInterval);
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
