// 1. Initialize Supabase Agent Client
const SUPABASE_URL = "https://bwzrklomhkoxbmpimpwc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3enJrbG9taGtveGJtcGltcHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzEzOTYsImV4cCI6MjEwMjUwNzM5Nn0.z3AiguJaFH9Ybjg-xWMJZQQ5eLSrWvlDKlyVd4KdTis";
const supabaseAgent = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLatitude = null;
let currentLongitude = null;

document.addEventListener('DOMContentLoaded', () => {
  const gpsBtn = document.getElementById('getGpsBtn');
  const gpsStatus = document.getElementById('gpsStatus');
  const visitForm = document.getElementById('reportForm');

  // 2. GPS Button Handler
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      gpsStatus.innerText = 'Acquiring location...';
      gpsStatus.className = 'text-xs text-center text-yellow-600 font-semibold mt-2';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          currentLatitude = position.coords.latitude;
          currentLongitude = position.coords.longitude;
          gpsStatus.innerText = `📍 GPS Verified ✓ (${currentLatitude.toFixed(4)}, ${currentLongitude.toFixed(4)})`;
          gpsStatus.className = 'text-xs text-center text-green-600 font-bold mt-2';
        },
        (error) => {
          console.error('GPS Error:', error);
          gpsStatus.innerText = '⚠ GPS Failed: ' + error.message;
          gpsStatus.className = 'text-xs text-center text-red-600 font-semibold mt-2';
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

// Form Submit Handler for reportForm
const reportForm = document.getElementById('reportForm');

if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn'); 
        const gpsStatus = document.getElementById('gpsStatus');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Processing & Submitting...';
        }

        let lat = null;
        let lng = null;

        // 1. Auto-fetch GPS
        try {
            const position = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not supported.'));
                } else {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000
                    });
                }
            });
            lat = position.coords.latitude;
            lng = position.coords.longitude;
        } catch (gpsError) {
            console.warn('GPS Auto-fetch warning:', gpsError.message);
        }

        try {
            // 2. Handle Photo Upload
            const photoInput = document.getElementById('visitPhoto');
            let photoUrl = null;

            if (photoInput && photoInput.files && photoInput.files.length > 0) {
                const file = photoInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabaseAgent.storage
                    .from('visit-photos')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseAgent.storage
                    .from('visit-photos')
                    .getPublicUrl(filePath);

                photoUrl = publicUrlData.publicUrl;
            }

            // 3. Prepare Payload (Including CFID and Customer Name)
            const payload = {
                agent_name: document.getElementById('agentName').value,
                cfid: document.getElementById('cfid').value,
                customer_name: document.getElementById('customerName').value,
                account_number: document.getElementById('accountNumber').value,
                client_name: document.getElementById('clientName').value,
                outcome: document.getElementById('outcome').value,
                amount_collected: parseFloat(document.getElementById('amountCollected').value) || 0,
                expenses_incurred: parseFloat(document.getElementById('expensesIncurred').value) || 0,
                notes: document.getElementById('notes').value,
                latitude: lat,
                longitude: lng,
                photo_url: photoUrl
            };

            const { error } = await supabaseAgent
                .from('visits')
                .insert([payload]);

            if (error) throw error;

            alert('✅ Visit report and photo submitted successfully!');
            reportForm.reset();

        } catch (err) {
            console.error('Submission Error:', err);
            alert('❌ Failed to submit visit: ' + (err.message || JSON.stringify(err)));
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Submit Report';
            }
        }
    });
}
});





