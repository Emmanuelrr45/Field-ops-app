// 1. Initialize Supabase
const SUPABASE_URL = "https://bwzrklomhkoxbmpimpwc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3enJrbG9taGtveGJtcGltcHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzEzOTYsImV4cCI6MjEwMjUwNzM5Nn0.z3AiguJaFH9Ybjg-xWMJZQQ5eLSrWvlDKlyVd4KdTis"; // Paste your real anon key here
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLat = null;
let currentLng = null;

// 2. GPS Button Event Listener
document.addEventListener('DOMContentLoaded', () => {
  const gpsBtn = document.getElementById('gpsBtn');
  
  gpsBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    gpsBtn.innerText = "📍 Locating...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLat = pos.coords.latitude;
        currentLng = pos.coords.longitude;
        gpsBtn.innerText = "📍 GPS Verified ✓";
        gpsBtn.classList.remove('bg-gray-200');
        gpsBtn.classList.add('bg-green-100', 'text-green-800');
      },
      (err) => {
        console.error("GPS Error:", err);
        gpsBtn.innerText = "📍 GPS Error (Tap to Retry)";
        alert("Unable to fetch location: " + err.message + "\n\nCheck browser location permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
});

// 3. Image Compression
async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height *= maxDim / width;
        width = maxDim;
      } else if (height > maxDim) {
        width *= maxDim / height;
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
    };
  });
}

// 4. Form Submission Handler
document.getElementById('visitForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting...";

  try {
    const agentName = document.getElementById('agentName')?.value || "Field Officer";
    const accountNumber = document.getElementById('accountNumber')?.value || "N/A";
    const outcome = document.getElementById('outcome')?.value || "Visited";
    const amount = parseFloat(document.getElementById('amount')?.value) || 0;
    const notes = document.getElementById('notes')?.value || "";

    // Insert Visit Record into Supabase
    const { data: visitData, error: visitError } = await supabase
      .from('visits')
      .insert([{
        agent_name: agentName,
        account_number: accountNumber,
        outcome: outcome,
        amount_collected: amount,
        notes: notes,
        latitude: currentLat,
        longitude: currentLng
      }])
      .select();

    if (visitError) throw visitError;
    const visitId = visitData[0].id;

    // Handle Expense Claim & Receipt Photo Upload
    const expCategory = document.getElementById('expCategory')?.value;
    const expAmount = parseFloat(document.getElementById('expAmount')?.value) || 0;
    const receiptInput = document.getElementById('receiptInput');
    let receiptUrl = null;

    if (receiptInput && receiptInput.files.length > 0) {
      const file = receiptInput.files[0];
      const compressedBlob = await compressImage(file);
      const fileName = `receipt_${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);
      receiptUrl = publicUrlData.publicUrl;
    }

    if (expCategory && expCategory !== "None" && expAmount > 0) {
      const { error: expError } = await supabase
        .from('expenses')
        .insert([{
          visit_id: visitId,
          agent_name: agentName,
          category: expCategory,
          amount: expAmount,
          receipt_url: receiptUrl
        }]);

      if (expError) throw expError;
    }

    alert("Visit report & expense submitted successfully!");
    e.target.reset();

    // Reset GPS Button
    const gpsBtn = document.getElementById('gpsBtn');
    if (gpsBtn) {
      gpsBtn.innerText = "📍 Acquire GPS Coordinates";
      gpsBtn.classList.remove('bg-green-100', 'text-green-800');
      gpsBtn.classList.add('bg-gray-200');
    }
    currentLat = null;
    currentLng = null;

  } catch (err) {
    console.error(err);
    alert("Error submitting report: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit Visit Report";
  }
});