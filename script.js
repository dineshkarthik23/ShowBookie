const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const btnLoginPopup = document.querySelector('.btnloginPopup');
const iconClose = document.querySelector('.icon-close');

// Only add event listener if btnLoginPopup exists
if (btnLoginPopup) {
    btnLoginPopup.addEventListener('click', () => {
        wrapper.classList.add('active-popup');
    });
}

// Only add event listener if iconClose exists
if (iconClose) {
    iconClose.addEventListener('click', () => {
        wrapper.classList.remove('active-popup');
    });
}

// Register link to show register form
if (registerLink) {
    registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.add('active');
    });
}

// Login link to show login form
if (loginLink) {
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        wrapper.classList.remove('active');
    });
}