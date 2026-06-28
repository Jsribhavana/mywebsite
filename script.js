/* FeastFlow App Interactivity & State Management */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    let cart = [];
    let favorites = new Set();
    let currentTrackingStep = 0; // Steps: 0 = Placed, 1 = Preparing, 2 = Out for Delivery, 3 = Delivered
    let activeCategory = 'all';
    let searchQuery = '';

    // --- DOM Elements ---
    const dishesGrid = document.getElementById('dishes-grid');
    const dishCards = document.querySelectorAll('.dish-card');
    const noResultsMessage = document.getElementById('no-results-message');
    const categoryCards = document.querySelectorAll('.category-card');
    const searchInput = document.getElementById('search-input');
    const cartBadge = document.getElementById('cart-badge');
    
    // Cart Drawer Elements
    const cartDrawer = document.getElementById('cart-drawer');
    const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
    const cartDrawerClose = document.getElementById('cart-drawer-close');
    const cartDrawerToggle = document.getElementById('cart-drawer-toggle');
    const cartDrawerItems = document.getElementById('cart-drawer-items');
    const cartDrawerEmpty = document.getElementById('cart-drawer-empty');
    const cartDrawerTotal = document.getElementById('cart-drawer-total');
    const cartDrawerCheckout = document.getElementById('cart-drawer-checkout');
    
    // Tracking Timeline Elements
    const timelineSteps = document.querySelectorAll('.timeline__step');
    const btnNextStep = document.getElementById('btn-next-step');
    const btnResetTracker = document.getElementById('btn-reset-tracker');
    const estimateTime = document.getElementById('estimate-time');
    
    // Newsletter & Offers
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterEmail = document.getElementById('newsletter-email');
    const btnClaimDiscount = document.getElementById('btn-claim-discount');
    const toastContainer = document.getElementById('toast-container');

    // --- Toast Notification Helper ---
    function showToast(message, type = 'default') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        let icon = '🔔';
        if (type === 'success') icon = '✨';
        if (type === 'info') icon = '🏷️';
        if (type === 'danger') icon = '🚨';
        
        toast.innerHTML = `
            <span class="toast__icon">${icon}</span>
            <span class="toast__message">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove from DOM after animation completes (4s total in CSS)
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    // --- Category & Search Filter Logic ---
    function filterDishes() {
        let visibleCount = 0;
        
        dishCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const cardTitle = card.querySelector('.dish-card__title').textContent.toLowerCase();
            const cardDesc = card.querySelector('.dish-card__description').textContent.toLowerCase();
            
            const matchesCategory = (activeCategory === 'all' || cardCategory === activeCategory);
            const matchesSearch = (
                cardTitle.includes(searchQuery) || 
                cardDesc.includes(searchQuery)
            );
            
            if (matchesCategory && matchesSearch) {
                card.classList.remove('hide');
                visibleCount++;
            } else {
                card.classList.add('hide');
            }
        });

        // Toggle No Results Message
        if (visibleCount === 0) {
            noResultsMessage.classList.remove('hide');
            dishesGrid.classList.add('hide');
        } else {
            noResultsMessage.classList.add('hide');
            dishesGrid.classList.remove('hide');
        }
    }

    // Category Card Click handler
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            // Update active state class
            categoryCards.forEach(c => c.classList.remove('category-card--active'));
            card.classList.add('category-card--active');
            
            activeCategory = card.getAttribute('data-category');
            filterDishes();
            
            // Auto scroll to menu section on mobile for better UX
            if (window.innerWidth <= 768) {
                document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Real-Time Search Handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterDishes();
    });

    // --- Favorite Toggle Logic ---
    const favButtons = document.querySelectorAll('.dish-card__favorite-btn');
    favButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dishCard = btn.closest('.dish-card');
            const dishName = dishCard.querySelector('.dish-card__title').textContent;
            
            if (btn.classList.contains('dish-card__favorite-btn--active')) {
                btn.classList.remove('dish-card__favorite-btn--active');
                btn.textContent = '🤍';
                favorites.delete(dishName);
                showToast(`Removed "${dishName}" from favorites.`, 'info');
            } else {
                btn.classList.add('dish-card__favorite-btn--active');
                btn.textContent = '❤️';
                favorites.add(dishName);
                showToast(`Added "${dishName}" to favorites!`, 'success');
            }
        });
    });

    // --- Cart Management Drawer Controls ---
    function openCart() {
        cartDrawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Prevent main page scrolling
    }

    function closeCart() {
        cartDrawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restore scrolling
    }

    cartDrawerToggle.addEventListener('click', openCart);
    cartDrawerClose.addEventListener('click', closeCart);
    cartDrawerOverlay.addEventListener('click', closeCart);

    // Escape Key to close Cart Sidebar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cartDrawer.getAttribute('aria-hidden') === 'false') {
            closeCart();
        }
    });

    // --- Cart Rendering and Operations ---
    function updateCartUI() {
        // Calculate totals
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        
        // Update badge in header
        cartBadge.textContent = totalItems;
        
        // Render Cart list items
        if (cart.length === 0) {
            cartDrawerEmpty.classList.remove('hide');
            // Hide items except empty notice
            const itemElements = cartDrawerItems.querySelectorAll('.cart-item');
            itemElements.forEach(el => el.remove());
            
            cartDrawerTotal.textContent = '₹0';
            cartDrawerCheckout.disabled = true;
        } else {
            cartDrawerEmpty.classList.add('hide');
            
            // Build the cart items list
            // Remove previous cart items
            const oldItems = cartDrawerItems.querySelectorAll('.cart-item');
            oldItems.forEach(el => el.remove());
            
            cart.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'cart-item';
                itemDiv.innerHTML = `
                    <div class="cart-item__details">
                        <div class="cart-item__name">${item.name}</div>
                        <div class="cart-item__price">₹${item.price}</div>
                    </div>
                    <div class="cart-item__controls">
                        <button type="button" class="cart-item__btn qty-minus" data-id="${item.id}" aria-label="Decrease quantity">-</button>
                        <span class="cart-item__qty">${item.qty}</span>
                        <button type="button" class="cart-item__btn qty-plus" data-id="${item.id}" aria-label="Increase quantity">+</button>
                    </div>
                    <button type="button" class="cart-item__remove-btn item-remove" data-id="${item.id}" aria-label="Remove item">🗑️</button>
                `;
                
                // Insert before the empty state container (or append)
                cartDrawerItems.appendChild(itemDiv);
            });
            
            // Bind listeners for item controls
            bindCartItemControls();
            
            cartDrawerTotal.textContent = `₹${totalPrice}`;
            cartDrawerCheckout.disabled = false;
        }
    }

    function bindCartItemControls() {
        // Quantity Plus Buttons
        cartDrawerItems.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const cartItem = cart.find(item => item.id === id);
                if (cartItem) {
                    cartItem.qty++;
                    updateCartUI();
                }
            });
        });

        // Quantity Minus Buttons
        cartDrawerItems.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const cartItem = cart.find(item => item.id === id);
                if (cartItem) {
                    if (cartItem.qty > 1) {
                        cartItem.qty--;
                    } else {
                        // Remove if decreased to 0
                        cart = cart.filter(item => item.id !== id);
                        showToast(`Removed "${cartItem.name}" from cart.`, 'info');
                    }
                    updateCartUI();
                }
            });
        });

        // Remove Buttons
        cartDrawerItems.querySelectorAll('.item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const cartItem = cart.find(item => item.id === id);
                if (cartItem) {
                    cart = cart.filter(item => item.id !== id);
                    showToast(`Removed "${cartItem.name}" from cart.`, 'info');
                    updateCartUI();
                }
            });
        });
    }

    // Add To Cart Button click handler
    const addButtons = document.querySelectorAll('.dish-card__add-btn');
    addButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            const price = parseInt(btn.getAttribute('data-price'), 10);
            
            // Check if item already exists
            const existingItem = cart.find(item => item.id === id);
            if (existingItem) {
                existingItem.qty++;
            } else {
                cart.push({ id, name, price, qty: 1 });
            }
            
            // Trigger animation on cart icon button
            cartBadge.classList.add('badge-animate');
            setTimeout(() => {
                cartBadge.classList.remove('badge-animate');
            }, 300);

            updateCartUI();
            showToast(`Added "${name}" to your order!`, 'success');
        });
    });

    // Checkout Button handler
    cartDrawerCheckout.addEventListener('click', () => {
        if (!currentUser) {
            closeCart();
            openAuthModal('signin');
            showToast('Please sign in or sign up to place your order.', 'info');
            return;
        }

        showToast('Processing order checkout...', 'info');
        
        setTimeout(() => {
            showToast('Order placed successfully! Thank you for dining with FeastFlow.', 'success');
            cart = []; // Clear cart
            updateCartUI();
            closeCart();
            
            // Reset order timeline status simulator
            resetTimeline();
            
            // Scroll to order tracking section to see the live updates
            document.getElementById('tracking').scrollIntoView({ behavior: 'smooth' });
        }, 1500);
    });

    // --- Order Tracker Simulation Logic ---
    const stepMessages = [
        "Order placed successfully! We've received your order.",
        "Your gourmet meal is now being prepared by the chef.",
        "Our courier partner is bringing your fresh meal to your door.",
        "Meal delivered! Enjoy your fresh and delicious food."
    ];

    function updateTimelineUI() {
        timelineSteps.forEach((step, idx) => {
            // Remove previous classes
            step.classList.remove('timeline__step--completed', 'timeline__step--active');
            
            if (idx < currentTrackingStep) {
                step.classList.add('timeline__step--completed');
            } else if (idx === currentTrackingStep) {
                step.classList.add('timeline__step--active');
            }
        });

        // Update estimated delivery text based on status
        if (currentTrackingStep === 0) {
            estimateTime.textContent = '12:45 PM (In 15 Mins)';
        } else if (currentTrackingStep === 1) {
            estimateTime.textContent = '12:42 PM (In 12 Mins)';
        } else if (currentTrackingStep === 2) {
            estimateTime.textContent = '12:35 PM (In 5 Mins)';
        } else if (currentTrackingStep === 3) {
            estimateTime.textContent = 'Delivered at 12:34 PM';
            estimateTime.style.color = 'var(--success)';
        }
        
        if (currentTrackingStep < 3) {
            estimateTime.style.color = 'var(--primary)';
        }
    }

    function resetTimeline() {
        currentTrackingStep = 0;
        updateTimelineUI();
    }

    btnNextStep.addEventListener('click', () => {
        if (currentTrackingStep < 3) {
            currentTrackingStep++;
            updateTimelineUI();
            showToast(stepMessages[currentTrackingStep], 'success');
        } else {
            showToast('Your order has already been successfully delivered! Reset tracking to simulate again.', 'info');
        }
    });

    btnResetTracker.addEventListener('click', () => {
        resetTimeline();
        showToast('Delivery status tracker simulator reset.', 'info');
    });

    // --- Newsletter & Discounts Submit ---
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailVal = newsletterEmail.value;
        if (emailVal) {
            showToast('Subscribing to mailing list...', 'info');
            setTimeout(() => {
                showToast(`Successfully subscribed! Check ${emailVal} for your welcome coupon code.`, 'success');
                newsletterForm.reset();
            }, 1000);
        }
    });

    btnClaimDiscount.addEventListener('click', () => {
        // Copy coupon code to clipboard, then show feedback
        navigator.clipboard.writeText('FEAST50')
            .then(() => {
                showToast('Coupon code "FEAST50" copied to clipboard! Paste it at checkout.', 'success');
            })
            .catch(() => {
                showToast('Discount claimed! Remember to use coupon FEAST50 at checkout.', 'info');
            });
    });

    // --- Authentication & User Session Management ---
    
    // Check if session exists in localStorage or sessionStorage
    let currentUser = null;
    const storedSession = localStorage.getItem('feastflow_session') || sessionStorage.getItem('feastflow_session');
    if (storedSession) {
        try {
            currentUser = JSON.parse(storedSession);
        } catch (e) {
            console.error("Error parsing stored session", e);
        }
    }

    // DOM Elements
    const authModal = document.getElementById('auth-modal');
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    const authModalClose = document.getElementById('auth-modal-close');
    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');
    const formSignin = document.getElementById('form-signin');
    const formSignup = document.getElementById('form-signup');
    const headerAuthContainer = document.getElementById('header-auth-container');

    // Sign up inputs & error elements
    const signupName = document.getElementById('signup-name');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    const signupTerms = document.getElementById('signup-terms');

    const signupNameErr = document.getElementById('signup-name-err');
    const signupEmailErr = document.getElementById('signup-email-err');
    const signupPasswordErr = document.getElementById('signup-password-err');
    const signupConfirmErr = document.getElementById('signup-confirm-err');

    // Sign in inputs
    const signinEmail = document.getElementById('signin-email');
    const signinPassword = document.getElementById('signin-password');
    const signinRemember = document.getElementById('signin-remember');

    // Open Modal
    function openAuthModal(tab = 'signin') {
        authModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Stop background scrolling
        switchTab(tab);
    }

    // Close Modal
    function closeAuthModal() {
        authModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        resetAuthForms();
    }

    // Switch Tab
    function switchTab(tab) {
        if (tab === 'signin') {
            tabSignin.classList.add('auth-tab--active');
            tabSignup.classList.remove('auth-tab--active');
            formSignin.classList.remove('hide');
            formSignup.classList.add('hide');
        } else {
            tabSignin.classList.remove('auth-tab--active');
            tabSignup.classList.add('auth-tab--active');
            formSignin.classList.add('hide');
            formSignup.classList.remove('hide');
        }
        resetValidationErrors();
    }

    // Reset Auth forms and borders
    function resetAuthForms() {
        formSignin.reset();
        formSignup.reset();
        resetValidationErrors();
    }

    function resetValidationErrors() {
        const errorElements = [signupNameErr, signupEmailErr, signupPasswordErr, signupConfirmErr];
        errorElements.forEach(el => {
            if (el) {
                el.textContent = '';
                el.classList.add('hide');
            }
        });

        const inputs = [signupName, signupEmail, signupPassword, signupConfirmPassword, signinEmail, signinPassword];
        inputs.forEach(input => {
            if (input) {
                const wrapper = input.closest('.input-wrapper');
                if (wrapper) wrapper.style.borderColor = '';
            }
        });
    }

    // Show input validation error
    function showError(input, errorEl, message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hide');
        const wrapper = input.closest('.input-wrapper');
        if (wrapper) wrapper.style.borderColor = 'var(--danger)';
    }

    // Update Header based on session
    function updateHeaderAuth() {
        if (currentUser) {
            headerAuthContainer.innerHTML = `
                <div class="header__profile-pill" title="${currentUser.email}">
                    <span class="profile-avatar">👤</span>
                    <span class="profile-name">Hi, ${currentUser.name.split(' ')[0]}</span>
                </div>
                <button type="button" id="header-logout-btn" class="btn btn--outline btn--sm">Log Out</button>
            `;
        } else {
            headerAuthContainer.innerHTML = `
                <a href="#login" id="nav-signin-btn" class="btn btn--outline btn--sm">Sign In</a>
                <a href="#register" id="nav-signup-btn" class="btn btn--primary btn--sm hide-mobile">Sign Up</a>
            `;
        }
    }

    // Log Out User
    function logoutUser() {
        currentUser = null;
        localStorage.removeItem('feastflow_session');
        sessionStorage.removeItem('feastflow_session');
        updateHeaderAuth();
        showToast('Logged out successfully.', 'info');
    }

    // --- Listeners ---

    // Tab clicks
    tabSignin.addEventListener('click', () => switchTab('signin'));
    tabSignup.addEventListener('click', () => switchTab('signup'));

    // Modal Close
    authModalClose.addEventListener('click', closeAuthModal);
    authModalOverlay.addEventListener('click', closeAuthModal);

    // ESC key close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal.getAttribute('aria-hidden') === 'false') {
            closeAuthModal();
        }
    });

    // Event Delegation for nav triggers
    document.addEventListener('click', (e) => {
        const signinBtn = e.target.closest('#nav-signin-btn') || (e.target.closest('a') && e.target.closest('a').getAttribute('href') === '#login');
        const signupBtn = e.target.closest('#nav-signup-btn') || (e.target.closest('a') && e.target.closest('a').getAttribute('href') === '#register');
        const logoutBtn = e.target.closest('#header-logout-btn');
        
        if (signinBtn) {
            e.preventDefault();
            openAuthModal('signin');
        } else if (signupBtn) {
            e.preventDefault();
            openAuthModal('signup');
        } else if (logoutBtn) {
            e.preventDefault();
            logoutUser();
        }
    });

    // Mock social logins
    document.getElementById('social-google').addEventListener('click', () => {
        showToast('Connecting with Google...', 'info');
        setTimeout(() => {
            const mockGoogleUser = { name: 'Google Explorer', email: 'explorer@gmail.com' };
            currentUser = mockGoogleUser;
            sessionStorage.setItem('feastflow_session', JSON.stringify(currentUser));
            updateHeaderAuth();
            closeAuthModal();
            showToast('Welcome! Signed in with Google.', 'success');
        }, 800);
    });

    document.getElementById('social-facebook').addEventListener('click', () => {
        showToast('Connecting with Facebook...', 'info');
        setTimeout(() => {
            const mockFBUser = { name: 'Facebook Friend', email: 'friend@facebook.com' };
            currentUser = mockFBUser;
            sessionStorage.setItem('feastflow_session', JSON.stringify(currentUser));
            updateHeaderAuth();
            closeAuthModal();
            showToast('Welcome! Signed in with Facebook.', 'success');
        }, 800);
    });

    // Form Sign Up Submission
    formSignup.addEventListener('submit', (e) => {
        e.preventDefault();
        let isValid = true;

        // Reset errors
        resetValidationErrors();

        // 1. Name validation
        const nameVal = signupName.value.trim();
        if (nameVal.length < 2) {
            showError(signupName, signupNameErr, 'Please enter your full name (min 2 characters).');
            isValid = false;
        }

        // 2. Email validation
        const emailVal = signupEmail.value.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
            showError(signupEmail, signupEmailErr, 'Please enter a valid email address.');
            isValid = false;
        }

        // 3. Password validation
        const passwordVal = signupPassword.value;
        if (passwordVal.length < 8) {
            showError(signupPassword, signupPasswordErr, 'Password must be at least 8 characters long.');
            isValid = false;
        }

        // 4. Confirm Password validation
        const confirmVal = signupConfirmPassword.value;
        if (passwordVal !== confirmVal) {
            showError(signupConfirmPassword, signupConfirmErr, 'Passwords do not match.');
            isValid = false;
        }

        if (!isValid) return;

        // Load existing users
        let users = [];
        const storedUsers = localStorage.getItem('feastflow_users');
        if (storedUsers) {
            try {
                users = JSON.parse(storedUsers);
            } catch (err) {
                users = [];
            }
        }

        // Check if email already registered
        const userExists = users.some(u => u.email === emailVal);
        if (userExists) {
            showError(signupEmail, signupEmailErr, 'This email is already registered.');
            return;
        }

        // Add user
        const newUser = {
            name: nameVal,
            email: emailVal,
            password: passwordVal
        };
        users.push(newUser);
        localStorage.setItem('feastflow_users', JSON.stringify(users));

        showToast('Registration successful! Please sign in.', 'success');
        switchTab('signin');
        signinEmail.value = emailVal;
        signinPassword.focus();
    });

    // Form Sign In Submission
    formSignin.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const emailVal = signinEmail.value.trim().toLowerCase();
        const passwordVal = signinPassword.value;

        // Load existing users
        let users = [];
        const storedUsers = localStorage.getItem('feastflow_users');
        if (storedUsers) {
            try {
                users = JSON.parse(storedUsers);
            } catch (err) {
                users = [];
            }
        }

        // Check match
        const matchedUser = users.find(u => u.email === emailVal && u.password === passwordVal);
        if (!matchedUser) {
            showToast('Invalid email or password.', 'danger');
            return;
        }

        // Successful sign in
        currentUser = {
            name: matchedUser.name,
            email: matchedUser.email
        };

        // Persistent preference
        if (signinRemember.checked) {
            localStorage.setItem('feastflow_session', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('feastflow_session', JSON.stringify(currentUser));
        }

        updateHeaderAuth();
        closeAuthModal();
        showToast(`Welcome back, ${currentUser.name}!`, 'success');
    });

    // Initialize UI on load
    updateCartUI();
    updateTimelineUI();
    updateHeaderAuth();
});
