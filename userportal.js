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

    async function handleUserInput() {
        const message = userInput.value.trim();
        if (message) {
            // Hide the previous submission result when user starts typing
            document.getElementById('submission-result').style.display = 'none';
            
            addMessage(message, true); // Add user message to chat
            userInput.value = '';

            try {
                // Send the user's message to the backend
                const response = await fetch('http://127.0.0.1:5000/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message }),
                });

                const result = await response.json();

                if (result.success) {
                    if (result.type === 'greeting') {
                        addMessage(result.reply);
                    } else if (result.type === 'complaint') {
                        addMessage(result.reply);
                        document.getElementById('complaint-form').style.display = 'block';
                        document.getElementById('complaint').value = message;
                    } else if (result.type === 'rejected') {
                        addMessage(result.reply);
                    } else if (result.type === 'irrelevant') {
                        addMessage(result.reply);
                    }
                } else {
                    addMessage("Sorry, I couldn't process your request. Please try again.");
                }
            } catch (error) {
                console.error('Error:', error);
                addMessage("An error occurred while communicating with the server.");
            }
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

                // Check for GPS metadata
                EXIF.getData(img, function () {
                    const gpsLatitude = EXIF.getTag(this, 'GPSLatitude');
                    const gpsLongitude = EXIF.getTag(this, 'GPSLongitude');

                    if (!gpsLatitude || !gpsLongitude) {
                        alert('Please upload a photo taken with a GPS-enabled camera.');
                        imageUpload.value = ''; // Clear the file input
                        imagePreview.innerHTML = ''; // Clear the preview
                        return;
                    }

                    // If GPS metadata is present, show the preview
                    imagePreview.innerHTML = '';
                    imagePreview.appendChild(img);
                });
            };
            reader.readAsDataURL(file);
        }
    });

    // Submit Complaint
    const submitBtn = document.getElementById('submit-complaint');
    const submissionResult = document.getElementById('submission-result');
    const ticketNumberElem = document.getElementById('ticket-number');
    const assignedDeptElem = document.getElementById('assigned-department');

    submitBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const complaint = document.getElementById('complaint').value.trim();
        const address = document.getElementById('address').value.trim();

        if (!name || !email || !complaint || !address) {
            alert('Please fill all required fields, including the address.');
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

        const data = {
            user_id: sessionStorage.getItem('user_id'), // Retrieve user_id from session storage
            name,
            email,
            phone,
            complaint,
            address,
            image: imageData
        };


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
                console.log("success")
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
        // Hide the submission result
        document.getElementById('submission-result').style.display = 'none';
        
        // Clear the form
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('complaint').value = '';
        imageUpload.value = '';
        imagePreview.innerHTML = '';
        
        // Show the chat interface
        document.getElementById('complaint-form').style.display = 'none';
        
        // Reset the chat with a message that preserves the previous ticket info
        const chatMessages = document.getElementById('chat-messages');
        const previousTicket = document.getElementById('ticket-number').textContent;
        const previousDepartment = document.getElementById('assigned-department').textContent;
        
        chatMessages.innerHTML = `
            <div class="message bot">
                Your previous complaint (Ticket: ${previousTicket}, Department: ${previousDepartment}) has been submitted successfully.
                <br><br>
                How can I help you with your next grievance?
            </div>
        `;
        
        // Scroll to top
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
