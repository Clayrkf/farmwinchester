const API_URL = 'https://script.google.com/macros/s/AKfycbxiDmscK411AP60M-_A6ChjlUjKT6qNPpjv6WXv7MJ7tpgxgoaktyjetwX9rWzzzWkJ/exec';

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

let isLoading = false;

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupNavigation();
    setInterval(loadData, 30000);
});

async function loadData() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        const response = await fetch(API_URL + '?action=getAll');
        const result = await response.json();
        
        if (result.members) members = result.members;
        if (result.records) records = result.records;
        if (result.settings) {
            Object.keys(result.settings).forEach(key => {
                if (settings.hasOwnProperty(key)) {
                    settings[key] = Number(result.settings[key]) || result.settings[key];
                }
            });
        }
        
        updateCurrentSection();
        console.log('✅ Dados carregados:', members.length, 'membros');
    } catch (err) {
        console.error('❌ Erro:', err);
    }
    
    isLoading = false;
}

async function sendData(action, data) {
    showLoading('Salvando...');
    
    try {
        // Constrói URL com parâmetros (GET)
        const params = new URLSearchParams({ action: action });
        Object.keys(data).forEach(key => {
            params.append(key, data[key]);
        });
        
        const url = API_URL + '?' + params.toString();
        console.log('📤 Enviando:', url);
        
        // Usa GET (funciona!)
        await fetch(url);
        
        // Aguarda Google processar
        await new Promise(r => setTimeout(r, 2000));
        
        // Recarrega dados
        await loadData();
        hideLoading();
        
        console.log('✅ Salvo com sucesso!');
        return true;
        
    } catch (err) {
        console.error('❌ Erro:', err);
        hideLoading();
        alert('Erro ao salvar: ' + err.message);
        return false;
    }
}

function setupNavigation() {
    document.querySelectorAll('.sidebar nav ul li').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.sidebar nav ul li').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.getAttribute('data-section');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(section).classList.add('active');
        });
    });
}

function updateCurrentSection() {
    const active = document.querySelector('.sidebar nav ul li.active');
    if (!active) return;
    
    const section = active.getAttribute('data-section');
    if (section === 'dashboard') updateDashboard();
    if (section === 'members') updateMembersTable();
    if (section === 'ranking') updateRanking();
    if (section === 'goals') updateGoals();
    if (section === 'history') updateHistory();
    if (section === 'register') updateRegisterForm();
    if (section === 'settings') loadSettings();
}

async function addMember(e) {
    e.preventDefault();
    const name = document.getElementById('member-name').value.trim();
    const role = document.getElementById('member-role').value;
    
    if (!name) {
        alert('Digite o nome!');
        return;
    }
    
    const success = await sendData('addMember', { name, role });
    if (success) {
        closeMemberModal();
        document.getElementById('member-name').value = '';
        alert('✅ Membro adicionado!');
    }
}

async function deleteMember(id) {
    if (!confirm('Excluir membro?')) return;
    const success = await sendData('deleteMember', { id: Number(id) });
    if (success) alert('✅ Membro excluído!');
}

async function quickRegister(e) {
    e.preventDefault();
    
    const memberId = document.getElementById('modal-member').value;
    const routes = document.getElementById('modal-routes').value;
    const valuePerRoute = parseInt(document.getElementById('modal-value').value) || 500000;
    
    if (!memberId || !routes || routes <= 0) {
        alert('Preencha todos os campos!');
        return;
    }
    
    const member = members.find(m => m.ID == memberId);
    if (!member) {
        alert('Membro não encontrado!');
        return;
    }
    
    const total = parseInt(routes) * valuePerRoute;
    
    const success = await sendData('addRecord', {
        memberId: Number(memberId),
        memberName: member.Nome,
        routes: parseInt(routes),
        valuePerRoute: valuePerRoute,
        total: total
    });
    
    if (success) {
        closeModal();
        document.getElementById('modal-routes').value = '';
        alert('✅ Registro salvo!\n' + member.Nome + ' - ' + routes + ' rotas\n' + formatMoney(total));
    }
}

function saveRegister(e) {
    e.preventDefault();
    quickRegister(e);
}

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

function updateRegisterForm() {
    updateMemberSelects();
    document.getElementById('reg-value').value = settings.valuePerRoute;
}

function updateDashboard() {
    document.getElementById('total-members').textContent = members.length;
    document.getElementById('weekly-goal').textContent = settings.weeklyGoal + ' rotas';
    
    const totalRoutes = records.reduce((sum, r) => sum + (Number(r.Rotas) || 0), 0);
    const totalWashed = records.reduce((sum, r) => sum + (Number(r.Total) || 0), 0);
    
    document.getElementById('total-routes-week').textContent = totalRoutes;
    document.getElementById('total-washed').textContent = formatMoney(totalWashed);
    
    document.getElementById('family-box').textContent = formatMoney(totalWashed * 0.15);
    document.getElementById('members-paid').textContent = formatMoney(totalWashed * 0.05);
    document.getElementById('machine-box').textContent = formatMoney(totalWashed * 0.40);
    document.getElementById('client-paid').textContent = formatMoney(totalWashed * 0.50);
    
    updateTopFarmers();
    updateLastRecord();
}

function updateTopFarmers() {
    const sorted = [...members].sort((a, b) => (Number(b.Rotas) || 0) - (Number(a.Rotas) || 0)).slice(0, 5);
    const container = document.getElementById('top-farmers');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:#888;text-align:center">Sem registros</p>';
        return;
    }
    
    container.innerHTML = sorted.map((m, i) => {
        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        const cls = i < 3 ? ['gold','silver','bronze'][i] : '';
        return `<div class="ranking-item" style="margin-bottom:10px">
            <div class="ranking-position ${cls}">${medals[i]}</div>
            <div class="ranking-info">
                <div class="ranking-name">${m.Nome}</div>
                <div class="ranking-progress">
                    <div class="ranking-bar" style="width:${Math.min((m.Rotas/settings.weeklyGoal)*100,100)}%">${m.Rotas} rotas</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function updateLastRecord() {
    if (records.length === 0) {
        document.getElementById('last-record').innerHTML = '<p style="color:#888">Sem registros</p>';
        return;
    }
    
    const last = records[records.length - 1];
    const total = Number(last.Total) || 0;
    
    document.getElementById('last-record').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px">
            <div><strong>Membro:</strong> ${last.MemberName}</div>
            <div><strong>Rotas:</strong> ${last.Rotas}</div>
            <div><strong>Total:</strong> ${formatMoney(total)}</div>
            <div><strong>Data:</strong> ${last.Data}</div>
        </div>`;
}

function updateMembersTable() {
    const tbody = document.getElementById('members-table');
    if (!tbody) return;
    
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888">Nenhum membro</td></tr>';
        return;
    }
    
    tbody.innerHTML = members.map(m => `
        <tr>
            <td>${m.Nome}</td>
            <td>${m.Cargo}</td>
            <td>${m.Rotas}</td>
            <td>${formatMoney(m.TotalLavado)}</td>
            <td><button class="btn-danger" onclick="deleteMember(${m.ID})" style="padding:5px 10px;font-size:12px"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

function updateRanking() {
    const sorted = [...members].sort((a, b) => (Number(b.Rotas) || 0) - (Number(a.Rotas) || 0));
    const container = document.getElementById('ranking-list');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:#888;text-align:center">Sem registros</p>';
        return;
    }
    
    container.innerHTML = sorted.map((m, i) => {
        const cls = i < 3 ? ['gold','silver','bronze'][i] : '';
        const medal = i < 3 ? ['🥇','','🥉'][i] : `${i+1}º`;
        const routes = Number(m.Rotas) || 0;
        const pct = Math.min((routes / settings.weeklyGoal) * 100, 100);
        
        return `<div class="ranking-item">
            <div class="ranking-position ${cls}">${medal}</div>
            <div class="ranking-info">
                <div class="ranking-name">${m.Nome} <small style="color:#888">(${m.Cargo})</small></div>
                <div style="color:var(--primary);font-weight:bold">${routes} rot
