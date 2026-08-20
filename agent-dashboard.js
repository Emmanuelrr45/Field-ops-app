// 1. Initialize Supabase Client
const SUPABASE_URL = "https://bwzrklomhkoxbmpimpwc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3enJrbG9taGtveGJtcGltcHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzEzOTYsImV4cCI6MjEwMjUwNzM5Nn0.z3AiguJaFH9Ybjg-xWMJZQQ5eLSrWvlDKlyVd4KdTis";
const supabaseAgent = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let loggedInAgentName = localStorage.getItem('currentAgentName') || '';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('agentLoginForm');
    const loginContainer = document.getElementById('agentLoginContainer');
    const dashboardContainer = document.getElementById('agentDashboardContainer');
    const agentGreeting = document.getElementById('agentGreeting');
    const logoutBtn = document.getElementById('agentLogoutBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');

    // Auto-load if already logged in during session
    if (loggedInAgentName) {
        showDashboard(loggedInAgentName);
    }

    // Login Handler
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('loginAgentName').value.trim();
            if (!nameInput) return;

            loggedInAgentName = nameInput;
            localStorage.setItem('currentAgentName', loggedInAgentName);
            showDashboard(loggedInAgentName);
        });
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentAgentName');
            loggedInAgentName = '';
            dashboardContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            document.getElementById('loginAgentName').value = '';
        });
    }

    // Excel / CSV Export Handler
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', async () => {
            try {
                const { data: visits, error } = await supabaseAgent
                    .from('visits')
                    .select('*')
                    .ilike('agent_name', loggedInAgentName)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (!visits || visits.length === 0) {
                    alert('No reports found to export.');
                    return;
                }

                const headers = [
                    'ID', 'Date', 'Agent Name', 'CFID', 'Customer Name', 
                    'Account Number', 'Client Account Name', 'Outcome', 
                    'Amount Collected', 'Expenses Incurred', 'Notes', 'Latitude', 'Longitude', 'Photo URL'
                ];

                const csvRows = [headers.join(',')];

                visits.forEach(v => {
                    const row = [
                        v.id,
                        `"${v.created_at || ''}"`,
                        `"${(v.agent_name || '').replace(/"/g, '""')}"`,
                        `"${(v.cfid || '').replace(/"/g, '""')}"`,
                        `"${(v.customer_name || '').replace(/"/g, '""')}"`,
                        `"${(v.account_number || '').replace(/"/g, '""')}"`,
                        `"${(v.client_name || '').replace(/"/g, '""')}"`,
                        `"${(v.outcome || '').replace(/"/g, '""')}"`,
                        v.amount_collected || 0,
                        v.expenses_incurred || 0,
                        `"${(v.notes || '').replace(/"/g, '""')}"`,
                        v.latitude || '',
                        v.longitude || '',
                        `"${(v.photo_url || '').replace(/"/g, '""')}"`
                    ];
                    csvRows.push(row.join(','));
                });

                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', `${loggedInAgentName.replace(/\s+/g, '_')}_reports.csv`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (err) {
                console.error('Export Error:', err);
                alert('❌ Failed to export reports: ' + err.message);
            }
        });
    }
});

async function showDashboard(agentName) {
    document.getElementById('agentLoginContainer').classList.add('hidden');
    document.getElementById('agentDashboardContainer').classList.remove('hidden');
    document.getElementById('agentGreeting').innerText = `Logged in as: ${agentName}`;

    await loadAgentData(agentName);
}

async function loadAgentData(agentName) {
    try {
        const { data: visits, error } = await supabaseAgent
            .from('visits')
            .select('*')
            .ilike('agent_name', agentName)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById('agentVisitsTableBody');
        tableBody.innerHTML = '';

        let totalVisits = visits.length;
        let totalCollected = 0;
        let totalExpenses = 0;

        if (totalVisits === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-500">No visit logs found for ${agentName}.</td></tr>`;
        } else {
            visits.forEach(v => {
                totalCollected += Number(v.amount_collected || 0);
                totalExpenses += Number(v.expenses_incurred || 0);

                const formattedDate = v.created_at ? new Date(v.created_at).toLocaleString() : 'N/A';

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-gray-50';
                tr.innerHTML = `
                    <td class="p-3 text-xs text-gray-500">${formattedDate}</td>
                    <td class="p-3 font-medium text-gray-900">${v.cfid || '-'}</td>
                    <td class="p-3 text-gray-700">${v.customer_name || '-'}</td>
                    <td class="p-3 font-mono text-xs">${v.account_number || '-'}</td>
                    <td class="p-3">${v.client_name || '-'}</td>
                    <td class="p-3"><span class="px-2 py-1 text-xs rounded-full font-semibold ${getOutcomeBadgeClass(v.outcome)}">${v.outcome || 'N/A'}</span></td>
                    <td class="p-3 text-green-600 font-semibold">${Number(v.amount_collected || 0).toLocaleString()}</td>
                    <td class="p-3 text-orange-600 font-semibold">${Number(v.expenses_incurred || 0).toLocaleString()}</td>
                    <td class="p-3 text-gray-500 text-xs">${v.notes || '-'}</td>
                `;
                tableBody.appendChild(tr);
            });
        }

        // Update metric cards
        document.getElementById('statVisitsCount').innerText = totalVisits;
        document.getElementById('statTotalCollected').innerText = totalCollected.toLocaleString();
        document.getElementById('statTotalExpenses').innerText = totalExpenses.toLocaleString();

    } catch (err) {
        console.error('Error loading agent data:', err);
        alert('Could not load performance data.');
    }
}

function getOutcomeBadgeClass(outcome) {
    switch (outcome) {
        case 'Paid': return 'bg-green-100 text-green-800';
        case 'Promised to Pay': return 'bg-yellow-100 text-yellow-800';
        case 'Not Found': return 'bg-gray-100 text-gray-800';
        case 'Refused': return 'bg-red-100 text-red-800';
        default: return 'bg-blue-100 text-blue-800';
    }
}