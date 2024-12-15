// Get references to elements
const codeInput = document.getElementById("codeInput");
const message = document.getElementById("message");
const submitButton = document.getElementById("submitCode");
const contentWrapper = document.querySelector(".content-wrapper");

// Code-to-URL mapping
const codeMap = {
    "nano": "nano.html", // Add more codes and URLs here
    "life": "life.html",
    "human": "human.html",
    "fusion": "fusion.html"
};

// Function to handle code submission
function handleSubmit() {
    const inputCode = codeInput.value.trim().toLowerCase(); // Normalize input

    if (codeMap[inputCode]) {
        // Code found - redirect to the mapped URL
        message.textContent = "Contraseña reconocida.";
        message.style.color = "#4dff4d"; // Success green color
        setTimeout(() => {
            window.location.href = codeMap[inputCode]; // Redirect to the mapped URL
        }, 1000); // Redirect after 1 second
    } else {
        // Incorrect code - scary effect
        message.textContent = "Contraseña incorrecta.";
        message.style.color = "#ff4d4d"; // Error red color

        // Shake effect
        contentWrapper.classList.add("shake");

        // Clear the input after 1 second and remove the shake
        setTimeout(() => {
            codeInput.value = "";
            contentWrapper.classList.remove("shake");
        }, 1000);
    }
}

// Add click event listener for submit button
submitButton.addEventListener("click", handleSubmit);

// Add keypress event listener for Enter key in the input field
codeInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent default form submission if necessary
        handleSubmit(); // Call the submit function
    }
});