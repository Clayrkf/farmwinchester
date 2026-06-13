// ============================================
// API WINCHESTER - GOOGLE SHEETS SYNC (v2)
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbyTO20AHtg5bexiywVKw6acM7OKyJcxQ-tAK0mJqu2OljrMj0Z-hZHIdpSprLIFbPww/exec';

let members = [];
let records = [];
let settings = {
    valuePerRoute: 500000,
    dailyGoal: 2,
    weeklyGoal: 14,
    clientPercent: 50,
    machinePercent: 40,
    memberPercent: 5,
    familyPercent: 5,
    vipPercent: 10
};

// ============ INICIALIZAÇÃO ============

document.addEventListener('DOMContentLoaded', async function() {
    showLoading('Carregando dados...');
    await loadAllData();
    hideLoading();
    
    updateDashboard();
    updateMemberSelects();
    
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
            if (section === 'register') {
                updateRegisterForm();
                updateMemberSelects();
            }
            if (section === 'settings') loadSettings();
        });
    });
    
    // Auto-refresh a cada 30 segundos
    setInterval(async () => {
        await loadAllData();
        updateCurrentSection();
    }, 30000);
});

function updateCurrentSection() {
    const active = document.querySelector('.sidebar nav ul li.active');
    if (active) {
        const section = active.getAttribute('data-section');
        if (section === 'dashboard') updateDashboard();
        if (section === 'members') updateMembersTable();
        if (section === 'ranking') updateRanking();
        if (section === 'goals') updateGoals();
        if (section === 'history') updateHistory();
    }
}

// ============ API CALLS ============

async function loadAllData() {
    try {
        const response = await fetch(API_URL + '?action=getAll', {
            method: 'GET',
            redirect: 'follow'
        });
        const result = await response.json();
        
        if (result && result.members !== undefined) {
            members = result.members || [];
            records = result.records || [];
            settings = { ...settings, ...(result.settings || {}) };
            
            // Converter valores para número
            members.forEach(m => {
                m.Rotas = Number(m.Rotas) || 0;
                m.TotalLavado = Number(m.TotalLavado) || 0;
            });
            
            records.forEach(r => {
                r.Rotas = Number(r.Rotas) || 0;
                r.ValorRota = Number(r.ValorRota) || 0;
                r.Total = Number(r.Total) || 0;
            });
            
            Object.keys(settings).forEach(key => {
                settings[key] = Number(settings[key]) || settings[key];
            });
            
            console.log('✅ Dados carregados:', { members: members.length, records: records.length });
        }
    } catch (err) {
        console.error('❌ Erro ao carregar dados:', err);
    }
}

async function apiPost(action, data) {
    try {
        const formData = new FormData();
        formData.append('data', JSON.stringify({ action, ...data }));
        
        await fetch(API_URL, {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        });
        
        // Espera 1 segundo para o Google Sheets processar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recarrega os dados
        await loadAllData();
        return true;
    } catch (err) {
        console.error('❌ Erro na API:', err);
        alert('Erro ao salvar dados. Tente novamente.');
        return false;
    }
}

// ============ MODAL FUNCTIONS ============

function openModal() {
    updateMemberSelects();
    document.getElementById('modal').classList.add('active');
    document.getElementById('modal-routes').value = '';
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

function updateMemberSelects() {
    const selects = ['modal-member', 'reg-member'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>';
            members.forEach(member => {
                select.innerHTML += `<option value="${member.ID}">${member.Nome} (${member.Cargo})</option>`;
            });
        }
    });
}

// ============ REGISTRO ============

async function quickRegister(e) {
    if (e) e.preventDefault();
    
    const memberId = document.getElementById('modal-member').value;
    const routes = document.getElementById('modal-routes').value;
    const valuePerRoute = document.getElementById('modal-value').value;
    
    if (!memberId || !routes || routes <= 0) {
        alert('Por favor, preencha todos os campos corretamente!');
        return false;
    }
    
    const member = members.find(m => m.ID == memberId);
    if (!member) {
        alert('Membro não encontrado!');
        return false;
    }
    
    const total = parseInt(routes) * parseInt(valuePerRoute);
    
    showLoading('Salvando registro...');
    
    const success = await apiPost('addRecord', {
        memberId: parseInt(memberId),
        memberName: member.Nome,
        routes: parseInt(routes),
        valuePerRoute: parseInt(valuePerRoute),
        total: total
    });
    
    if (success) {
        closeModal();
        updateDashboard();
        updateMembersTable();
        document.getElementById('modal-routes').value = '';
        hideLoading();
        alert('✅ Registro salvo com sucesso!\n\nMembro: ' + member.Nome + '\nRotas: ' + routes + '\nTotal: ' + formatMoney(total));
    } else {
        hideLoading();
    }
    
    return false;
}

function saveRegister(e) {
    if (e) e.preventDefault();
    return quickRegister(e);
}

// ============ MEMBROS ============

async function addMember(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('member-name').value.trim();
    const role = document.getElementById('member-role').value;
    
    if (!name) {
        alert('Digite o nome do membro!');
        return false;
    }
    
    showLoading('Adicionando membro...');
    
    const success = await apiPost('addMember', { name, role });
    
    if (success) {
        closeMemberModal();
        updateMembersTable();
        updateDashboard();
        document.getElementById('member-name').value = '';
        hideLoading();
        alert('✅ Membro adicionado com sucesso!');
    } else {
        hideLoading();
    }
    
    return false;
}

async function deleteMember(id) {
    if (!confirm('⚠️ Tem certeza que deseja excluir este membro? Todos os registros dele serão apagados!')) {
        return;
    }
    
    showLoading('Excluindo membro...');
    
    const success = await apiPost('deleteMember', { id: parseInt(id) });
    
    if (success) {
        updateMembersTable();
        updateDashboard();
        hideLoading();
        alert('✅ Membro excluído!');
    } else {
        hideLoading();
    }
}

// ============ DASHBOARD ============

function updateDashboard() {
    document.getElementById('total-members').textContent = members.length;
    document.getElementById('weekly-goal').textContent = settings.weeklyGoal + ' rotas';
    
    const totalRoutes = records.reduce((sum, r) => sum + (Number(r.Rotas) || 0), 0);
    const totalWashed = records.reduce((sum, r) => sum + (Number(r.Total) || 0), 0);
    
    document.getElementById('total-routes-week').textContent = totalRoutes;
    document.getElementById('total-washed').textContent = formatMoney(totalWashed);
    
    const familyBox = totalWashed * ((settings.familyPercent + settings.vipPercent) / 100);
    const membersPaid = totalWashed * (settings.memberPercent / 100);
    const machineBox = totalWashed * (settings.machinePercent / 100);
    const clientPaid = totalWashed * (settings.clientPercent / 100);
    
    document.getElementById('family-box').textContent = formatMoney(familyBox);
    document.getElementById('members-paid').textContent = formatMoney(membersPaid);
    document.getElementById('machine-box').textContent = formatMoney(machineBox);
    document.getElementById('client-paid').textContent = formatMoney(clientPaid);
    
    updateTopFarmers();
    updateLastRecord();
}

function updateTopFarmers() {
    const sorted = [...members].sort((a, b) => (Number(b.Rotas) || 0) - (Number(a.Rotas) || 0)).slice(0, 5);
    const container = document.getElementById('top-farmers');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">Nenhum registro ainda</p>';
        return;
    }
    
    container.innerHTML = sorted.map((member, index) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const medalClass = index < 3 ? ['gold', 'silver', 'bronze'][index] : '';
        const routes = Number(member.Rotas) || 0;
        return `
            <div class="ranking-item" style="margin-bottom: 10px;">
                <div class="ranking-position ${medalClass}">
                    ${medals[index]}
                </div>
                <div class="ranking-info">
                    <div class="ranking-name">${member.Nome}</div>
                    <div class="ranking-progress">
                        <div class="ranking-bar" style="width: ${Math.min((routes / settings.weeklyGoal) * 100, 100)}%">
                            ${routes} rotas
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateLastRecord() {
    if (records.length === 0) {
        document.getElementById('last-record').innerHTML = '<p style="color: #888;">Nenhum registro encontrado</p>';
        return;
    }
    
    const last = records[records.length - 1];
    const total = Number(last.Total) || 0;
    const client = total * (settings.clientPercent / 100);
    const machine = total * (settings.machinePercent / 100);
    const member = total * (settings.memberPercent / 100);
    const family = total * ((settings.familyPercent + settings.vipPercent) / 100);
    
    document.getElementById('last-record').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div><strong>Membro:</strong> ${last.MemberName}</div>
            <div><strong>Rotas:</strong> ${last.Rotas}</div>
            <div><strong>Total:</strong> ${formatMoney(total)}</div>
            <div><strong>Cliente:</strong> ${formatMoney(client)}</div>
            <div><strong>Máquina:</strong> ${formatMoney(machine)}</div>
            <div><strong>Membro:</strong> ${formatMoney(member)}</div>
            <div><strong>Família:</strong> ${formatMoney(family)}</div>
            <div><strong>Data:</strong> ${last.Data}</div>
        </div>
    `;
}

// ============ MEMBROS TABLE ============

function updateMembersTable() {
    const tbody = document.getElementById('members-table');
    if (!tbody) return;
    
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">Nenhum membro cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.Nome}</td>
            <td>${member.Cargo}</td>
            <td>${member.Rotas}</td>
            <td>${formatMoney(member.TotalLavado)}</td>
            <td>
                <button class="btn-danger" onclick="deleteMember(${member.ID})" style="padding: 5px 10px; font-size: 12px;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============ RANKING ============

function updateRanking() {
    const sorted = [...members].sort((a, b) => (Number(b.Rotas) || 0) - (Number(a.Rotas) || 0));
    const container = document.getElementById('ranking-list');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">Nenhum registro ainda</p>';
        return;
    }
    
    container.innerHTML = sorted.map((member, index) => {
        const medalClass = index < 3 ? ['gold', 'silver', 'bronze'][index] : '';
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}º`;
        const routes = Number(member.Rotas) || 0;
        const percent = Math.min((routes / settings.weeklyGoal) * 100, 100);
        
        return `
            <div class="ranking-item">
                <div class="ranking-position ${medalClass}">${medal}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${member.Nome} <small style="color: #888;">(${member.Cargo})</small></div>
                    <div style="color: var(--primary); font-weight: bold;">${routes} rotas - ${formatMoney(member.TotalLavado)} lavado</div>
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

// ============ METAS ============

function updateGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weeklyStart = new Date();
    weeklyStart.setDate(weeklyStart.getDate() - weeklyStart.getDay() + (weeklyStart.getDay() === 0 ? -6 : 1));
    weeklyStart.setHours(0, 0, 0, 0);
    
    if (members.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center;">Nenhum membro cadastrado</p>';
        return;
    }
    
    container.innerHTML = members.map(member => {
        const todayRecords = records.filter(r => {
            if (!r.Data) return false;
            try {
                const parts = r.Data.split(' ')[0].split('/');
                const recordDate = new Date(parts[2], parts[1] - 1, parts[0]);
                recordDate.setHours(0, 0, 0, 0);
                return r.MemberID == member.ID && recordDate.getTime() === today.getTime();
            } catch { return false; }
        });
        
        const weeklyRecords = records.filter(r => {
            if (!r.Data) return false;
            try {
                const parts = r.Data.split(' ')[0].split('/');
                const recordDate = new Date(parts[2], parts[1] - 1, parts[0]);
                recordDate.setHours(0, 0, 0, 0);
                return r.MemberID == member.ID && recordDate >= weeklyStart;
            } catch { return false; }
        });
        
        const dailyRoutes = todayRecords.reduce((sum, r) => sum + (Number(r.Rotas) || 0), 0);
        const weeklyRoutes = weeklyRecords.reduce((sum, r) => sum + (Number(r.Rotas) || 0), 0);
        
        const dailyPercent = Math.min((dailyRoutes / settings.dailyGoal) * 100, 100);
        const weeklyPercent = Math.min((weeklyRoutes / settings.weeklyGoal) * 100, 100);
        
        const dailySuccess = dailyRoutes >= settings.dailyGoal;
        const weeklySuccess = weeklyRoutes >= settings.weeklyGoal;
        
        return `
            <div class="goal-item">
                <div class="goal-header">
                    <div class="goal-name">${member.Nome}</div>
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

// ============ HISTÓRICO ============

function updateHistory() {
    const tbody = document.getElementById('history-table');
    if (!tbody) return;
    
    const sorted = [...records].sort((a, b) => b.ID - a.ID);
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">Nenhum registro encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = sorted.map(record => {
        const total = Number(record.Total) || 0;
        const client = total * (settings.clientPercent / 100);
        const machine = total * (settings.machinePercent / 100);
        const member = total * (settings.memberPercent / 100);
        const family = total * ((settings.familyPercent + settings.vipPercent) / 100);
        
        return `
            <tr>
                <td>${record.Data}</td>
                <td>${record.MemberName}</td>
                <td>${record.Rotas}</td>
                <td>${formatMoney(total)}</td>
                <td style="font-size: 12px;">
                    Cli: ${formatMoney(client)} | Máq: ${formatMoney(machine)} | Mem: ${formatMoney(member)} | Fam: ${formatMoney(family)}
                </td>
            </tr>
        `;
    }).join('');
}

// ============ CONFIGURAÇÕES ============

function loadSettings() {
    document.getElementById('set-value-per-route').value = settings.valuePerRoute;
    document.getElementById('set-daily-goal').value = settings.dailyGoal;
    document.getElementById('set-weekly-goal').value = settings.weeklyGoal;
    document.getElementById('set-client').value = settings.clientPercent;
    document.getElementById('set-machine').value = settings.machinePercent;
    document.getElementById('set-member').value = settings.memberPercent;
    document.getElementById('set-family').value = settings.familyPercent;
    document.getElementById('set-vip').value = settings.vipPercent;
}

async function saveSettings(e) {
    if (e) e.preventDefault();
    
    const newSettings = {
        valuePerRoute: parseInt(document.getElementById('set-value-per-route').value) || 500000,
        dailyGoal: parseInt(document.getElementById('set-daily-goal').value) || 2,
        weeklyGoal: parseInt(document.getElementById('set-weekly-goal').value) || 14,
        clientPercent: parseInt(document.getElementById('set-client').value) || 50,
        machinePercent: parseInt(document.getElementById('set-machine').value) || 40,
        memberPercent: parseInt(document.getElementById('set-member').value) || 5,
        familyPercent: parseInt(document.getElementById('set-family').value) || 5,
        vipPercent: parseInt(document.getElementById('set-vip').value) || 10
    };
    
    showLoading('Salvando configurações...');
    
    const success = await apiPost('updateSettings', newSettings);
    
    if (success) {
        settings = newSettings;
        updateDashboard();
        hideLoading();
        alert('✅ Configurações salvas com sucesso!');
    } else {
        hideLoading();
    }
    
    return false;
}

function updateRegisterForm() {
    updateMemberSelects();
    document.getElementById('reg-value').value = settings.valuePerRoute;
}

// ============ LIMPAR HISTÓRICO ============

async function clearHistory() {
    if (!confirm('⚠️ ATENÇÃO: Tem certeza que deseja limpar TODO o histórico? Esta ação NÃO pode ser desfeita!')) {
        return;
    }
    
    showLoading('Limpando histórico...');
    
    const success = await apiPost('clearHistory', {});
    
    if (success) {
        updateHistory();
        updateDashboard();
        updateGoals();
        hideLoading();
        alert('✅ Histórico limpo!');
    } else {
        hideLoading();
    }
}

// ============ HELPERS ============

function formatMoney(value) {
    return 'R$ ' + (Number(value) || 0).toLocaleString('pt-BR');
}

function showLoading(msg) {
    let loader = document.getElementById('loading-overlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loading-overlay';
        loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;';
        loader.innerHTML = '<div style="color:#00FF66;font-size:24px;font-weight:bold;">⏳</div><div id="loading-msg" style="color:#00FF66;margin-top:10px;">Carregando...</div>';
        document.body.appendChild(loader);
    }
    document.getElementById('loading-msg').textContent = msg || 'Carregando...';
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
