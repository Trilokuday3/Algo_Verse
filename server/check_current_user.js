// Quick script to decode JWT token from localStorage
// Run this in browser console:

const token = localStorage.getItem('token');
if (!token) {
    console.log('❌ No token found in localStorage');
} else {
    try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        console.log('✅ Current User Info:');
        console.log('User ID:', payload.userId);
        console.log('Email:', payload.email);
        console.log('Token issued:', new Date(payload.iat * 1000).toLocaleString());
        console.log('Token expires:', new Date(payload.exp * 1000).toLocaleString());
    } catch (e) {
        console.error('❌ Error decoding token:', e);
    }
}
