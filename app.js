// Dados iniciais (Mock Data para não ficar vazio na primeira vez)
let members = JSON.parse(localStorage.getItem('winchester_members')) || [
    { id: 1, name: 'Clay', role: 'Líder', routes: 22, totalWashed: 11000000 },
    { id: 2, name: 'Lucas', role: 'Gerente', routes: 20, totalWashed: 10000000 },
    { id: 3, name: 'João', role: 'Membro', routes: 18, totalWashed: 9000000 },
    { id: 4, name: 'Pedro', role: 'Membro', routes: 15, totalWashed: 7500000 },
    { id: 5, name: 'Thiago', role: 'Membro', routes: 14, totalWashed: 7000000 }
];

let records = JSON.parse(localStorage.getItem('winchester_records')) || [
    { id: 1, memberId: 1, memberName: 'Clay', routes: 3, valuePerRoute: 500000, total: 1500000, date: '13/06/2026 08:32' },
    { id: 2, memberId: 2, memberName: 'Lucas', routes: 2, valuePerRoute: 500000, total: 1000000, date: '13/06/2026 07:15' },
    { id: 3, memberId: 3, memberName: 'João', routes: 4, valuePerRoute: 500000, total: 2000000, date: '12/06/2026 22:45' }
];

let settings = JSON.parse(localStorage.getItem('winchester_settings')) || {
    valuePerRoute: 500000,
    dailyGoal: 2,
    weeklyGoal: 14,
    clientPercent: 50,
    machinePercent: 40,
    memberPercent: 5,
    familyPercent: 5,
    vipPercent: 10
};

// Navegação
document.querySelectorAll('.sidebar nav ul li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.sidebar nav ul li').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        const section = this.getAttribute('data-section');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        if (section === 'dashboard') updateDashboard();
        if (section === 'members') updateMembersTable();
        if (section === 'ranking') updateRanking();
        if (section === 'goals') updateGoals();
        if (section === 'history') updateHistory();
        if (section === 'register') updateRegisterForm();
    });
});

// Modal functions
function openModal() {
    updateMemberSelects();
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function openMemberModal() {
    document.getElementById('member-modal').classList.add('active');
}

function closeMemberModal() {
    document.getElementById('member-modal').classList.remove('active');
}

// Update member selects
function updateMemberSelects() {
    const selects = ['modal-member', 'reg-member'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>';
            members.forEach(member => {
                select.innerHTML += `<option value="${member.id}">${member.name} (${member.role})</option>`;
            });
        }
    });
}

// Quick register
function quickRegister(e) {
    e.preventDefault();
    const memberId = parseInt(document.getElementById('modal-member').value);
    const routes = parseInt(document.getElementById('modal-routes').value);
    const valuePerRoute = parseInt(document.getElementById('modal-value').value);
    
    if (!memberId || !routes) {
        alert('Preencha todos os campos!');
        return;
    }
    
    const member = members.find(m => m.id === memberId);
    const total = routes * valuePerRoute;
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const record = {
        id: Date.now(),
        memberId: member.id,
        memberName: member.name,
        routes: routes,
        valuePerRoute: valuePerRoute,
        total: total,
        date: dateStr
    };
    
    records.push(record);
    member.routes += routes;
    member.totalWashed += total;
    
    saveData();
    closeModal();
    updateDashboard();
    
    document.getElementById('modal-routes').value = '';
    alert('Registro salvo com sucesso!');
}

// Save register from form
function saveRegister(e) {
    e.preventDefault();
    quickRegister(e);
    document.getElementById('register-form').reset();
    document.getElementById('reg-value').value = settings.valuePerRoute;
}

// Add member
function addMember(e) {
    e.preventDefault();
    const name = document.getElementById('member-name').value;
    const role = document.getElementById('member-role').value;
    
    const newMember = {
        id: Date.now(),
        name: name,
        role: role,
        routes: 0,
        totalWashed: 0
    };
    
    members.push(newMember);
    saveData();
    closeMemberModal();
    updateMembersTable();
    updateDashboard();
    
    document.getElementById('member-name').value = '';
    alert('Membro adicionado com sucesso!');
}

// Delete member
function deleteMember(id) {
    if (confirm('Tem certeza que deseja excluir este membro?')) {
        members = members.filter(m => m.id !== id);
        records = records.filter(r => r.memberId !== id);
        saveData();
        updateMembersTable();
        updateDashboard();
    }
}

// Update register form
function updateRegisterForm() {
    updateMemberSelects();
    document.getElementById('reg-value').value = settings.valuePerRoute;
}

// Update dashboard
function updateDashboard() {
    document.getElementById('total-members').textContent = members.length;
    document.getElementById('weekly-goal').textContent = `${settings.weeklyGoal} rotas`;
    
    const totalRoutes = records.reduce((sum, r) => sum + r.routes, 0);
    const totalWashed = records.reduce((sum, r) => sum + r.total, 0);
    
    document.getElementById('total-routes-week').textContent = totalRoutes;
    document.getElementById('total-washed').textContent = formatMoney(totalWashed);
    
    // Calculate distributions
    const familyBox = totalWashed * ((settings.familyPercent + settings.vipPercent) / 100);
    const membersPaid = totalWashed * (settings.memberPercent / 100);
    const machineBox = totalWashed * (settings.machinePercent / 100);
    const clientPaid = totalWashed * (settings.clientPercent / 100);
    
    document.getElementById('family-box').textContent = formatMoney(familyBox);
    document.getElementById('members-paid').textContent = formatMoney(membersPaid);
    document.getElementById('machine-box').textContent = formatMoney(machineBox);
    document.getElementById('client-paid').textContent = formatMoney(clientPaid);
    
    // Top farmers
    updateTopFarmers();
    
    // Last record
    updateLastRecord();
}

function updateTopFarmers() {
    const sorted = [...members].sort((a, b) => b.routes - a.routes).slice(0, 5);
    const container = document.getElementById('top-farmers');
    
    container.innerHTML = sorted.map((member, index) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        return `
            <div class="ranking-item" style="margin-bottom: 10px;">
                <div class="ranking-position ${index < 3 ? ['gold', 'silver', 'bronze'][index] : ''}">
                    ${medals[index]}
                </div>
                <div class="ranking-info">
                    <div class="ranking-name">${member.name}</div>
                    <div class="ranking-progress">
                        <div class="ranking-bar" style="width: ${Math.min((member.routes / settings.weeklyGoal) * 100, 100)}%">
                            ${member.routes} rotas
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateLastRecord() {
    if (records.length === 0) {
        document.getElementById('last-record').innerHTML = '<p>Nenhum registro encontrado</p>';
        return;
    }
    
    const last = records[records.length - 1];
    const client = last.total * (settings.clientPercent / 100);
    const machine = last.total * (settings.machinePercent / 100);
    const member = last.total * (settings.memberPercent / 100);
    const family = last.total * ((settings.familyPercent + settings.vipPercent) / 100);
    
    document.getElementById('last-record').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div><strong>Membro:</strong> ${last.memberName}</div>
            <div><strong>Rotas:</strong> ${last.routes}</div>
            <div><strong>Total:</strong> ${formatMoney(last.total)}</div>
            <div><strong>Cliente:</strong> ${formatMoney(client)}</div>
            <div><strong>Máquina:</strong> ${formatMoney(machine)}</div>
            <div><strong>Membro:</strong> ${formatMoney(member)}</div>
            <div><strong>Família:</strong> ${formatMoney(family)}</div>
            <div><strong>Data:</strong> ${last.date}</div>
        </div>
    `;
}

// Update members table
function updateMembersTable() {
    const tbody = document.getElementById('members-table');
    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.name}</td>
            <td><span class="badge">${member.role}</span></td>
            <td>${member.routes}</td>
            <td>${formatMoney(member.totalWashed)}</td>
            <td>
                <button class="btn-danger" onclick="deleteMember(${member.id})" style="padding: 5px 10px; font-size: 12px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Update ranking
function updateRanking() {
    const sorted = [...members].sort((a, b) => b.routes - a.routes);
    const container = document.getElementById('ranking-list');
    
    container.innerHTML = sorted.map((member, index) => {
        const medals = ['gold', 'silver', 'bronze'];
        const medalClass = index < 3 ? medals[index] : '';
        const medal = index < 3 ? ['', '🥈', '🥉'][index] : `${index + 1}º`;
        const percent = Math.min((member.routes / settings.weeklyGoal) * 100, 100);
        
        return `
            <div class="ranking-item">
                <div class="ranking-position ${medalClass}">${medal}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${member.name} <small style="color: #888;">(${member.role})</small></div>
                    <div style="color: var(--primary); font-weight: bold;">${member.routes} rotas - ${formatMoney(member.totalWashed)} lavado</div>
                    <div class="ranking-progress">
                        <div class="ranking-bar" style="width: ${percent}%">
                            ${percent.toFixed(0)}% da meta
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update goals
function updateGoals() {
    const container = document.getElementById('goals-list');
    
    // Calculate daily and weekly progress for each member
    const today = new Date().toDateString();
    const weeklyStart = getWeekStart();
    
    container.innerHTML = members.map(member => {
        const todayRecords = records.filter(r => {
            const recordDate = new Date(r.date.split('/').reverse().join('-'));
            return r.memberId === member.id && recordDate.toDateString() === today;
        });
        
        const weeklyRecords = records.filter(r => {
            const recordDate = new Date(r.date.split('/').reverse().join('-'));
            return r.memberId === member.id && recordDate >= weeklyStart;
        });
        
        const dailyRoutes = todayRecords.reduce((sum, r) => sum + r.routes, 0);
        const weeklyRoutes = weeklyRecords.reduce((sum, r) => sum + r.routes, 0);
        
        const dailyPercent = Math.min((dailyRoutes / settings.dailyGoal) * 100, 100);
        const weeklyPercent = Math.min((weeklyRoutes / settings.weeklyGoal) * 100, 100);
        
        const dailySuccess = dailyRoutes >= settings.dailyGoal;
        const weeklySuccess = weeklyRoutes >= settings.weeklyGoal;
        
        return `
            <div class="goal-item">
                <div class="goal-header">
                    <div class="goal-name">${member.name}</div>
                    <div class="goal-status ${weeklySuccess ? 'success' : 'fail'}">
                        ${weeklySuccess ? '✅ Meta Semanal' : '❌ Meta Semanal'}
                    </div>
                </div>
                <div class="goal-bars">
                    <div class="goal-bar-item">
                        <label>Meta Diária (${settings.dailyGoal} rotas)</label>
                        <div class="goal-bar">
                            <div class="goal-bar-fill" style="width: ${dailyPercent}%">
                                ${dailyRoutes}/${settings.dailyGoal} ${dailySuccess ? '✅' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="goal-bar-item">
                        <label>Meta Semanal (${settings.weeklyGoal} rotas)</label>
                        <div class="goal-bar">
                            <div class="goal-bar-fill" style="width: ${weeklyPercent}%">
                                ${weeklyRoutes}/${settings.weeklyGoal} ${weeklySuccess ? '✅' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
}

// Update history
function updateHistory() {
    const tbody = document.getElementById('history-table');
    const sorted = [...records].sort((a, b) => b.id - a.id);
    
    tbody.innerHTML = sorted.map(record => {
        const client = record.total * (settings.clientPercent / 100);
        const machine = record.total * (settings.machinePercent / 100);
        const member = record.total * (settings.memberPercent / 100);
        const family = record.total * ((settings.familyPercent + settings.vipPercent) / 100);
        
        return `
            <tr>
                <td>${record.date}</td>
                <td>${record.memberName}</td>
                <td>${record.routes}</td>
                <td>${formatMoney(record.total)}</td>
                <td style="font-size: 12px;">
                    Cli: ${formatMoney(client)} | Máq: ${formatMoney(machine)} | Mem: ${formatMoney(member)} | Fam: ${formatMoney(family)}
                </td>
            </tr>
        `;
    }).join('');
}

// Save settings
function saveSettings(e) {
    e.preventDefault();
    settings = {
        valuePerRoute: parseInt(document.getElementById('set-value-per-route').value),
        dailyGoal: parseInt(document.getElementById('set-daily-goal').value),
        weeklyGoal: parseInt(document.getElementById('set-weekly-goal').value),
        clientPercent: parseInt(document.getElementById('set-client').value),
        machinePercent: parseInt(document.getElementById('set-machine').value),
        memberPercent: parseInt(document.getElementById('set-member').value),
        familyPercent: parseInt(document.getElementById('set-family').value),
        vipPercent: parseInt(document.getElementById('set-vip').value)
    };
    
    saveData();
    alert('Configurações salvas com sucesso!');
    updateDashboard();
}

// Clear history
function clearHistory() {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
        records = [];
        members.forEach(m => {
            m.routes = 0;
            m.totalWashed = 0;
        });
        saveData();
        updateHistory();
        updateDashboard();
    }
}

// Utility functions
function formatMoney(value) {
    return 'R$ ' + value.toLocaleString('pt-BR');
}

function saveData() {
    localStorage.setItem('winchester_members', JSON.stringify(members));
    localStorage.setItem('winchester_records', JSON.stringify(records));
    localStorage.setItem('winchester_settings', JSON.stringify(settings));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    updateMemberSelects();
});

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
