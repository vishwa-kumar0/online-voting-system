const API = "http://localhost:5000";

// ----------------------
// Register Voter
// ----------------------
async function registerVoter() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!name || !email) {
        alert("Please fill all fields");
        return;
    }

    try {
        const res = await fetch(API + "/voters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email })
        });

        const data = await res.json();

        if (res.ok) {
            // Show success message with option to proceed to voting
            showRegistrationSuccess(name, email);
        } else {
            alert(data.message || "Registration failed");
        }

    } catch (error) {
        alert("Error registering voter");
    }
}

// Show success message with voting option
function showRegistrationSuccess(name, email) {
    const container = document.querySelector('.container');

    // Create success message
    const successDiv = document.createElement('div');
    successDiv.id = 'registration-success';
    successDiv.style.cssText = `
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 20px;
        border-radius: 10px;
        margin-top: 20px;
        text-align: center;
        animation: fadeIn 0.5s ease-in;
    `;

    successDiv.innerHTML = `
        <h3>✅ Registration Successful!</h3>
        <p>Welcome <strong>${name}</strong>! You have been registered with email: <strong>${email}</strong></p>
        <p>You can now cast your vote in the election.</p>
        <button onclick="goToVoting()" style="
            background: white;
            color: #28a745;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 15px;
            transition: all 0.3s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🗳️ Proceed to Vote
        </button>
    `;

    // Add fade-in animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Hide the registration form and show success message
    const formElements = container.querySelectorAll('input, button');
    formElements.forEach(el => {
        if (el.type !== 'button' || !el.onclick || el.onclick.toString().includes('registerVoter')) {
            el.style.display = 'none';
        }
    });

    // Hide h1 if it exists
    const h1 = document.querySelector('h1');
    if (h1) h1.style.display = 'none';

    container.appendChild(successDiv);

    // Clear inputs
    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
}

// Function to navigate to voting page
function goToVoting() {
    window.location.href = 'vote.html';
}

// ----------------------
// Vote
// ----------------------
async function vote() {
    const email = document.getElementById("voterEmail").value.trim();
    const candidate = document.getElementById("candidate").value;

    if (!email) {
        alert("Enter your email");
        return;
    }

    try {
        const res = await fetch(API + "/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, candidate })
        });

        const data = await res.json();
        alert(data.message);

        // Refresh results after voting
        getResults();

    } catch (error) {
        alert("Voting failed");
    }
}

// ----------------------
// Get Results
// ----------------------
async function getResults() {
    try {
        const res = await fetch(API + "/results");
        const data = await res.json();

        const list = document.getElementById("results");
        list.innerHTML = "";

        if (data.length === 0) {
            list.innerHTML = "<li>No results yet</li>";
            return;
        }

        data.forEach(c => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${c.name}</span>
                <strong>${c.votes} votes</strong>
            `;
            list.appendChild(li);
        });

    } catch (error) {
        console.log(error);
    }
}

// ----------------------
// 🔄 Auto Load Results
// ----------------------
window.onload = getResults;