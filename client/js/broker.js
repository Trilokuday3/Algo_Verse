document.addEventListener('DOMContentLoaded', async () => {
    // Update account icon with user's email initial
    await updateAccountIcon();

    const settingsForm = document.getElementById('profileBrokerForm');
    const tokenTextarea = document.getElementById('token-id-profile');
    const toggleButton = document.getElementById('toggle-token-visibility-profile');
    const eyeIcon = document.getElementById('eye-icon-profile');
    const eyeOffIcon = document.getElementById('eye-off-icon-profile');
    const toggleText = document.getElementById('toggle-text-profile');

    let isTokenVisible = false;
    let actualTokenValue = '';

    // Function to mask the token
    function maskToken(token) {
        if (!token) return '';
        return '•'.repeat(token.length);
    }

    // Function to calculate characters per line based on textarea width
    function getCharsPerLine() {
        if (!tokenTextarea) return 40; // fallback
        
        // Create a temporary span to measure character width
        const tempSpan = document.createElement('span');
        tempSpan.style.font = window.getComputedStyle(tokenTextarea).font;
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.textContent = 'A'; // Monospace character
        document.body.appendChild(tempSpan);
        
        const charWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        // Get textarea width minus padding
        const textareaStyle = window.getComputedStyle(tokenTextarea);
        const textareaWidth = tokenTextarea.clientWidth - 
                             parseFloat(textareaStyle.paddingLeft) - 
                             parseFloat(textareaStyle.paddingRight);
        
        // Calculate how many characters fit per line
        const charsPerLine = Math.floor(textareaWidth / charWidth);
        return charsPerLine > 0 ? charsPerLine : 40; // Ensure positive number
    }

    // Function to format token with line breaks based on textarea width
    function formatTokenWithBreaks(token) {
        if (!token) return '';
        const charsPerLine = getCharsPerLine();
        let formatted = '';
        for (let i = 0; i < token.length; i += charsPerLine) {
            formatted += token.substring(i, i + charsPerLine) + '\n';
        }
        return formatted.trim();
    }

    // Toggle token visibility
    if (toggleButton && tokenTextarea) {
        toggleButton.addEventListener('click', () => {
            isTokenVisible = !isTokenVisible;

            if (isTokenVisible) {
                // Show the actual token
                tokenTextarea.value = formatTokenWithBreaks(actualTokenValue);
                eyeIcon.classList.add('hidden');
                eyeOffIcon.classList.remove('hidden');
                toggleText.textContent = 'Hide';
            } else {
                // Mask the token
                tokenTextarea.value = maskToken(actualTokenValue);
                eyeIcon.classList.remove('hidden');
                eyeOffIcon.classList.add('hidden');
                toggleText.textContent = 'Show';
            }
        });

        // Handle input/paste events
        tokenTextarea.addEventListener('input', (e) => {
            if (isTokenVisible) {
                actualTokenValue = e.target.value.replace(/\n/g, '');
                e.target.value = formatTokenWithBreaks(actualTokenValue);
            } else {
                const inputLength = e.target.value.length;
                const previousLength = actualTokenValue.length;
                
                if (inputLength > previousLength) {
                    // Characters added
                    actualTokenValue += e.target.value.slice(previousLength);
                } else if (inputLength < previousLength) {
                    // Characters removed
                    actualTokenValue = actualTokenValue.slice(0, inputLength);
                }
                
                e.target.value = maskToken(actualTokenValue);
            }
        });

        // Handle paste event
        tokenTextarea.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text').replace(/\n/g, '');
            
            if (isTokenVisible) {
                actualTokenValue = pastedText;
                tokenTextarea.value = formatTokenWithBreaks(actualTokenValue);
            } else {
                actualTokenValue = pastedText;
                tokenTextarea.value = maskToken(actualTokenValue);
            }
        });
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const clientIdInput = document.getElementById('client-id-profile');
            const brokerSelect = document.getElementById('broker-select-profile');

            const credentials = {
                broker: brokerSelect ? brokerSelect.value : 'dhan',
                clientId: clientIdInput.value,
                accessToken: actualTokenValue || tokenTextarea.value.replace(/\n/g, '')
            };

            const result = await saveCredentials(credentials);
            
            // Show the success or error message from the server
            alert(result.message);

            // If the save was successful, clear the input fields.
            if (result.message && result.message.includes('successfully')) {
                clientIdInput.value = '';
                tokenTextarea.value = '';
                actualTokenValue = '';
                isTokenVisible = false;
                eyeIcon.classList.remove('hidden');
                eyeOffIcon.classList.add('hidden');
                toggleText.textContent = 'Show';
            }
        });
    }
});

// Function to update account icon with user's email initial
async function updateAccountIcon() {
    try {
        const profile = await getUserProfile();
        if (profile && profile.email) {
            const email = profile.email;
            const avatarLetter = email.charAt(0).toUpperCase();
            
            // Update the button icon
            const accountIcon = document.getElementById('account-icon');
            if (accountIcon) {
                accountIcon.textContent = avatarLetter;
            }
            
            // Update dropdown email
            const dropdownEmail = document.getElementById('dropdown-email');
            if (dropdownEmail) {
                dropdownEmail.textContent = email;
            }
            
            // Update dropdown avatar text
            const dropdownAvatarText = document.getElementById('dropdown-avatar-text');
            if (dropdownAvatarText) {
                dropdownAvatarText.textContent = avatarLetter;
            }
        }
    } catch (error) {
        console.error('Error updating account icon:', error);
    }
}
