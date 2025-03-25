// Array to store history entries
const history = [];

// Function to create a new history entry
export function createHistoryEntry(title, data, timers) {
    const historyContainer = document.getElementById('history-container');

    // Create the entry container
    const entry = document.createElement('div');
    entry.className = 'history-entry';
    entry.style.border = '1px solid white';
    entry.style.padding = '10px';
    entry.style.marginBottom = '10px';
    entry.style.display = 'flex';
    entry.style.justifyContent = 'space-between';
    entry.style.alignItems = 'center';

    // Title field
    const titleField = document.createElement('input');
    titleField.type = 'text';
    titleField.value = title || `Entry ${history.length + 1}`;
    titleField.className = 'history-title';
    titleField.style.flex = '1';
    titleField.style.marginRight = '10px';
    titleField.oninput = () => {
        entryData.title = titleField.value;
    };
    entry.appendChild(titleField);

    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.marginRight = '5px';
    saveButton.onclick = () => {
        entryData.data = JSON.stringify(timers.map(timer => JSON.parse(timer.toJSON())));
        console.log(`Saved data to history entry: ${entryData.title}`);
    };
    entry.appendChild(saveButton);

    // Load button
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load';
    loadButton.style.marginRight = '5px';
    loadButton.onclick = () => {
        if (entryData.data) {
            const timerData = JSON.parse(entryData.data);
            timers.length = 0; // Clear existing timers
            timerData.forEach(data => {
                const timer = Timer.fromJSON(JSON.stringify(data));
                timers.push(timer);
            });
            renderTimers();
            updateTimerRatios();
            console.log(`Loaded data from history entry: ${entryData.title}`);
        } else {
            console.warn('No data to load in this history entry.');
        }
    };
    entry.appendChild(loadButton);

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.style.backgroundImage = 'url("../pictures/trash-bin.png")';
    deleteButton.style.backgroundSize = 'contain';
    deleteButton.style.backgroundRepeat = 'no-repeat';
    deleteButton.style.width = '24px';
    deleteButton.style.height = '24px';
    deleteButton.style.border = 'none';
    deleteButton.style.cursor = 'pointer';
    deleteButton.onclick = () => {
        const index = history.indexOf(entryData);
        if (index > -1) {
            history.splice(index, 1);
            historyContainer.removeChild(entry);
        }
    };
    entry.appendChild(deleteButton);

    // Add the entry to the container
    historyContainer.appendChild(entry);

    // Store the entry in the history array
    const entryData = { title: titleField.value, data: data || null };
    history.push(entryData);
}

// Function to initialize the history container
function initializeHistory() {
    const historyContainer = document.createElement('div');
    historyContainer.id = 'history-container';
    historyContainer.style.position = 'fixed';
    historyContainer.style.bottom = '20px';
    historyContainer.style.left = '20px';
    historyContainer.style.width = '300px';
    historyContainer.style.maxHeight = '50vh';
    historyContainer.style.overflowY = 'auto';
    historyContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    historyContainer.style.color = 'white';
    historyContainer.style.padding = '10px';
    historyContainer.style.border = '1px solid white';
    historyContainer.style.zIndex = '1100';

    document.body.appendChild(historyContainer);
}

// Initialize the history container on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeHistory();
    createHistoryEntry('Initial Entry'); // Example entry
});
