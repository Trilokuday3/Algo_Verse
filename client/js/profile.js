document.addEventListener('DOMContentLoaded', async () => {
    // Get profile data
    await loadProfile();

    // Sidebar Navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');
            
            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all sections
            contentSections.forEach(section => section.classList.add('hidden'));
            // Show target section
            document.getElementById(targetSection).classList.remove('hidden');
        });
    });

    // Event Listeners
    const editAccountBtn = document.getElementById('edit-account-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveAccountBtn = document.getElementById('save-account-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');
    const submitPasswordBtn = document.getElementById('submit-password-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const passwordModal = document.getElementById('password-modal');
    const accountView = document.getElementById('account-view');
    const accountEdit = document.getElementById('account-edit');

    // Edit account button
    if (editAccountBtn) {
        editAccountBtn.addEventListener('click', () => {
            accountView.classList.add('hidden');
            accountEdit.classList.remove('hidden');
        });
    }

    // Cancel edit button
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            accountEdit.classList.add('hidden');
            accountView.classList.remove('hidden');
        });
    }

    // Save account button (currently email is readonly, so this is a placeholder)
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener('click', async () => {
            alert('Account details saved! (Email cannot be changed)');
            accountEdit.classList.add('hidden');
            accountView.classList.remove('hidden');
        });
    }

    // Change password button
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => {
            passwordModal.classList.remove('hidden');
            passwordModal.classList.add('flex');
        });
    }

    // Cancel password modal
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', () => {
            passwordModal.classList.add('hidden');
            passwordModal.classList.remove('flex');
            clearPasswordFields();
        });
    }

    // Submit password change
    if (submitPasswordBtn) {
        submitPasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }

            if (newPassword.length < 6) {
                alert('New password must be at least 6 characters');
                return;
            }

            try {
                const result = await changePassword(currentPassword, newPassword);
                if (result.success) {
                    alert('Password changed successfully!');
                    passwordModal.classList.add('hidden');
                    passwordModal.classList.remove('flex');
                    clearPasswordFields();
                } else {
                    alert(result.message || 'Failed to change password');
                }
            } catch (error) {
                console.error('Password change error:', error);
                alert('Error changing password. Please try again.');
            }
        });
    }

    // Delete account button
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you absolutely sure you want to delete your account? This action cannot be undone!');
            if (confirmed) {
                const doubleConfirm = confirm('This will permanently delete all your strategies and data. Type "DELETE" to confirm.');
                if (doubleConfirm) {
                    try {
                        const result = await deleteAccount();
                        if (result.success) {
                            alert('Account deleted successfully. You will be logged out.');
                            localStorage.removeItem('token');
                            window.location.href = 'index.html';
                        } else {
                            alert(result.message || 'Failed to delete account');
                        }
                    } catch (error) {
                        console.error('Account deletion error:', error);
                        alert('Error deleting account. Please try again.');
                    }
                }
            }
        });
    }
});

// Load profile data from backend
async function loadProfile() {
    try {
        const profile = await getUserProfile();
        
        if (profile) {
            // Update profile information
            const email = profile.email || 'user@example.com';
            document.getElementById('profile-email').textContent = email;
            document.getElementById('view-email').textContent = email;
            document.getElementById('edit-email').value = email;
            document.getElementById('dropdown-email').textContent = email;
            
            // Update avatar
            const avatarLetter = email.charAt(0).toUpperCase();
            document.getElementById('avatar-letter').textContent = avatarLetter;
            const accountIcon = document.getElementById('account-icon');
            if (accountIcon) {
                accountIcon.textContent = avatarLetter;
            }
            
            // Update dropdown avatar text
            const dropdownAvatarText = document.getElementById('dropdown-avatar-text');
            if (dropdownAvatarText) {
                dropdownAvatarText.textContent = avatarLetter;
            }

            // Update member since (if createdAt is available)
            if (profile.createdAt) {
                const date = new Date(profile.createdAt);
                document.getElementById('member-since').textContent = `Member since: ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            }

            // Update strategy counts
            const strategies = profile.strategies || [];
            document.getElementById('total-strategies').textContent = strategies.length;
            const activeStrategies = strategies.filter(s => s.status === 'Running').length;
            document.getElementById('active-strategies').textContent = activeStrategies;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Use default/fallback values
        document.getElementById('profile-email').textContent = 'Error loading profile';
        document.getElementById('view-email').textContent = 'Error loading profile';
    }
}

// Helper function to clear password fields
function clearPasswordFields() {
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}
