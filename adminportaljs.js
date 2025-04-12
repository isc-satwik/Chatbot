<<<<<<< HEAD
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
=======
// Admin Portal JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Fetch complaints data
    fetchComplaints();

    // Set up event listeners
    document.querySelectorAll('.department-list li').forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            document.querySelectorAll('.department-list li').forEach(el => {
                el.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Filter complaints by department
            const department = this.getAttribute('data-department');
            filterComplaintsByDepartment(department);
        });
    });

    // Set up search functionality
    document.getElementById('search-btn').addEventListener('click', function() {
        const searchTerm = document.getElementById('search-input').value.trim();
        searchComplaints(searchTerm);
    });

    // Set up status filter
    document.getElementById('status-filter').addEventListener('change', function() {
        const status = this.value;
        filterComplaintsByStatus(status);
    });
});

// Fetch complaints from backend
function fetchComplaints() {
    // This would be an API call in a real application
    fetch('/api/complaints')
        .then(response => response.json())
        .then(data => {
            displayComplaints(data);
        })
        .catch(error => {
            console.error('Error fetching complaints:', error);
            // For demo purposes, load mock data
            loadMockData();
        });
}

// Load mock data for demonstration
function loadMockData() {
    const mockComplaints = [
        {
            id: "GR-2023-001",
            title: "Internet Connection Issue",
            description: "The internet connection in the marketing department has been unstable for the past 3 days.",
            department: "IT",
            status: "In Progress",
            date: "2023-07-10",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-002",
            title: "Office Light Malfunction",
            description: "The lights in conference room B are flickering continuously and need replacement.",
            department: "Electrical",
            status: "Pending",
            date: "2023-07-11",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-003",
            title: "Broken Chair",
            description: "My office chair (cubicle 23) has a broken armrest and needs replacement or repair.",
            department: "Maintenance",
            status: "Resolved",
            date: "2023-07-09",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-004",
            title: "Salary Discrepancy",
            description: "My last month's salary calculation seems incorrect. Can someone from finance review it?",
            department: "Finance",
            status: "In Progress",
            date: "2023-07-12",
            hasImage: false,
            imageVerified: false
        },
        {
            id: "GR-2023-005",
            title: "Water Leakage",
            description: "There's water leaking from the ceiling in the corridor near the HR department.",
            department: "Civil",
            status: "Pending",
            date: "2023-07-13",
            hasImage: true,
            imageVerified: true
        }
    ];
    
    displayComplaints(mockComplaints);
}

// Display complaints in the table
function displayComplaints(complaints) {
    const tableBody = document.querySelector('.complaints-table tbody');
    tableBody.innerHTML = '';
    
    complaints.forEach(complaint => {
        const row = document.createElement('tr');
        
        const statusClass = complaint.status.toLowerCase().replace(' ', '-');
        
        row.innerHTML = `
            <td>${complaint.id}</td>
            <td>${complaint.title}</td>
            <td>${complaint.department}</td>
            <td><span class="status status-${statusClass}">${complaint.status}</span></td>
            <td>${complaint.date}</td>
            <td>${complaint.hasImage ? 'Yes' : 'No'}</td>
            <td>
                <div class="action-buttons">
                    <button class="view-btn" data-id="${complaint.id}">View</button>
                    <button class="update-btn" data-id="${complaint.id}">Update</button>
                </div>
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
    
    // Add event listeners to update buttons
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-id');
            showUpdateStatusForm(complaintId);
        });
    });
}

// Filter complaints by department
function filterComplaintsByDepartment(department) {
    if (department === 'all') {
        fetchComplaints();
        return;
    }
    
    // In a real app, this would be an API call with query parameters
    fetch(`/api/complaints?department=${department}`)
        .then(response => response.json())
        .then(data => {
            displayComplaints(data);
        })
        .catch(error => {
            console.error('Error filtering complaints:', error);
            // Filter mock data for demonstration
            filterMockDataByDepartment(department);
        });
}

// Filter mock data by department
function filterMockDataByDepartment(department) {
    const mockComplaints = [
        {
            id: "GR-2023-001",
            title: "Internet Connection Issue",
            description: "The internet connection in the marketing department has been unstable for the past 3 days.",
            department: "IT",
            status: "In Progress",
            date: "2023-07-10",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-002",
            title: "Office Light Malfunction",
            description: "The lights in conference room B are flickering continuously and need replacement.",
            department: "Electrical",
            status: "Pending",
            date: "2023-07-11",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-003",
            title: "Broken Chair",
            description: "My office chair (cubicle 23) has a broken armrest and needs replacement or repair.",
            department: "Maintenance",
            status: "Resolved",
            date: "2023-07-09",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-004",
            title: "Salary Discrepancy",
            description: "My last month's salary calculation seems incorrect. Can someone from finance review it?",
            department: "Finance",
            status: "In Progress",
            date: "2023-07-12",
            hasImage: false,
            imageVerified: false
        },
        {
            id: "GR-2023-005",
            title: "Water Leakage",
            description: "There's water leaking from the ceiling in the corridor near the HR department.",
            department: "Civil",
            status: "Pending",
            date: "2023-07-13",
            hasImage: true,
            imageVerified: true
        }
    ];
    
    const filteredComplaints = department === 'all' 
        ? mockComplaints 
        : mockComplaints.filter(complaint => complaint.department === department);
    
    displayComplaints(filteredComplaints);
}

// Filter complaints by status
function filterComplaintsByStatus(status) {
    if (status === 'all') {
        fetchComplaints();
        return;
    }
    
    // In a real app, this would be an API call with query parameters
    fetch(`/api/complaints?status=${status}`)
        .then(response => response.json())
        .then(data => {
            displayComplaints(data);
        })
        .catch(error => {
            console.error('Error filtering complaints:', error);
            // Filter mock data for demonstration
            filterMockDataByStatus(status);
        });
}

// Filter mock data by status
function filterMockDataByStatus(status) {
    const mockComplaints = [
        {
            id: "GR-2023-001",
            title: "Internet Connection Issue",
            description: "The internet connection in the marketing department has been unstable for the past 3 days.",
            department: "IT",
            status: "In Progress",
            date: "2023-07-10",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-002",
            title: "Office Light Malfunction",
            description: "The lights in conference room B are flickering continuously and need replacement.",
            department: "Electrical",
            status: "Pending",
            date: "2023-07-11",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-003",
            title: "Broken Chair",
            description: "My office chair (cubicle 23) has a broken armrest and needs replacement or repair.",
            department: "Maintenance",
            status: "Resolved",
            date: "2023-07-09",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-004",
            title: "Salary Discrepancy",
            description: "My last month's salary calculation seems incorrect. Can someone from finance review it?",
            department: "Finance",
            status: "In Progress",
            date: "2023-07-12",
            hasImage: false,
            imageVerified: false
        },
        {
            id: "GR-2023-005",
            title: "Water Leakage",
            description: "There's water leaking from the ceiling in the corridor near the HR department.",
            department: "Civil",
            status: "Pending",
            date: "2023-07-13",
            hasImage: true,
            imageVerified: true
        }
    ];
    
    const filteredComplaints = status === 'all' 
        ? mockComplaints 
        : mockComplaints.filter(complaint => complaint.status === status);
    
    displayComplaints(filteredComplaints);
}

// Search complaints
function searchComplaints(searchTerm) {
    if (!searchTerm) {
        fetchComplaints();
        return;
    }
    
    // In a real app, this would be an API call with query parameters
    fetch(`/api/complaints?search=${searchTerm}`)
        .then(response => response.json())
        .then(data => {
            displayComplaints(data);
        })
        .catch(error => {
            console.error('Error searching complaints:', error);
            // Search mock data for demonstration
            searchMockData(searchTerm);
        });
}

// Search mock data
function searchMockData(searchTerm) {
    const mockComplaints = [
        {
            id: "GR-2023-001",
            title: "Internet Connection Issue",
            description: "The internet connection in the marketing department has been unstable for the past 3 days.",
            department: "IT",
            status: "In Progress",
            date: "2023-07-10",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-002",
            title: "Office Light Malfunction",
            description: "The lights in conference room B are flickering continuously and need replacement.",
            department: "Electrical",
            status: "Pending",
            date: "2023-07-11",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-003",
            title: "Broken Chair",
            description: "My office chair (cubicle 23) has a broken armrest and needs replacement or repair.",
            department: "Maintenance",
            status: "Resolved",
            date: "2023-07-09",
            hasImage: true,
            imageVerified: true
        },
        {
            id: "GR-2023-004",
            title: "Salary Discrepancy",
            description: "My last month's salary calculation seems incorrect. Can someone from finance review it?",
            department: "Finance",
            status: "In Progress",
            date: "2023-07-12",
            hasImage: false,
            imageVerified: false
        },
        {
            id: "GR-2023-005",
            title: "Water Leakage",
            description: "There's water leaking from the ceiling in the corridor near the HR department.",
            department: "Civil",
            status: "Pending",
            date: "2023-07-13",
            hasImage: true,
            imageVerified: true
        }
    ];
    
    const filteredComplaints = mockComplaints.filter(complaint => 
        complaint.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    displayComplaints(filteredComplaints);
}

// View complaint details
function viewComplaintDetails(complaintId) {
    // In a real app, this would be an API call to get full complaint details
    fetch(`/api/complaints/${complaintId}`)
        .then(response => response.json())
        .then(data => {
            showComplaintDetail(data);
        })
        .catch(error => {
            console.error('Error fetching complaint details:', error);
            // Show mock data for demonstration
            showMockComplaintDetail(complaintId);
        });
}

// Show mock complaint detail
function showMockComplaintDetail(complaintId) {
    const mockComplaints = {
        "GR-2023-001": {
            id: "GR-2023-001",
            title: "Internet Connection Issue",
            description: "The internet connection in the marketing department has been unstable for the past 3 days. It disconnects randomly and affects our work.",
            department: "IT",
            status: "In Progress",
            date: "2023-07-10",
            submittedBy: "John Smith",
            email: "john.smith@example.com",
            assignedTo: "Tech Support Team",
            hasImage: true,
            imageVerified: true,
            updates: [
                { date: "2023-07-10", status: "Pending", comment: "Complaint registered" },
                { date: "2023-07-11", status: "In Progress", comment: "Assigned to tech team" }
            ]
        },
        "GR-2023-002": {
            id: "GR-2023-002",
            title: "Office Light Malfunction",
            description: "The lights in conference room B are flickering continuously and need replacement.",
            department: "Electrical",
            status: "Pending",
            date: "2023-07-11",
            submittedBy: "Sarah Johnson",
            email: "sarah.j@example.com",
            assignedTo: "Maintenance Team",
            hasImage: true,
            imageVerified: true,
            updates: [
                { date: "2023-07-11", status: "Pending", comment: "Complaint registered" }
            ]
        },
        "GR-2023-003": {
            id: "GR-2023-003",
            title: "Broken Chair",
            description: "My office chair (cubicle 23) has a broken armrest and needs replacement or repair.",
            department: "Maintenance",
            status: "Resolved",
            date: "2023-07-09",
            submittedBy: "Mike Brown",
            email: "mike.b@example.com",
            assignedTo: "Facilities Team",
            hasImage: true,
            imageVerified: true,
            updates: [
                { date: "2023-07-09", status: "Pending", comment: "Complaint registered" },
                { date: "2023-07-10", status: "In Progress", comment: "Scheduled for inspection" },
                { date: "2023-07-12", status: "Resolved", comment: "Chair replaced with new one" }
            ]
        },
        "GR-2023-004": {
            id: "GR-2023-004",
            title: "Salary Discrepancy",
            description: "My last month's salary calculation seems incorrect. Can someone from finance review it?",
            department: "Finance",
            status: "In Progress",
            date: "2023-07-12",
            submittedBy: "Emily Davis",
            email: "emily.d@example.com",
            assignedTo: "Payroll Team",
            hasImage: false,
            imageVerified: false,
            updates: [
                { date: "2023-07-12", status: "Pending", comment: "Complaint registered" },
                { date: "2023-07-13", status: "In Progress", comment: "Under review by finance department" }
            ]
        },
        "GR-2023-005": {
            id: "GR-2023-005",
            title: "Water Leakage",
            description: "There's water leaking from the ceiling in the corridor near the HR department.",
            department: "Civil",
            status: "Pending",
            date: "2023-07-13",
            submittedBy: "David Wilson",
            email: "david.w@example.com",
            assignedTo: "Unassigned",
            hasImage: true,
            imageVerified: true,
            updates: [
                { date: "2023-07-13", status: "Pending", comment: "Complaint registered" }
            ]
        }
    };
    
    const complaint = mockComplaints[complaintId];
    if (complaint) {
        showComplaintDetail(complaint);
    } else {
        alert(`Complaint with ID ${complaintId} not found.`);
    }
}

// Show complaint detail view
function showComplaintDetail(complaint) {
    // Hide complaints table
    document.querySelector('.complaints-table-container').style.display = 'none';
    
    // Show complaint detail section
    const detailSection = document.querySelector('.complaint-detail');
    detailSection.style.display = 'block';
    
    // Populate complaint details
    document.getElementById('detail-id').textContent = complaint.id;
    document.getElementById('detail-title').textContent = complaint.title;
    document.getElementById('detail-description').textContent = complaint.description;
    document.getElementById('detail-department').textContent = complaint.department;
    document.getElementById('detail-status').textContent = complaint.status;
    document.getElementById('detail-date').textContent = complaint.date;
    document.getElementById('detail-submitter').textContent = complaint.submittedBy;
    document.getElementById('detail-email').textContent = complaint.email;
    document.getElementById('detail-assigned').textContent = complaint.assignedTo;
    
    // Handle image section
    const imageSection = document.querySelector('.image-section');
    if (complaint.hasImage && complaint.imageVerified) {
        imageSection.innerHTML = `
            <h4>Attached Image:</h4>
            <img src="/api/complaints/${complaint.id}/image" alt="Complaint Image">
            <p class="verified">✓ Image verified as relevant</p>
        `;
    } else if (complaint.hasImage && !complaint.imageVerified) {
        imageSection.innerHTML = `
            <h4>Attached Image:</h4>
            <img src="/api/complaints/${complaint.id}/image" alt="Complaint Image">
            <p class="unverified">⚠ Image not verified as relevant</p>
        `;
    } else {
        imageSection.innerHTML = '<p>No image attached</p>';
    }
    
    // Populate status history
    const historyList = document.getElementById('status-history');
    historyList.innerHTML = '';
    
    complaint.updates.forEach(update => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>${update.date}:</strong> Status changed to <span class="status">${update.status}</span>
            <p>${update.comment}</p>
        `;
        historyList.appendChild(listItem);
    });
    
    // Set up back button
    document.getElementById('back-to-list').addEventListener('click', function() {
        detailSection.style.display = 'none';
        document.querySelector('.complaints-table-container').style.display = 'block';
    });
    
    // Set up update status form
    const updateForm = document.querySelector('.status-update');
    updateForm.innerHTML = `
        <h4>Update Status</h4>
        <select id="new-status">
            <option value="">Select new status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
        </select>
        <input type="text" id="status-comment" placeholder="Add a comment">
        <button id="update-status-btn" data-id="${complaint.id}">Update Status</button>
    `;
    
    document.getElementById('update-status-btn').addEventListener('click', function() {
        const newStatus = document.getElementById('new-status').value;
        const comment = document.getElementById('status-comment').value;
        const complaintId = this.getAttribute('data-id');
        
        if (!newStatus) {
            alert('Please select a status');
            return;
        }
        
        updateComplaintStatus(complaintId, newStatus, comment);
    });
}

// Show update status form
function showUpdateStatusForm(complaintId) {
    viewComplaintDetails(complaintId);
    
    // Scroll to update form
    setTimeout(() => {
        document.querySelector('.status-update').scrollIntoView({ behavior: 'smooth' });
    }, 500);
}

// Update complaint status
function updateComplaintStatus(complaintId, newStatus, comment) {
    // In a real app, this would be an API call to update status
    const updateData = {
        status: newStatus,
        comment: comment || `Status updated to ${newStatus}`
    };
    
    fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    })
    .then(response => response.json())
    .then(data => {
        alert(`Complaint ${complaintId} status updated to ${newStatus}`);
        viewComplaintDetails(complaintId); // Refresh the details view
    })
    .catch(error => {
        console.error('Error updating complaint status:', error);
        // Mock update for demonstration
        alert(`Complaint ${complaintId} status updated to ${newStatus} (Mock)`);
        
        // Refresh the view after mock update
        setTimeout(() => {
            viewComplaintDetails(complaintId);
        }, 500);
    });
}
>>>>>>> origin/main
