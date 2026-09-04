const API_URL = "https://studyhub-8wpu.onrender.com";


// =========================
// REGISTER
// =========================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        // Password check
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {

            const response = await fetch(`${API_URL}/register`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            alert(result.message);

            // Registration successful
            if (response.ok) {
                window.location.href = "login.html";
            }

        } catch (error) {

            console.error("Register Error:", error);

            alert("Unable to connect to backend!");
        }
    });
}



// =========================
// LOGIN
// =========================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {

            const response = await fetch(`${API_URL}/login`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                // VERY IMPORTANT
                credentials: "include",

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            alert(result.message);

            if (response.ok) {

                console.log("Logged in user:", result.user);

                // Go to dashboard
                window.location.href = "dashboard.html";
            }

        } catch (error) {

            console.error("Login Error:", error);

            alert("Unable to connect to backend!");
        }
    });
}



// =========================
// DASHBOARD
// =========================

const userNameElement =
    document.getElementById("userName");

const userEmailElement =
    document.getElementById("userEmail");


if (userNameElement || userEmailElement) {

    async function loadUser() {

        try {

            const response = await fetch(
                `${API_URL}/me`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );


            if (!response.ok) {

                console.log(
                    "User is not logged in."
                );

                window.location.href =
                    "login.html";

                return;
            }


            const user =
                await response.json();


            console.log(
                "Current user:",
                user
            );


            // Show user name
            if (userNameElement) {

                userNameElement.textContent =
                    user.name;

            }


            // Show user email
            if (userEmailElement) {

                userEmailElement.textContent =
                    user.email;

            }


            // =========================
            // UPLOAD PERMISSION
            // =========================

            const uploadLinks =
                document.querySelectorAll(
                    'a[href="upload.html"]'
                );


            uploadLinks.forEach(link => {

                if (!user.can_upload) {

                    link.style.display =
                        "none";

                } else {

                    link.style.display =
                        "inline-block";

                }

            });

        } catch (error) {

            console.error(
                "Dashboard Error:",
                error
            );

            alert(
                "Unable to connect to backend!"
            );

        }
    }


    loadUser();

}



// =========================
// LOGOUT
// =========================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async function (event) {

        event.preventDefault();

        try {

            const response = await fetch(`${API_URL}/logout`, {
                method: "POST",

                credentials: "include"
            });

            const result = await response.json();

            alert(result.message);

            if (response.ok) {

                window.location.href = "login.html";
            }

        } catch (error) {

            console.error("Logout Error:", error);

            alert("Unable to connect to backend!");
        }
    });
}

// =========================
// UPLOAD CONTENT
// =========================

const uploadForm = document.getElementById("uploadForm");

if (uploadForm) {

    uploadForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const title = document.getElementById("title").value.trim();
        const subject = document.getElementById("subject").value.trim();
        const description =
            document.getElementById("description").value.trim();

        const fileInput = document.getElementById("file");
        const file = fileInput.files[0];

        const message = document.getElementById("uploadMessage");


        // Check file
        if (!file) {

            message.textContent = "Please select a file.";

            return;
        }


        // Create FormData
        const formData = new FormData();

        formData.append("title", title);
        formData.append("subject", subject);
        formData.append("description", description);
        formData.append("file", file);


        try {

            message.textContent = "Uploading...";


            const response = await fetch(
                `${API_URL}/upload`,
                {
                    method: "POST",
                    credentials: "include",
                    body: formData
                }
            );


            const result = await response.json();


            message.textContent = result.message;


            if (response.ok) {

                uploadForm.reset();

            }


        } catch (error) {

            console.error("Upload Error:", error);

            message.textContent =
                "Unable to connect to backend!";

        }

    });

}

// =========================
// LOAD STUDY MATERIAL
// =========================

const materialContainer =
    document.getElementById("materialContainer");

const materialSearch =
    document.getElementById("materialSearch");

const subjectFilter =
    document.getElementById("subjectFilter");


if (materialContainer) {

    let allMaterials = [];
    let currentUserRole = "";


    // =========================
    // GET CURRENT USER
    // =========================

    async function getCurrentUser() {

        try {

            const response = await fetch(
                `${API_URL}/me`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            if (response.ok) {

                const user =
                    await response.json();

                currentUserRole =
                    user.role || "";

            }

        } catch (error) {

            console.error(
                "User Error:",
                error
            );

        }

    }


    // =========================
    // LOAD MATERIAL
    // =========================

    async function loadStudyMaterial() {

        try {

            const response = await fetch(
                `${API_URL}/study-material`
            );

            const materials =
                await response.json();


            if (!response.ok) {

                materialContainer.innerHTML =
                    "<p>Unable to load study material.</p>";

                return;

            }


            allMaterials = materials;

            loadSubjects(materials);

            displayMaterials(materials);


        } catch (error) {

            console.error(
                "Material Error:",
                error
            );

            materialContainer.innerHTML =
                "<p>Unable to connect to backend.</p>";

        }

    }


    // =========================
    // LOAD SUBJECTS
    // =========================

    function loadSubjects(materials) {

        subjectFilter.innerHTML = `
            <option value="all">
                All Subjects
            </option>
        `;


        const subjects = [
            ...new Set(
                materials.map(
                    material => material.subject
                )
            )
        ];


        subjects.forEach(subject => {

            const option =
                document.createElement("option");

            option.value = subject;

            option.textContent = subject;

            subjectFilter.appendChild(option);

        });

    }


    // =========================
    // DISPLAY MATERIALS
    // =========================

    function displayMaterials(materials) {

        if (materials.length === 0) {

            materialContainer.innerHTML =
                "<p>No study material found.</p>";

            return;

        }


        materialContainer.innerHTML = "";


        materials.forEach(material => {

            const extension =
                material.file_path
                    .split(".")
                    .pop()
                    .toLowerCase();


            const fileURL =
                `${API_URL}/files/${encodeURIComponent(
                    material.file_path
                )}`;


            let media = "";


            if (extension === "pdf") {

                media = `
                    <a
                        href="${fileURL}"
                        target="_blank"
                        class="material-btn"
                    >
                        📄 Open PDF
                    </a>
                `;

            } else {

                media = `
                    <a
                        href="${fileURL}"
                        target="_blank"
                        class="material-btn"
                    >
                        🎥 Watch Video
                    </a>
                `;

            }


            let deleteButton = "";


            if (currentUserRole === "admin") {

                deleteButton = `
                    <button
                        class="delete-material-btn"
                        data-id="${material.id}"
                    >
                        🗑️ Delete
                    </button>
                `;

            }


            const card =
                document.createElement("div");


            card.className =
                "material-card";


            card.innerHTML = `

                <div class="material-icon">
                    📚
                </div>

                <h2>
                    ${material.title}
                </h2>

                <span class="material-subject">
                    ${material.subject}
                </span>

                <p>
                    ${material.description || ""}
                </p>

                <small>
                    Uploaded by:
                    ${material.uploader_name || "Unknown"}
                </small>

                ${media}

                ${deleteButton}

            `;


            materialContainer.appendChild(card);

        });


        // Delete buttons
        const deleteButtons =
            document.querySelectorAll(
                ".delete-material-btn"
            );


        deleteButtons.forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const materialId =
                        this.dataset.id;

                    deleteMaterial(materialId);

                }
            );

        });

    }


    // =========================
    // DELETE MATERIAL
    // =========================

    async function deleteMaterial(materialId) {

        const confirmDelete =
            confirm(
                "Are you sure you want to delete this material?"
            );


        if (!confirmDelete) {

            return;

        }


        try {

            const response =
                await fetch(
                    `${API_URL}/delete-material/${materialId}`,
                    {
                        method: "DELETE",
                        credentials: "include"
                    }
                );


            const result =
                await response.json();


            alert(result.message);


            if (response.ok) {

                await loadStudyMaterial();

            }


        } catch (error) {

            console.error(
                "Delete Error:",
                error
            );

            alert(
                "Unable to connect to backend!"
            );

        }

    }


    // =========================
    // SEARCH
    // =========================

    if (materialSearch) {

        materialSearch.addEventListener(
            "input",
            filterMaterials
        );

    }


    // =========================
    // SUBJECT FILTER
    // =========================

    if (subjectFilter) {

        subjectFilter.addEventListener(
            "change",
            filterMaterials
        );

    }


    // =========================
    // FILTER
    // =========================

    function filterMaterials() {

        const searchText =
            materialSearch.value
                .toLowerCase()
                .trim();


        const selectedSubject =
            subjectFilter.value;


        const filteredMaterials =
            allMaterials.filter(material => {

                const title =
                    material.title
                        .toLowerCase();


                const description =
                    (
                        material.description || ""
                    ).toLowerCase();


                const subject =
                    material.subject
                        .toLowerCase();


                const matchesSearch =
                    title.includes(searchText) ||
                    description.includes(searchText) ||
                    subject.includes(searchText);


                const matchesSubject =
                    selectedSubject === "all" ||
                    material.subject === selectedSubject;


                return (
                    matchesSearch &&
                    matchesSubject
                );

            });


        displayMaterials(filteredMaterials);

    }


    // =========================
    // START
    // =========================

    async function startStudyMaterial() {

        await getCurrentUser();

        await loadStudyMaterial();

    }


    startStudyMaterial();

}

// =========================
// LIGHT / DARK MODE
// =========================

const themeToggle =
    document.getElementById("themeToggle");


// Load saved theme

const savedTheme =
    localStorage.getItem("studyhub-theme");


if (savedTheme === "dark") {

    document.body.classList.add("dark-mode");

}


function updateThemeButton() {

    if (!themeToggle) {
        return;
    }


    if (document.body.classList.contains("dark-mode")) {

        themeToggle.textContent =
            "☀️ Light Mode";

    } else {

        themeToggle.textContent =
            "🌙 Dark Mode";

    }

}


updateThemeButton();


if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "dark-mode"
            );


            const isDark =
                document.body.classList.contains(
                    "dark-mode"
                );


            if (isDark) {

                localStorage.setItem(
                    "studyhub-theme",
                    "dark"
                );

            } else {

                localStorage.setItem(
                    "studyhub-theme",
                    "light"
                );

            }


            updateThemeButton();

        }
    );

}