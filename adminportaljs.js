// Admin Portal JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Set up login functionality
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    // Set up logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            document.getElementById('dashboard-section').style.display = 'none';
            document.getElementById('login-section').style.display = 'flex';
        });
    }

    // Sidebar navigation functionality
    const sidebarItems = document.querySelectorAll('.sidebar ul li');
    const sections = document.querySelectorAll('.dashboard-section');

    sidebarItems.forEach(item => {
        item.addEventListener('click', function () {
            // Remove 'active' class from all sidebar items
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));

            // Show the selected section
            const sectionId = this.getAttribute('data-section') + '-section';
            const activeSection = document.getElementById(sectionId);
            if (activeSection) {
                activeSection.classList.add('active');
            }

            // Trigger specific functions for each section
            if (sectionId === 'departments-section') {
                loadDepartments(); // Load departments dynamically
            } else if (sectionId === 'reports-section') {
                updateReports(); // Update reports and charts
            } else if (sectionId === 'complaints-section') {
                loadComplaints(); // Load complaints dynamically
            }
        });
    });

    // Set up filter functionality
    const departmentFilter = document.getElementById('filter-department');
    if (departmentFilter) {
        departmentFilter.addEventListener('change', function() {
            filterComplaintsByDepartment(this.value);
        });
    }

    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterComplaintsByStatus(this.value);
        });
    }

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = document.getElementById('search-ticket').value.trim();
            searchComplaints(searchTerm);
        });
    }

    // Set up modal functionality
    const modal = document.getElementById('complaint-modal');
    const modalClose = document.querySelector('.modal-header .close');
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Set up status update functionality
    const updateStatusBtn = document.getElementById('update-status-btn');
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-complaint-id');
            const newStatus = document.getElementById('update-status-select').value;
            updateComplaintStatus(complaintId, newStatus);
        });
    }
});

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
        },
        credentials: 'include', // Include cookies in the request
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

            // Update admin name in header
            document.getElementById('admin-name').textContent = username;

            // Load data after successful login
            loadComplaints();
            loadDepartments();
            updateReports();
        } else {
            showLoginError(data.message || 'Login failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
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

// Function to load departments and populate the grid
function loadDepartments() {
    fetch('http://localhost:5000/api/admin/departments', {
        method: 'GET',
        credentials: 'include', // Include cookies in the request
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('Departments:', data.departments);
            const departmentsGrid = document.getElementById('departments-grid');
            departmentsGrid.innerHTML = ''; // Clear existing content

            // Populate departments dynamically
            data.departments.forEach(department => {
                const departmentCard = document.createElement('div');
                departmentCard.classList.add('department-card');
                departmentCard.innerHTML = `
                    <h3>${department.name}</h3>
                    <p>ID: ${department.id}</p>
                `;
                departmentsGrid.appendChild(departmentCard);
            });
        } else {
            console.error('Failed to load departments:', data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Failed to load departments. Please try again.');
    });
}

// Update reports and charts
function updateReports() {
    fetch('http://localhost:5000/api/admin/complaints', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const complaints = data.complaints;
            
            // Count complaints by status
            let pending = 0, inProgress = 0, resolved = 0;
            complaints.forEach(complaint => {
                if (complaint.status === 'Pending') pending++;
                else if (complaint.status === 'In Progress') inProgress++;
                else if (complaint.status === 'Resolved') resolved++;
            });
            
            // Update statistic counts
            document.getElementById('stat-total').textContent = complaints.length;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-progress').textContent = inProgress;
            document.getElementById('stat-resolved').textContent = resolved;
            
            // Create charts if Chart.js is loaded
            if (typeof Chart !== 'undefined') {
                // Count complaints by department
                const deptCounts = {};
                const deptLabels = [];
                const deptData = [];
                const deptColors = [
                    '#3498db', '#2ecc71', '#e74c3c', 
                    '#f39c12', '#9b59b6', '#1abc9c'
                ];
                
                complaints.forEach(complaint => {
                    deptCounts[complaint.department] = (deptCounts[complaint.department] || 0) + 1;
                });
                
                for (const dept in deptCounts) {
                    deptLabels.push(dept);
                    deptData.push(deptCounts[dept]);
                }
                
                // Department chart
                const deptChart = document.getElementById('dept-chart');
                deptChart.innerHTML = '';
                const deptCtx = document.createElement('canvas');
                deptChart.appendChild(deptCtx);
                
                new Chart(deptCtx, {
                    type: 'bar',
                    data: {
                        labels: deptLabels,
                        datasets: [{
                            label: 'Complaints by Department',
                            data: deptData,
                            backgroundColor: deptColors.slice(0, deptLabels.length)
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
                
                // Status chart
                const statusChart = document.getElementById('status-chart');
                statusChart.innerHTML = '';
                const statusCtx = document.createElement('canvas');

                // Set the width and height of the canvas to half the current size
                statusCtx.width = 300; // 300ust a300usted (current size divided by 2)
                statusCtx.height = 300; // 300ust a300usted (current size divided by 2)

                statusChart.appendChild(statusCtx);

                new Chart(statusCtx, {
                    type: 'pie',
                    data: {
                        labels: ['Pending', 'In Progress', 'Resolved'],
                        datasets: [{
                            data: [pending, inProgress, resolved],
                            backgroundColor: [
                                '#f39c12', '#3498db', '#2ecc71'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false // Allow custom dimensions
                    }
                });
            }
        }
    })
    .catch(error => console.error('Error updating reports:', error));
}

// Load complaints from backend
function loadComplaints() {
    console.log("Loading complaints...");

    // Show a loading state
    const tableBody = document.getElementById('complaints-list');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6">Loading complaints...</td></tr>';
    }

    fetch('http://localhost:5000/api/admin/complaints', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("Response status:", response);
        console.log("Response headers:", document.cookie);
        return response.json();
    })
    .then(data => {
        console.log("Complaints data:", data);
        if (data.success) {
            displayComplaints(data.complaints);
        } else {
            console.error('Failed to load complaints:', data.message);
            const tableBody = document.getElementById('complaints-list');
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6">Error: ${data.message}</td></tr>`;
            }
        }
    })
    .catch(error => {
        console.error('Error loading complaints:', error);
        const tableBody = document.getElementById('complaints-list');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6">Error connecting to server</td></tr>`;
        }
    });
}

// Display complaints in the table
function displayComplaints(complaints) {
    const tableBody = document.getElementById('complaints-list');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!complaints || complaints.length === 0) {
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

        row.innerHTML = `
            <td>${complaint.ticket_number}</td>
            <td>${complaint.department}</td>
            <td>${complaint.user_name}</td>
            <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
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

// Display complaint details in modal
function viewComplaintDetails(complaintId) {
    // Find complaint in current data
    fetch(`http://localhost:5000/api/admin/complaints`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const complaint = data.complaints.find(c => c.id == complaintId);
            if (!complaint) return;
            
            // Set modal content
            document.getElementById('modal-ticket').textContent = complaint.ticket_number;
            document.getElementById('modal-status').textContent = complaint.status;
            document.getElementById('modal-status').className = `complaint-status status-${complaint.status.toLowerCase().replace(' ', '-')}`;
            document.getElementById('modal-user').textContent = complaint.user_name;
            document.getElementById('modal-email').textContent = complaint.user_email;
            document.getElementById('modal-department').textContent = complaint.department;
            document.getElementById('modal-date').textContent = new Date(complaint.created_at).toLocaleDateString();
            document.getElementById('modal-description').textContent = complaint.description;
            
            // Set selected status in dropdown
            const statusSelect = document.getElementById('update-status-select');
            if (statusSelect) {
                for (let i = 0; i < statusSelect.options.length; i++) {
                    if (statusSelect.options[i].value === complaint.status) {
                        statusSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Store complaint ID for update
            document.getElementById('update-status-btn').setAttribute('data-complaint-id', complaint.id);
            
            // Show modal
            document.getElementById('complaint-modal').style.display = 'block';
        }
    })
    .catch(error => console.error('Error:', error));
}

// Update complaint status
function updateComplaintStatus(complaintId, newStatus) {
    fetch('http://localhost:5000/api/admin/update_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({
            complaint_id: complaintId,
            status: newStatus
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            
            // Close the modal
            document.getElementById('complaint-modal').style.display = 'none';
            
            // Refresh the complaints list
            loadComplaints();
        } else {
            alert(data.message || 'Failed to update status');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    });
}

// Filter complaints by department
function filterComplaintsByDepartment(departmentId) {
    console.log("Filtering by department:", departmentId);
    
    const url = new URL('http://localhost:5000/api/admin/complaints');
    if (departmentId && departmentId !== "0") {
        url.searchParams.append('department_id', departmentId);
    }
    
    fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Filter response:", data);
        if (data.success) {
            displayComplaints(data.complaints);
        } else {
            console.error('Failed to filter complaints:', data.message);
            const tableBody = document.getElementById('complaints-list');
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6">Error: ${data.message}</td></tr>`;
            }
        }
    })
    .catch(error => {
        console.error('Error filtering complaints:', error);
        const tableBody = document.getElementById('complaints-list');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6">Error connecting to server</td></tr>`;
        }
    });
}

// Filter complaints by status
function filterComplaintsByStatus(status) {
    const url = new URL('http://localhost:5000/api/admin/complaints');
    if (status) {
        url.searchParams.append('status', status);
    }
    
    fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayComplaints(data.complaints);
        } else {
            console.error('Failed to filter complaints:', data.message);
            const tableBody = document.getElementById('complaints-list');
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6">Error: ${data.message}</td></tr>`;
            }
        }
    })
    .catch(error => {
        console.error('Error filtering complaints:', error);
        const tableBody = document.getElementById('complaints-list');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6">Error connecting to server</td></tr>`;
        }
    });
}

// Search complaints
function searchComplaints(searchTerm) {
    fetch('http://localhost:5000/api/admin/complaints', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (!searchTerm) {
                displayComplaints(data.complaints);
                return;
            }
            
            searchTerm = searchTerm.toLowerCase();
            const filteredComplaints = data.complaints.filter(complaint => 
                complaint.ticket_number.toLowerCase().includes(searchTerm) ||
                complaint.department.toLowerCase().includes(searchTerm) ||
                complaint.user_name.toLowerCase().includes(searchTerm) ||
                complaint.description.toLowerCase().includes(searchTerm)
            );
            
            displayComplaints(filteredComplaints);
        } else {
            console.error('Failed to load complaints:', data.message);
        }
    })
    .catch(error => {
        console.error('Error loading complaints:', error);
    });
}
