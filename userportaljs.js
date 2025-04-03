document.addEventListener('DOMContentLoaded', function () {
    // Tab Functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to current button and content
            btn.classList.add('active');
            document.getElementById(`${tabId}-section`).classList.add('active');
        });
    });

    // Chat Functionality
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const complaintForm = document.getElementById('complaint-form');

    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isUser ? 'user' : 'bot');
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleUserInput() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';

            setTimeout(() => {
                addMessage("Thank you for sharing your grievance. Please fill out the form below.");
                complaintForm.style.display = 'block';
                document.getElementById('complaint').value = message;
            }, 1000);
        }
    }

    sendBtn.addEventListener('click', handleUserInput);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    // Image Upload Preview
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');

    imageUpload.addEventListener('change', () => {
        const file = imageUpload.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                imagePreview.innerHTML = '';
                imagePreview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });

    // Submit Complaint
    const submitBtn = document.getElementById('submit-complaint');
    const submissionResult = document.getElementById('submission-result');
    const ticketNumberElem = document.getElementById('ticket-number');
    const assignedDeptElem = document.getElementById('assigned-department');

    submitBtn.addEventListener('click', async () => {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const complaint = document.getElementById('complaint').value.trim();

        if (!name || !email || !complaint) {
            alert('Please fill all required fields');
            return;
        }

        if (!isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        let imageData = null;
        if (imageUpload.files[0]) {
            const reader = new FileReader();
            imageData = await new Promise(resolve => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(imageUpload.files[0]);
            });
        }

        const data = { name, email, phone, complaint, image: imageData };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const response = await fetch("http://127.0.0.1:5000/api/submit_complaint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                mode: "cors",
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                ticketNumberElem.textContent = result.ticket_number;
                assignedDeptElem.textContent = result.department;

                complaintForm.style.display = 'none';
                submissionResult.style.display = 'block';
            } else {
                alert(result.message || 'Failed to submit complaint');
            }
        } catch (error) {
            console.error('Error submitting complaint:', error);
            alert('An error occurred while submitting your complaint');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Complaint';
        }
    });

    document.getElementById('new-complaint').addEventListener('click', () => {
        submissionResult.style.display = 'none';

        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('complaint').value = '';
        imageUpload.value = '';
        imagePreview.innerHTML = '';

        complaintForm.style.display = 'none';

        addMessage("Hello! I'm here to help. Please tell me about your issue.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Track Complaint
    const trackBtn = document.getElementById('track-btn');
    const complaintDetails = document.getElementById('complaint-details');
    const trackError = document.getElementById('track-error');

    trackBtn.addEventListener('click', async () => {
        const ticketNumber = document.getElementById('track-ticket').value.trim();

        if (!ticketNumber) {
            alert('Please enter a ticket number');
            return;
        }

        trackBtn.disabled = true;
        trackBtn.textContent = 'Tracking...';

        try {
            const response = await fetch("http://127.0.0.1:5000/api/track_complaint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                mode: "cors",
                body: JSON.stringify({ ticket_number: ticketNumber })
            });

            const result = await response.json();

            if (result.success) {
                trackError.style.display = 'none';

                const complaint = result.complaint;
                document.getElementById('detail-ticket').textContent = complaint.ticket_number;
                document.getElementById('detail-department').textContent = complaint.department;
                document.getElementById('detail-description').textContent = complaint.description;

                const createdDate = new Date(complaint.created_at);
                const updatedDate = new Date(complaint.updated_at);
                document.getElementById('detail-date').textContent = formatDate(createdDate);
                document.getElementById('detail-updated').textContent = formatDate(updatedDate);

                const statusElem = document.getElementById('detail-status');
                statusElem.textContent = complaint.status;
                statusElem.className = `detail-value status ${complaint.status.replace(' ', '')}`;

                complaintDetails.style.display = 'block';
            } else {
                document.getElementById('error-message').textContent = result.message;
                trackError.style.display = 'block';
                complaintDetails.style.display = 'none';
            }
        } catch (error) {
            console.error('Error tracking complaint:', error);
            document.getElementById('error-message').textContent = 'An error occurred while tracking your complaint';
            trackError.style.display = 'block';
            complaintDetails.style.display = 'none';
        } finally {
            trackBtn.disabled = false;
            trackBtn.textContent = 'Track';
        }
    });

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function formatDate(date) {
        return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
});
