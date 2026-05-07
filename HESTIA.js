// WebSocket Setup
let socket;
let wsConnected = false;

function initWebSocket() {
  socket = new WebSocket("ws://" + window.location.hostname + ":81/");
  console.log(window.location.hostname);
  
  socket.onopen = () => {
    wsConnected = true;
    updateConnectionStatus(true);
  };

  socket.onmessage = (event) => {
    const data = event.data;
    console.log(data);

    const combinedZoneMatch = data.match(/^Zone(\d+)\s*:\s*:(.*?):(.*?)\s*$/);
    if (combinedZoneMatch) {
      const zoneNum = parseInt(combinedZoneMatch[1], 10);
      const leftStatus = combinedZoneMatch[2].trim();
      const rightStatus = combinedZoneMatch[3].trim();
      handleZoneCombinedStatus(zoneNum, leftStatus, rightStatus);
    }
    
    // Zone Status Handlers
    if (data.startsWith("Zone1_Status::")) {
      handleZoneStatusNew(1, data.split("::")[1]);
    }
    if (data.startsWith("Zone2_Status::")) {
      handleZoneStatusNew(2, data.split("::")[1]);
    }
    if (data.startsWith("Zone3_Status::")) {
      handleZoneStatusNew(3, data.split("::")[1]);
    }
    if (data.startsWith("Zone4_Status::")) {
      handleZoneStatusNew(4, data.split("::")[1]);
    }
    
    // Top Navigation Status
    if (data.startsWith("BATTERY:")) {
      const val = data.split(":")[1];
      updateStatusBadge("batteryStatus", val === "CONNECTED", val);
    }

    if (data.startsWith("SIREN:")) {
      const val = data.split(":")[1];
      updateStatusBadge("sirenStatus", val === "CONNECTED", val);
    }

    if (data.startsWith("WIFI:")) {
      const val = data.split(":")[1];
      updateStatusBadge("wifiStatus", val === "CONNECTED", val);
    }

    if (data.startsWith("LAN:")) {
      const val = data.split(":")[1];
      updateStatusBadge("lanStatus", val === "CONNECTED", val);
    }

    if (data.startsWith("GSM:")) {
      const val = data.split(":")[1];
      updateStatusBadge("gsmStatus", val === "CONNECTED", val);
    }

    if (data.startsWith("SYSTEM:")) {
      const val = data.split(":")[1];
      updateStatusBadge("sysStatus", val === "ON", val);
    }

    // System Configuration
    if (data.startsWith("DATETIME:")) {
      const val = data.split(":").slice(1).join(":").trim();
      document.getElementById("dateTime").innerHTML = `<i class="far fa-clock"></i> ${val}`;
    }

    if (data.startsWith("PROTOCOL:")) {
      const val = data.split(":")[1].trim();
      document.getElementById("currentProtocol").innerHTML = `<strong>Selected Protocol:</strong> ${val}`;
      const radios = document.querySelectorAll('input[name="protocol"]');
      radios.forEach(r => r.checked = (r.value === val));
    }

    if (data.startsWith("NOTIFY:")) {
      const parts = data.split(":")[1].split(",");
      document.getElementById("notif1").checked = parts[0] === "1";
      document.getElementById("notif2").checked = parts[1] === "1";
      document.getElementById("notif3").checked = parts[2] === "1";
    }

    //Log Tables
    if (data.startsWith("LogData:")) {
     updateLogTable(data);
    }

    // /Contact Tables
    if (data.startsWith("NUMF:")) {

  let rows = data.substring(5);

  let html = "<table border='1' style='width:100%; border-collapse:collapse; text-align:center;'>";

  html += "<tr>"
       + "<th>Sl. No</th>"
       + "<th>Email</th>"
       + "<th>Contacts</th>"
       + "<th>Action</th>"
       + "</tr>";

  html += rows.replace(/<\/tr>/g,
      "<td><button onclick=\"deleteFire(this)\">Delete</button></td></tr>");

  html += "</table>";

  document.getElementById("fireTable").innerHTML = html;
  document.getElementById("fireTable").style.display = "block";
  document.getElementById("faultTable").style.display = "none";

}
if (data.startsWith("NUMT:")) {

  let rows = data.substring(5);

  let html = "<table border='1' style='width:100%; border-collapse:collapse; text-align:center;'>";

  html += "<tr>"
       + "<th>Sl. No</th>"
       + "<th>Email</th>"
       + "<th>Contacts</th>"
       + "<th>Action</th>"
       + "</tr>";

  html += rows.replace(/<\/tr>/g,
      "<td><button onclick=\"deleteFault(this)\">Delete</button></td></tr>");

  html += "</table>";

  document.getElementById("faultTable").innerHTML = html;
  document.getElementById("faultTable").style.display = "block";
  document.getElementById("fireTable").style.display = "none";
}

    // GSM Section
    if (data.startsWith("GSM_SIG:")) {
      let sig = parseInt(data.split(":")[1]);
      sig = Math.max(0, Math.min(sig, 100));
      document.getElementById("gsmSignal").style.width = sig + "%";
      document.getElementById("gsmSignalPercent").innerText = sig + "%";
    }

    if (data.startsWith("GSM_OP:")) {
      document.getElementById("gsmOperator").innerText = data.split(":")[1];
    }

    if (data.startsWith("MQTT:")) {
      document.getElementById("gsmMqtt").innerText = data.split(":")[1];
    }
  };

  socket.onclose = () => {
    wsConnected = false;
    updateConnectionStatus(false);
    setTimeout(initWebSocket, 5000);
  };
}

// Helper Functions
function handleZoneStatusNew(zoneNum, modeStatus) {

  const statusEl = document.getElementById(`z${zoneNum}Status`);
  if (!statusEl) return;

  const zoneBlock = statusEl.closest('.zone-block');

  // Split mode & status
  let parts = modeStatus.split(":");
  if (parts.length < 2) return;

  let mode = parts[0];
  let status = parts[1];

  // Remove old classes
  zoneBlock.classList.remove('alarm', 'warning', 'isolated');

  let icon = 'check-circle';
  let className = 'normal';

  switch(status) {
    case "FIRE":
      icon = 'fire';
      className = 'fire';
      zoneBlock.classList.add('alarm');
      break;

    case "OPEN":
      icon = 'alert';
      className = 'open';
      zoneBlock.classList.add('warning');
      break;

    case "SHORT":
      icon = 'x-circle';
      className = 'short';
      zoneBlock.classList.add('alarm');
      break;

    case "ISOLATE":
      icon = 'ban';
      className = 'isolated';
      zoneBlock.classList.add('isolated');
      break;

    case "NORMAL":
      icon = 'check';
      className = 'normal';
      break;
  }

  // UI update
  statusEl.className = `zone-status ${className}`;
  statusEl.innerHTML = `<svg class="icon"><use href="#icon-${icon}"></use></svg> ${mode}:${status}`;
}


function handleZoneCombinedStatus(zoneNum, leftStatus, rightStatus) {
  const statusEl = document.getElementById(`z${zoneNum}Status`);
  if (!statusEl) return;

  const zoneBlock = statusEl.closest('.zone-block');
  if (zoneBlock) {
    zoneBlock.classList.remove('alarm', 'warning', 'isolated');
    if (leftStatus === 'FIRE' || rightStatus === 'FIRE' || leftStatus === 'SHORT' || rightStatus === 'SHORT') {
      zoneBlock.classList.add('alarm');
    } else if (leftStatus === 'OPEN' || rightStatus === 'OPEN') {
      zoneBlock.classList.add('warning');
    } else if (leftStatus === 'ISOLATE' || rightStatus === 'ISOLATE') {
      zoneBlock.classList.add('isolated');
    }
  }

  const icon = (leftStatus === 'FIRE' || rightStatus === 'FIRE') ? 'fire' : 'check';
  statusEl.innerHTML = `<svg class="icon"><use href="#icon-${icon}"></use></svg> ${leftStatus} : ${rightStatus}`;
}


function updateStatusBadge(id, isActive, value) {

  const el = document.getElementById(id);
  el.classList.remove('active', 'warning', 'danger');

  let text = el.querySelector('span');

  if (!text) {
    text = document.createElement('span');
    el.appendChild(text);
  }

  // 🔥 emoji decide karo based on id + status
  let emoji = "";

  if (id === 'batteryStatus') {
    emoji = isActive ? "🔋" : "🔋";
  } 
  else if (id === 'sirenStatus') {
    emoji = isActive ? "🚨" : "🚨";
  } 
  else if (id === 'wifiStatus') {
    emoji = isActive ? "ᯤ" : "ᯤ";
  } 
  else if (id === 'lanStatus') {
    emoji = isActive ? "🌐" : "🌐";
  } 
  else if (id === 'gsmStatus') {
    emoji = isActive ? "📡" : "📡";
  } 
  else if (id === 'sysStatus') {
    emoji = isActive ? "⚙️" : "⚙️";
  }

  // status color
  if (isActive) {
    el.classList.add('active');
  } else {
    el.classList.add('danger');
  }

  // 🔥 FINAL TEXT (emoji + value)
  text.textContent = emoji + " " + value;
}

function updateConnectionStatus(connected) {
  const connStatus = document.getElementById("connStatus");
  const text = document.getElementById("connText");

  if (connected) {
    connStatus.classList.remove("disconnected");
    connStatus.classList.add("connected");
    text.textContent = "CONNECTED";
  } else {
    connStatus.classList.remove("connected");
    connStatus.classList.add("disconnected");
    text.textContent = "DISCONNECTED";
  }
}

// Sidebar Toggle for mobile
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("open");
  
  // Create overlay if it doesn't exist
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999;display:none;';
    overlay.onclick = toggleSidebar;
    document.body.appendChild(overlay);
  }
  
  if (sidebar.classList.contains('open')) {
    overlay.style.display = 'block';
  } else {
    overlay.style.display = 'none';
  }
}

// Logout
function logout() {
  if (wsConnected) {
    socket.send("_Logout__");
  }
  alert("Logging out...");
  window.location.href = "http://" + window.location.hostname + ":8085";
}

// Tab Switching
function showSection(id) {
  // Update tabs
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  
  // Update chip-nav active state
  document.querySelectorAll(".nav-chip").forEach(chip => {
    chip.classList.remove("active");
    if (chip.getAttribute('data-section') === id) chip.classList.add("active");
  });
  
  // Load data for specific sections
  if (id === 'logevent') {
    sendCommand('GET_LOG');
  }
}

// Close sidebar helper
function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("open");
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.style.display = 'none';
}

function setContactToggle(activeType) {
  const fireBtn = document.getElementById("fireBtn");
  const faultBtn = document.getElementById("faultBtn");

  if (!fireBtn || !faultBtn) return;

  const inactiveStyle = {
    transform: 'translateY(0)',
    boxShadow: 'none',
    border: 'none'
  };

  Object.assign(fireBtn.style, inactiveStyle);
  Object.assign(faultBtn.style, inactiveStyle);

  if (activeType === 'fire') {
    fireBtn.style.transform = 'translateY(-1px)';
    fireBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.35)';
    fireBtn.style.border = '2px solid #dc2626';
  } else if (activeType === 'fault') {
    faultBtn.style.transform = 'translateY(-1px)';
    faultBtn.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.35)';
    faultBtn.style.border = '2px solid #d97706';
  }
}

function updateLogTable(data) {
  let cleanData = data.replace("LogData:", "").trim();

  let container = document.getElementById("logTable");
  if (!container) return;

  // Full table structure create karo
  let tableHTML = `
    <table>
      <thead>
        <tr>
          <th>Index</th>
          <th>Zone</th>
          <th>Status</th>
          <th>Date</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${cleanData}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}
function showFire() {
  sendCommand("GET_FNUM");
  setContactToggle('fire');
  //document.getElementById("fireTable").style.display = "block";
  //document.getElementById("faultTable").style.display = "none";
}

function showFault() {
  sendCommand("GET_FLNUM");
  setContactToggle('fault');
  //document.getElementById("fireTable").style.display = "none";
  //document.getElementById("faultTable").style.display = "block";
}

// Send WebSocket Command
function sendCommand(cmd) {
  if (wsConnected) {
    socket.send(cmd);
  } else {
    showAlert("WebSocket not connected!", "error");
  }
}

// Submit Notification Settings
function submitNotification() {
  const v1 = document.getElementById("notif1").checked ? 1 : 0;
  const v2 = document.getElementById("notif2").checked ? 1 : 0;
  const v3 = document.getElementById("notif3").checked ? 1 : 0;
  sendCommand(`NOTIFIES_${v2},${v3},${v1}`);
  showAlert("Notification settings saved!", "success");
}

// Submit Date-Time
function submitDateTime() {
  const datetime = document.getElementById("datetimeInput").value;
  if (datetime) {
    sendCommand(`DATETIME_${datetime}`);
    showAlert("Date-Time updated!", "success");
  } else {
    showAlert("Please enter date & time", "error");
  }
}

// Submit Contact
function submitContact() {
  const type = document.getElementById("contactType").value;
  const slno = document.getElementById("slno").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const mail = document.getElementById("email").value.trim();

  if (!slno || !phone) {
    showAlert("SL No and Phone No are required", "error");
    return;
  }

  if (slno.length > 15 || phone.length > 16 || mail.length > 16) {
    showAlert("Character limit exceeded", "error");
    return;
  }

  let finalMail = mail ? mail : "NA";
  let command = `${type}_${slno},${phone}`;
  
  sendCommand(command);

  // Reset fields
  document.getElementById("slno").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("email").value = "";
  
  showAlert("Contact saved!", "success");
}

// Submit Branch Details
function submitBranch() {
  const name = document.getElementById("branchName").value.trim().toUpperCase();
  const addr = document.getElementById("branchAddr").value.trim().toUpperCase();
  if (!name || !addr || name.length > 16 || addr.length > 16) {
    showAlert("Invalid Branch Name or Address", "error");
    return;
  }
  sendCommand(`BRANCH___${name},${addr}`);
  document.getElementById("branchName").value = "";
  document.getElementById("branchAddr").value = "";
  showAlert("Branch details saved!", "success");
}

// Submit MQTT Credentials
function submitMQTT() {
  const auth = document.getElementById("mqttAuth").value.trim();
  const user = document.getElementById("mqttUser").value.trim();
  const pass = document.getElementById("mqttPass").value.trim();
  if (!user || !auth || !pass) {
    showAlert("Please fill all MQTT fields", "error");
    return;
  }
  sendCommand(`MQTTINFO_${auth},${user},${pass}`);
  document.getElementById("mqttAuth").value = "";
  document.getElementById("mqttUser").value = "";
  document.getElementById("mqttPass").value = "";
  showAlert("MQTT credentials saved!", "success");
}

// Submit WiFi Credentials
function submitWiFi() {
  const ssid = document.getElementById("wifiSSID").value.trim();
  const pass = document.getElementById("wifiPass").value.trim();
  if (!ssid || !pass) {
    showAlert("WiFi SSID and Password required", "error");
    return;
  }
  sendCommand(`WIFIINFO_${ssid},${pass}`);
  document.getElementById("wifiSSID").value = "";
  document.getElementById("wifiPass").value = "";
  showAlert("WiFi credentials saved!", "success");
}

// Submit Protocol
function submitProtocol() {
  const selected = document.querySelector('input[name="protocol"]:checked');
  if (selected) {
    sendCommand(`PROTOCOL_${selected.value}`);
    showAlert("Protocol updated!", "success");
  }
}

// Single contact delete
function deleteFire(btn) {
  let row = btn.closest("tr");
  let sl = row.cells[0].innerText;  // SL No from first column
  sendCommand("DEL_FIRE:" + sl); // ESP32 ko bhejna
  //row.remove(); // UI se turant hata do
//  setTimeout(()=>{
//    sendCommand("GET_FNUM");
//  }, 3000);
}
function deleteFault(btn) {
  let row = btn.closest("tr");
  let sl = row.cells[0].innerText;  // SL No from first column
  sendCommand("DEL_FALT:" + sl); // ESP32 ko bhejna
  //row.remove(); // UI se turant hata do
//  setTimeout(()=>{
//    sendCommand("GET_FNUM");
//  }, 3000);
}

// Clear All Contacts
function clearAllContacts() {
  if (confirm("Are you sure to clear all contacts?")) {
    sendCommand("CLEAR_CONTACTS");
    setTimeout(() => {
      //sendCommand("GET_NUM");
    }, 3000);
  }
}

// GSM Functions
function saveGSM() {
  const apn = document.getElementById("gsmApn").value.trim();
  if (!apn) {
    showAlert("APN required", "error");
    return;
  }
  sendCommand("GSM_APN_" + apn);
  showAlert("GSM APN saved!", "success");
}

function gsmReset() {
  if (confirm("Reset GSM Module?")) {
    sendCommand("GSM_RESET");
    showAlert("GSM reset initiated", "success");
  }
}

// Zone Mode Change
function zoneModeChange(zone, mode) {
  const selectElement = event.target;
  const statusElement = document.getElementById(`z${zone}Status`);
  const customTriggerText = selectElement.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger span');
  
  // Clear previous status classes
  selectElement.classList.remove('status-fire', 'status-warning');
  statusElement.classList.remove('status-fire', 'status-warning');
  if (customTriggerText) customTriggerText.classList.remove('status-fire-text', 'status-warning-text');

  if (mode === "FIRE__") {
    selectElement.classList.add('status-fire');
    statusElement.classList.add('status-fire');
    if (customTriggerText) customTriggerText.classList.add('status-fire-text');
  } else if (mode !== "") {
    selectElement.classList.add('status-warning');
    statusElement.classList.add('status-warning');
    if (customTriggerText) customTriggerText.classList.add('status-warning-text');
  }

  if (mode !== "") {
    sendCommand("Z" + zone + "_" + mode);
    showAlert(`Zone ${zone} mode changed to ${mode}`, "success");
  }
}

// Submit Supervisory
function submitSupervisory() {
  const selected = document.querySelector('input[name="supervisory"]:checked');
  if (selected) {
    sendCommand("SUPRVISRY" + selected.value);
    showAlert("Supervisory mode updated!", "success");
  }
}

// Submit Walktest
function submitWalktest() {
  const selected = document.querySelector('input[name="walktest"]:checked');
  if (selected) {
    sendCommand("WALKTEST_" + selected.value);
    showAlert("Walktest mode updated!", "success");
  }
}

// Simple Alert Function (replaces browser alert)
function showAlert(message, type) {
  // Create alert element
  const alert = document.createElement('div');
  const icon = type === 'success' ? 'check' : 'alert';
  alert.innerHTML = `
    <svg class="icon"><use href="#icon-${icon}"></use></svg>
    ${message}
  `;

  
  // Add styles dynamically
  alert.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  if (type === 'success') {
    alert.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  } else {
    alert.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  }
  
  document.body.appendChild(alert);
  
  // Remove after 3 seconds
  setTimeout(() => {
    alert.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

function initCustomSelects() {
  const selects = document.querySelectorAll('.zone-select, #contactType');
  
  selects.forEach(select => {
    // Prevent duplicate initialization
    if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-trigger')) return;

    // Wrap original select
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('hidden-select');
    
    // Create custom trigger
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    const selectedText = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : "Select";
    trigger.innerHTML = `<span>${selectedText}</span><svg class="icon"><use href="#icon-chevron-down"></use></svg>`;
    wrapper.appendChild(trigger);

    
    // Create options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'custom-options';
    
    Array.from(select.options).forEach(option => {
      const customOption = document.createElement('div');
      customOption.className = 'custom-option';
      if (option.selected) customOption.classList.add('selected');
      
      // Apply list item colors
      if (option.value === "FIRE__") {
        customOption.classList.add('status-fire-text');
      } else if (option.value !== "") {
        customOption.classList.add('status-warning-text');
      }

      customOption.textContent = option.text;
      customOption.dataset.value = option.value;
      
      customOption.onclick = (e) => {
        e.stopPropagation();
        select.value = option.value;
        trigger.querySelector('span').textContent = option.text;
        
        // Update selection styling
        optionsContainer.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
        customOption.classList.add('selected');
        
        wrapper.classList.remove('open');
        wrapper.closest('.zone-block, .card')?.classList.remove('is-open');
        
        // Trigger the original onchange event
        const event = new Event('change');
        select.dispatchEvent(event);
      };
      
      optionsContainer.appendChild(customOption);
    });
    
    wrapper.appendChild(optionsContainer);
    
    // Toggle dropdown
    trigger.onclick = (e) => {
      e.stopPropagation();
      // Close other dropdowns
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) {
          w.classList.remove('open');
          w.closest('.zone-block, .card')?.classList.remove('is-open');
        }
      });
      const isOpen = wrapper.classList.toggle('open');
      wrapper.closest('.zone-block, .card')?.classList.toggle('is-open', isOpen);
    };
  });
  
  // Close when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    document.querySelectorAll('.zone-block, .card').forEach(c => c.classList.remove('is-open'));
  });
}

// Initialize
window.onload = () => {
  initWebSocket();
  showSection('status');
  setContactToggle('fire');
  initCustomSelects();
};