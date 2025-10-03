// NoKeys.dk Booking System - Optimized Version

let appointments = [];
let editingId = null;
let scrollPosition = 0;
let userName = '';

const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isIOSPWA = () => {
    return isIOS() && window.navigator.standalone === true;
};

function setupIOSInputFix() {
    if (!isIOS()) return;
    
    const style = document.createElement('style');
    style.textContent = `
        .form-input {
            font-size: 16px !important;
            -webkit-user-select: text !important;
            user-select: text !important;
        }
        
        input, textarea, select {
            font-size: 16px !important;
        }
        
        body.modal-open {
            position: fixed;
            width: 100%;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);
}

function lockBodyScroll() {
    if (isIOS()) {
        scrollPosition = window.pageYOffset;
        document.body.style.top = `-${scrollPosition}px`;
        document.body.classList.add('modal-open');
    }
}

function unlockBodyScroll() {
    if (isIOS()) {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    icon.textContent = icons[type] || icons.success;
    messageEl.textContent = message;
    
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    
    // Get saved name or prompt for it
    if (!userName) {
        userName = localStorage.getItem('nokeys_username');
        if (!userName) {
            userName = prompt('Velkommen! Hvad er dit navn?') || 'Bruger';
            localStorage.setItem('nokeys_username', userName);
        }
    }
    
    let greeting = '';
    if (hour < 12) {
        greeting = `God morgen, ${userName}! 🌅`;
    } else if (hour < 17) {
        greeting = `God eftermiddag, ${userName}! ☀️`;
    } else {
        greeting = `God aften, ${userName}! 🌙`;
    }
    
    greetingEl.textContent = greeting;
}

function enableInput(input) {
    if (!input) return;
    
    if (isIOSPWA()) {
        input.style.fontSize = '16px';
        input.style.webkitUserSelect = 'text';
        input.style.userSelect = 'text';
        
        if (input._focusHandler) {
            input.removeEventListener('touchstart', input._focusHandler);
        }
        
        const focusHandler = function(e) {
            if (e.type === 'touchstart') return;
            setTimeout(() => {
                this.focus();
            }, 10);
        };
        
        input._focusHandler = focusHandler;
        input.addEventListener('click', focusHandler, { passive: true });
    }
}

// Initialize - check name first
function init() {
    // Check for username immediately
    userName = localStorage.getItem('nokeys_username');
    if (!userName) {
        userName = prompt('Velkommen! Hvad er dit navn?') || 'Bruger';
        localStorage.setItem('nokeys_username', userName);
    }
    
    setupIOSInputFix();
    updateGreeting();
    loadFromStorage();
    render();
    
    setInterval(updateGreeting, 60000);
}

function loadFromStorage() {
    const saved = localStorage.getItem('nokeys_appointments');
    if (saved) {
        try {
            appointments = JSON.parse(saved);
            cleanupOldCompleted();
        } catch (e) {
            appointments = [];
            showToast('Fejl ved indlæsning af data', 'error');
        }
    }
}

function saveToStorage() {
    try {
        localStorage.setItem('nokeys_appointments', JSON.stringify(appointments));
    } catch (e) {
        showToast('Fejl ved gemning af data', 'error');
    }
}

function cleanupOldCompleted() {
    const now = Date.now();
    const fiveHours = 5 * 60 * 60 * 1000;
    
    const originalLength = appointments.length;
    
    // VIGTIG: Behold ALLE aftaler der IKKE er completed
    // Slet KUN aftaler der er completed OG ældre end 5 timer
    appointments = appointments.filter(apt => {
        // Hvis aftalen IKKE er completed, behold den ALTID
        if (!apt.completed) {
            return true;
        }
        
        // Hvis aftalen ER completed, tjek om den skal slettes
        if (apt.completed && apt.completedAt) {
            const timeSinceCompleted = now - apt.completedAt;
            const shouldKeep = timeSinceCompleted < fiveHours;
            return shouldKeep;
        }
        
        // Hvis completed men ingen completedAt (gamle data), behold den
        return true;
    });
    
    const deletedCount = originalLength - appointments.length;
    if (deletedCount > 0) {
        console.log(`Cleanup: Slettede ${deletedCount} gamle afsluttede aftaler`);
        saveToStorage();
    }
}

function openModal() {
    const modal = document.getElementById('modal');
    
    lockBodyScroll();
    modal.classList.add('active');
    
    setTimeout(() => {
        const inputs = document.querySelectorAll('#modal .form-input');
        inputs.forEach(enableInput);
        
        const firstInput = document.getElementById('customerName');
        if (firstInput) {
            firstInput.focus();
        }
    }, 150);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    
    setTimeout(() => {
        unlockBodyScroll();
    }, 100);
    
    clearForm();
    editingId = null;
}

function setupModalClickOutside() {
    const modal = document.getElementById('modal');
    const modalContent = document.querySelector('.modal-content');
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal && !modalContent.contains(e.target)) {
            closeModal();
        }
    });
}

function clearForm() {
    document.getElementById('customerName').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('email').value = '';
    document.getElementById('service').value = '';
    document.getElementById('date').value = '';
    document.getElementById('time').value = '';
    document.getElementById('address').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('modalTitle').textContent = '+ Ny Aftale';
    document.getElementById('saveBtn').textContent = '💾 Opret Aftale';
}

function saveAppointment() {
    const customerName = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const service = document.getElementById('service').value.trim();
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const address = document.getElementById('address').value.trim();
    const notes = document.getElementById('notes').value.trim();

    if (!customerName || !phone || !service || !date || !time || !address) {
        showToast('Udfyld venligst alle påkrævede felter (*)', 'warning');
        return;
    }

    const appointment = {
        id: editingId || Date.now(),
        customerName,
        phone,
        email,
        service,
        date,
        time,
        address,
        notes,
        completed: false,
        completedAt: null,
        createdAt: editingId ? appointments.find(a => a.id === editingId)?.createdAt || Date.now() : Date.now()
    };

    if (editingId) {
        appointments = appointments.map(apt => {
            if (apt.id === editingId) {
                appointment.completed = apt.completed;
                appointment.completedAt = apt.completedAt;
                return appointment;
            }
            return apt;
        });
        showToast('Aftale opdateret!', 'success');
    } else {
        appointments.push(appointment);
        showToast('Ny aftale oprettet!', 'success');
    }

    saveToStorage();
    closeModal();
    render();
}

function toggleComplete(id) {
    appointments = appointments.map(apt => {
        if (apt.id === id) {
            apt.completed = !apt.completed;
            apt.completedAt = apt.completed ? Date.now() : null;
            
            if (apt.completed) {
                showToast(`Aftale med ${apt.customerName} markeret som færdig!`, 'success');
            } else {
                showToast(`Aftale med ${apt.customerName} markeret som aktiv`, 'info');
            }
        }
        return apt;
    });
    
    saveToStorage();
    render();
}

function editAppointment(id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;

    document.getElementById('customerName').value = apt.customerName;
    document.getElementById('phone').value = apt.phone;
    document.getElementById('email').value = apt.email || '';
    document.getElementById('service').value = apt.service;
    document.getElementById('date').value = apt.date;
    document.getElementById('time').value = apt.time;
    document.getElementById('address').value = apt.address;
    document.getElementById('notes').value = apt.notes || '';
    
    document.getElementById('modalTitle').textContent = '✏️ Rediger Aftale';
    document.getElementById('saveBtn').textContent = '💾 Gem Ændringer';
    
    editingId = id;
    openModal();
}

function deleteAppointment(id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    
    if (confirm(`Slet aftale med ${apt.customerName}?`)) {
        appointments = appointments.filter(apt => apt.id !== id);
        saveToStorage();
        render();
        showToast('Aftale slettet', 'info');
    }
}

function addToGoogleCalendar(id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;

    const start = new Date(apt.date + 'T' + apt.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const format = dt => dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const title = 'NoKeys - ' + apt.customerName + ' - ' + apt.service;
    const desc = `Kunde: ${apt.customerName}\\nTelefon: ${apt.phone}\\nService: ${apt.service}\\nAdresse: ${apt.address}${apt.notes ? '\\nNoter: ' + apt.notes : ''}`;
    
    const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + 
        encodeURIComponent(title) + '&dates=' + format(start) + '/' + format(end) + 
        '&details=' + encodeURIComponent(desc) + '&location=' + encodeURIComponent(apt.address);

    window.open(url, '_blank');
    showToast('Åbner Google Kalender...', 'info');
}

function render() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const sorted = appointments.slice().sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
    });

    // VIS ALLE ikke-completed aftaler, UANSET om tiden er gået
    const upcoming = sorted.filter(apt => !apt.completed);
    
    const completed = sorted.filter(apt => apt.completed);

    renderUpcoming(upcoming, now, today);
    renderCompleted(completed);
    updateStats(appointments, upcoming, completed, today);
}

function renderUpcoming(upcoming, now, today) {
    const list = document.getElementById('appointmentsList');
    
    if (upcoming.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <div class="empty-text">Ingen kommende aftaler</div>
            </div>
        `;
        return;
    }

    list.innerHTML = upcoming.map(apt => {
        const aptTime = new Date(apt.date + 'T' + apt.time);
        const hoursUntil = (aptTime - now) / (1000 * 60 * 60);
        const isSoon = hoursUntil <= 2 && hoursUntil > 0;
        const isToday = apt.date === today;

        const dateStr = aptTime.toLocaleDateString('da-DK', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });

        const warningClass = isSoon ? 'warning-soon' : (isToday ? 'warning-today' : '');
        const warning = isSoon ? '<div class="warning-badge">⚠️ Starter snart!</div>' : '';

        return `
            <div class="appointment-card ${warningClass}">
                <div class="appointment-header">
                    <button class="check-btn" onclick="toggleComplete(${apt.id})" title="Marker som færdig">✓</button>
                    <div class="appointment-info">
                        <div class="customer-name">${apt.customerName}</div>
                        <div class="service-name">${apt.service}</div>
                    </div>
                </div>
                <div class="appointment-details">
                    <div class="detail-row">📅 ${dateStr} kl. ${apt.time}</div>
                    <div class="detail-row">📍 ${apt.address}</div>
                    <div class="detail-row">📞 ${apt.phone}</div>
                    ${apt.email ? `<div class="detail-row">✉️ ${apt.email}</div>` : ''}
                    ${apt.notes ? `<div class="detail-row">📝 ${apt.notes}</div>` : ''}
                </div>
                ${warning}
                <div class="appointment-actions">
                    <button class="action-btn btn-calendar" onclick="addToGoogleCalendar(${apt.id})" title="Tilføj til Google Kalender">📅 Cal</button>
                    <button class="action-btn btn-edit" onclick="editAppointment(${apt.id})" title="Rediger aftale">✏️ Rediger</button>
                    <button class="action-btn btn-delete" onclick="deleteAppointment(${apt.id})" title="Slet aftale">🗑️ Slet</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCompleted(completed) {
    const section = document.getElementById('completedSection');
    const list = document.getElementById('completedList');
    
    if (completed.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = completed.map(apt => {
        const timeLeft = apt.completedAt ? Math.floor((5 * 60 * 60 * 1000 - (Date.now() - apt.completedAt)) / (1000 * 60)) : 0;
        const hours = Math.floor(timeLeft / 60);
        const mins = timeLeft % 60;
        
        return `
            <div class="appointment-card completed">
                <div class="appointment-header">
                    <button class="check-btn checked" onclick="toggleComplete(${apt.id})" title="Marker som aktiv">✓</button>
                    <div class="appointment-info">
                        <div class="customer-name">${apt.customerName}</div>
                        <div class="service-name">${apt.service}</div>
                        <div style="font-size: 0.75rem; color: #4ade80; margin-top: 4px;">
                            ⏰ Slettes om ${hours}t ${mins}m
                        </div>
                    </div>
                </div>
                <div class="appointment-actions" style="margin-top: 8px;">
                    <button class="action-btn btn-delete" onclick="deleteAppointment(${apt.id})" title="Slet aftale">🗑️ Slet</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats(all, upcoming, completed, today) {
    document.getElementById('upcomingCount').textContent = upcoming.length;
    document.getElementById('completedCount').textContent = completed.filter(apt => apt.date === today).length;
}

setInterval(() => {
    cleanupOldCompleted();
    render();
}, 60000);

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupModalClickOutside();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const timeString = nextHour.toTimeString().slice(0, 5);
    document.getElementById('time').value = timeString;
});
