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
        alert(data.message || "✅ Registered Successfully");

        // Clear inputs
        document.getElementById("name").value = "";
        document.getElementById("email").value = "";

    } catch (error) {
        alert("Error registering voter");
    }
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