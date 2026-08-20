// 1. Initialize Supabase Admin Client
const SUPABASE_URL = "https://bwzrklomhkoxbmpimpwc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3enJrbG9taGtveGJtcGltcHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzEzOTYsImV4cCI6MjEwMjUwNzM5Nn0.z3AiguJaFH9Ybjg-xWMJZQQ5eLSrWvlDKlyVd4KdTis"; // Paste your long anon key string here
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  await loadAdminDashboard();
});

async function loadAdminDashboard() {
  try {
    // Fetch Visits Data
    const { data: visits, error: visitErr } = await supabaseAdmin
      .from('visits')
      .select('*')
      .order('created_at', { ascending: false });

    if (visitErr) throw visitErr;

    // Fetch Expenses Data
    const { data: expenses, error: expErr } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (expErr) throw expErr;

    const safeVisits = visits || [];
    const safeExpenses = expenses || [];

    // 2. Update KPI Metrics
    const totalVisitsEl = document.getElementById('totalVisits');
    if (totalVisitsEl) totalVisitsEl.innerText = safeVisits.length;

    const totalCollected = safeVisits.reduce((sum, v) => sum + (parseFloat(v.amount_collected) || 0), 0);
    const totalCollectedEl = document.getElementById('totalCollected');
    if (totalCollectedEl) totalCollectedEl.innerText = totalCollected.toFixed(2);

    const pendingExpenses = safeExpenses.filter(e => e.status === 'Pending' || !e.status).length;
    const pendingExpensesEl = document.getElementById('pendingExpenses');
    if (pendingExpensesEl) pendingExpensesEl.innerText = pendingExpenses;

    const totalExpenses = safeExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalExpensesEl = document.getElementById('totalExpenses');
    if (totalExpensesEl) totalExpensesEl.innerText = totalExpenses.toFixed(2);

    // 3. Render Visits Table
    const visitTable = document.getElementById('visitLogsTable');
    if (visitTable) {
      if (safeVisits.length === 0) {
        visitTable.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">No visits logged yet.</td></tr>`;
      } else {
        visitTable.innerHTML = safeVisits.map(v => {
          const dateStr = v.created_at ? new Date(v.created_at).toLocaleString() : 'N/A';
          const mapLink = (v.latitude && v.longitude) 
            ? `<a href="https://maps.google.com/?q=${v.latitude},${v.longitude}" target="_blank" class="text-blue-600 hover:underline font-semibold">📍 View Map</a>` 
            : '<span class="text-gray-400">No GPS</span>';

          return `
            <tr class="text-sm border-b hover:bg-gray-50">
              <td class="p-3 text-gray-500 text-xs">${dateStr}</td>
              <td class="p-3 font-semibold text-gray-800">${v.agent_name || '-'}</td>
              <td class="p-3 text-gray-600">${v.account_number || '-'}</td>
              <td class="p-3"><span class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">${v.outcome || '-'}</span></td>
              <td class="p-3 font-bold text-green-600">KES ${(parseFloat(v.amount_collected) || 0).toFixed(2)}</td>
              <td class="p-3">${mapLink}</td>
              <td class="p-3 text-gray-500 max-w-xs truncate">${v.notes || '-'}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 4. Render Expenses Table
    const expTable = document.getElementById('expensesTableBody');
    if (expTable) {
      if (safeExpenses.length === 0) {
        expTable.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400">No expenses claimed yet.</td></tr>`;
      } else {
        expTable.innerHTML = safeExpenses.map(e => {
          const dateStr = e.created_at ? new Date(e.created_at).toLocaleString() : 'N/A';
          const receiptLink = e.receipt_url 
            ? `<a href="${e.receipt_url}" target="_blank" class="text-blue-600 hover:underline font-semibold">📷 View Receipt</a>` 
            : '<span class="text-gray-400">None</span>';

          return `
            <tr class="text-sm border-b hover:bg-gray-50">
              <td class="p-3 text-gray-500 text-xs">${dateStr}</td>
              <td class="p-3 font-semibold text-gray-800">${e.agent_name || '-'}</td>
              <td class="p-3 text-gray-600">${e.category || '-'}</td>
              <td class="p-3 font-bold text-gray-800">KES ${(parseFloat(e.amount) || 0).toFixed(2)}</td>
              <td class="p-3">${receiptLink}</td>
              <td class="p-3"><span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">${e.status || 'Pending'}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.error('Admin Load Error:', err);
    alert('Failed to load admin data: ' + err.message);
  }
}