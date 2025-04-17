// Update the submitComplaint function
async function submitComplaint() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const complaint = document.getElementById('complaint').value;
    const imageInput = document.getElementById('image');
    const imageFile = imageInput.files[0];

    // Validate required fields
    if (!name || !email || !complaint) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        let imageData = null;
        if (imageFile) {
            imageData = await readFileAsBase64(imageFile);
        }

        const response = await fetch('http://127.0.0.1:5000/api/submit_complaint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                phone,
                complaint,
                image: imageData
            })
        });

        const data = await response.json();

        if (data.success) {
            // Success case
            alert(`Complaint submitted successfully!\nTicket Number: ${data.ticket_number}\nDepartment: ${data.department}`);
            // Clear form
            document.getElementById('complaintForm').reset();
            // Hide image upload if it was shown
            document.getElementById('imageUploadContainer').style.display = 'none';
        } else {
            // Error case
            if (data.requires_image) {
                // Show image upload section
                document.getElementById('imageUploadContainer').style.display = 'block';
                // Update the message
                document.getElementById('imageUploadMessage').textContent = data.message;
                // Store the current complaint data for resubmission
                window.pendingComplaint = {
                    name,
                    email,
                    phone,
                    complaint,
                    department: data.department,
                    sub_category: data.sub_category
                };
            } else {
                alert(data.message);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while submitting the complaint. Please try again.');
    }
}

// Add this function to handle image upload
async function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result;
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Add this function to handle image upload button click
function handleImageUpload() {
    const imageInput = document.getElementById('image');
    if (imageInput) {
        imageInput.click();
    }
}

// Add this function to handle image selection
function handleImageSelected(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}

// Add this function to submit complaint with image
async function submitComplaintWithImage(complaintData, imageFile) {
    try {
        const imageData = await readFileAsBase64(imageFile);
        
        const response = await fetch('http://127.0.0.1:5000/api/submit_complaint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...complaintData,
                image: imageData
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Complaint submitted successfully!\nTicket Number: ${data.ticket_number}\nDepartment: ${data.department}`);
            // Clear form and reset state
            document.getElementById('complaintForm').reset();
            document.getElementById('imageUploadContainer').style.display = 'none';
            document.getElementById('imagePreview').style.display = 'none';
            window.pendingComplaint = null;
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while submitting the complaint. Please try again.');
    }
}

// Initialize chat interface when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    } else {
        console.error('Send button not found');
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    } else {
        console.error('Message input not found');
    }
});

// Function to send a message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    messageInput.value = '';
    
    try {
        console.log('Sending message to backend:', message);
        
        const response = await fetch('http://127.0.0.1:5000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
            credentials: 'include',
            mode: 'cors'
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Chat response:', data);
        
        if (data.success) {
            // Handle different response types
            switch(data.type) {
                case 'greeting':
                    addMessageToChat(data.reply, 'bot');
                    break;
                    
                case 'rejected':
                    addMessageToChat(data.reply, 'bot');
                    break;
                    
                case 'requires_image':
                    addMessageToChat(data.reply, 'bot');
                    // Show image upload section
                    const imageUploadContainer = document.getElementById('imageUploadContainer');
                    const imageUploadMessage = document.getElementById('imageUploadMessage');
                    
                    if (imageUploadContainer && imageUploadMessage) {
                        imageUploadContainer.style.display = 'block';
                        imageUploadMessage.textContent = data.reply;
                        // Store the department and sub-category for later use
                        window.pendingComplaint = {
                            department: data.department,
                            sub_category: data.sub_category
                        };
                    }
                    break;
                    
                case 'complaint':
                    addMessageToChat(data.reply, 'bot');
                    break;
                    
                default:
                    addMessageToChat(data.reply || 'I received your message but I\'m not sure how to respond.', 'bot');
            }
        } else {
            console.error('Server returned success: false:', data);
            addMessageToChat(data.message || 'An error occurred. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Detailed error:', error);
        console.error('Error stack:', error.stack);
        addMessageToChat(`Error: ${error.message}. Please try again.`, 'bot');
    }
}

// Function to add a message to the chat
function addMessageToChat(message, sender) {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) {
        console.error('Chat container not found');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
} 