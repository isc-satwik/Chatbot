// Admin Portal JavaScript
document.addEventListener('DOMContentLoaded', function () {
    // Set up login functionality
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    // Set up logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            document.getElementById('dashboard-section').style.display = 'none';
            document.getElementById('login-section').style.display = 'flex';
            // Clear any existing data
            const tableBody = document.getElementById('complaints-list');
            if (tableBody) {
                tableBody.innerHTML = '';
            }
        });
    }

    // Set up sidebar navigation
    const sidebarItems = document.querySelectorAll(".sidebar ul li");
    sidebarItems.forEach(item => {
        item.addEventListener("click", function () {
            // Remove 'active' from all sidebar items
            sidebarItems.forEach(i => i.classList.remove("active"));
            this.classList.add("active");

            // Hide all sections
            const sections = document.querySelectorAll(".dashboard-section");
            sections.forEach(section => section.classList.remove("active"));

            // Get corresponding section id and show it
            const sectionId = this.getAttribute('data-section') + "-section";
            const activeSection = document.getElementById(sectionId);
            if (activeSection) {
                activeSection.classList.add("active");
            }

            if (sectionId === 'departments-section') {
                loadDepartments(); // Load departments when the section is activated
            }
        });
    });

    // Check if user is already logged in
    //checkLoginStatus();
});

// Check if user is already logged in
function checkLoginStatus() {
    fetch('http://localhost:5000/api/admin/check-auth', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // User is logged in, show dashboard
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            document.getElementById('admin-name').textContent = data.username;
            // Load data after confirming login
            loadComplaints();
            loadDepartments();
        } else {
            // User is not logged in, show login form
            document.getElementById('login-section').style.display = 'flex';
            document.getElementById('dashboard-section').style.display = 'none';
        }
    })
    .catch(error => {
        console.error('Error checking login status:', error);
        // Default to showing login form
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('dashboard-section').style.display = 'none';
    });
}

// Handle login
function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }

    fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            document.getElementById('admin-name').textContent = username;
            loadComplaints();
            loadDepartments();
        } else {
            showLoginError(data.message || 'Login failed');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showLoginError('Login failed. Please try again.');
    });
}

// Helper function to show login error
function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Load complaints from backend
function loadComplaints() {
    const tableBody = document.getElementById('complaints-list');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6">Loading complaints...</td></tr>';
    }

    fetch('http://localhost:5000/api/admin/complaints', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && Array.isArray(data.complaints)) {
            displayComplaints(data.complaints);
        } else {
            console.error('Failed to load complaints:', data.message || 'Invalid data format');
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6">Error: ${data.message || 'Invalid data format'}</td></tr>`;
            }
        }
    })
    .catch(error => {
        console.error('Error loading complaints:', error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6">Error connecting to server: ${error.message}</td></tr>`;
        }
    });
}

// Load departments from backend
function loadDepartments() {
    const departmentsGrid = document.getElementById('departments-grid');
    if (!departmentsGrid) return;

    fetch('http://localhost:5000/api/departments', {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                departmentsGrid.innerHTML = ''; // Clear existing content
                data.departments.forEach(department => {
                    const departmentCard = document.createElement('div');
                    departmentCard.className = 'department-card';
                    departmentCard.innerHTML = `
                        <h3>${department.name}</h3>
                        <p>Department ID: ${department.id}</p>
                    `;
                    departmentsGrid.appendChild(departmentCard);
                });
            } else {
                console.error('Failed to load departments:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading departments:', error);
        });
}

// Display complaints in the table
function displayComplaints(complaints) {
    const tableBody = document.getElementById('complaints-list');
    if (!tableBody) {
        console.error('Complaints table body not found');
        return;
    }

    tableBody.innerHTML = '';

    if (!Array.isArray(complaints) || complaints.length === 0) {
        const noComplaintsDiv = document.getElementById('no-complaints');
        if (noComplaintsDiv) {
            noComplaintsDiv.style.display = 'flex';
        }
        return;
    }

    const noComplaintsDiv = document.getElementById('no-complaints');
    if (noComplaintsDiv) {
        noComplaintsDiv.style.display = 'none';
    }

    complaints.forEach(complaint => {
        const row = document.createElement('tr');
        const statusClass = complaint.status.toLowerCase().replace(' ', '-');
        
        // Format the date
        const createdAt = new Date(complaint.created_at);
        const formattedDate = createdAt.toLocaleDateString() + ' ' + createdAt.toLocaleTimeString();

        row.innerHTML = `
            <td>${complaint.ticket_number || 'N/A'}</td>
            <td>${complaint.department_name || 'N/A'}</td>
            <td>${complaint.user_name || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td><span class="status status-${statusClass}">${complaint.status}</span></td>
            <td>
                <button class="btn view-btn" data-id="${complaint.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-id');
            viewComplaintDetails(complaintId);
        });
    });
}

// View complaint details in modal
function viewComplaintDetails(complaintId) {
    fetch(`http://localhost:5000/api/admin/complaints/${complaintId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const complaint = data.complaint;
                document.getElementById('modal-ticket').textContent = `Ticket #${complaint.ticket_number}`;
                document.getElementById('modal-status').textContent = complaint.status;
                document.getElementById('modal-user').textContent = complaint.user_name;
                document.getElementById('modal-email').textContent = complaint.email;
                document.getElementById('modal-department').textContent = complaint.department;
                document.getElementById('modal-date').textContent = new Date(complaint.created_at).toLocaleDateString();
                document.getElementById('modal-description').textContent = complaint.description;
                
                // Handle image if exists
                const imageContainer = document.getElementById('modal-image-container');
                const imageElement = document.getElementById('modal-image');
                if (complaint.image_url) {
                    imageElement.src = complaint.image_url;
                    imageContainer.style.display = 'block';
                } else {
                    imageContainer.style.display = 'none';
                }

                // Set current status in select
                document.getElementById('update-status-select').value = complaint.status;
                
                // Show modal
                document.getElementById('complaint-modal').style.display = 'flex';
            } else {
                console.error('Failed to load complaint details:', data.message);
            }
        })
        .catch(error => {
            console.error('Error loading complaint details:', error);
        });
}

// Initialize charts
function initializeCharts() {
    // Department chart
    const deptCtx = document.getElementById('dept-chart').getContext('2d');
    new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Complaints by Department',
                data: [],
                backgroundColor: '#2e86de'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Status chart
    const statusCtx = document.getElementById('status-chart').getContext('2d');
    new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Pending', 'In Progress', 'Resolved'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#f39c12', '#2980b9', '#27ae60']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Update complaint status
document.getElementById('update-status-btn').addEventListener('click', function() {
    const complaintId = document.querySelector('.view-btn.active')?.getAttribute('data-id');
    const newStatus = document.getElementById('update-status-select').value;
    
    if (!complaintId) return;

    fetch(`http://localhost:5000/api/admin/complaints/${complaintId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal and refresh complaints list
                document.getElementById('complaint-modal').style.display = 'none';
                loadComplaints();
            } else {
                console.error('Failed to update status:', data.message);
            }
        })
        .catch(error => {
            console.error('Error updating status:', error);
        });
});

// Modal close functionality
document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('complaint-modal').style.display = 'none';
});

// Initialize charts when reports section is shown
document.querySelector('[data-section="reports"]').addEventListener('click', function() {
    initializeCharts();
});