// ==================== CONFIGURATION ====================
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_DATA = 'Data';
const SHEET_USERS = 'Users';
const SHEET_ASSIGNMENT = 'Assignment';
const SHEET_LOG = 'Log';
const SHEET_IMPORT = 'Import';

// ==================== WEB APP ====================
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  const html = template.evaluate()
    .setTitle('Stock Opname App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==================== UTILITY ====================
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

function getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

function logAction(action, productId, oldValue, newValue) {
  const sheet = getSheet(SHEET_LOG);
  if (!sheet) return;
  sheet.appendRow([
    new Date(),
    getCurrentUserEmail(),
    action,
    productId || '',
    oldValue || '',
    newValue || ''
  ]);
}

// ==================== INITIALIZATION ====================
function initializeSheets() {
  const ss = getSpreadsheet();
  
  // Create Data sheet
  let dataSheet = ss.getSheetByName(SHEET_DATA);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(SHEET_DATA);
    dataSheet.appendRow([
      'ID', 'Location', 'Product Name', 'Internal Ref', 'Category', 
      'Brand', 'Lot/Serial', 'Qty System', 'Qty Fisik', 'Selisih',
      'Status', 'Assigned To', 'Inputter', 'Timestamp', 'Keterangan'
    ]);
    dataSheet.getRange('A1:O1').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    dataSheet.setFrozenRows(1);
  }
  
  // Create Users sheet
  let usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_USERS);
    usersSheet.appendRow(['Email', 'Name', 'Role', 'Status']);
    usersSheet.getRange('A1:D1').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    usersSheet.setFrozenRows(1);
  }
  
  // Create Assignment sheet
  let assignSheet = ss.getSheetByName(SHEET_ASSIGNMENT);
  if (!assignSheet) {
    assignSheet = ss.insertSheet(SHEET_ASSIGNMENT);
    assignSheet.appendRow(['Assignment ID', 'User Email', 'Filter Type', 'Filter Value', 'Date Assigned', 'Status']);
    assignSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    assignSheet.setFrozenRows(1);
  }
  
  // Create Log sheet
  let logSheet = ss.getSheetByName(SHEET_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOG);
    logSheet.appendRow(['Timestamp', 'User', 'Action', 'Product ID', 'Old Value', 'New Value']);
    logSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    logSheet.setFrozenRows(1);
  }
  
  // Create Import sheet
  let importSheet = ss.getSheetByName(SHEET_IMPORT);
  if (!importSheet) {
    importSheet = ss.insertSheet(SHEET_IMPORT);
    importSheet.appendRow(['Paste CSV data here, then click Parse CSV']);
    importSheet.getRange('A1').setFontWeight('bold').setBackground('#ff9900');
  }
  
  return 'Sheets initialized successfully!';
}

// ==================== CSV PARSING ====================
function parseCSVFromSheet() {
  const sheet = getSheet(SHEET_IMPORT);
  if (!sheet) return { error: 'Import sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { error: 'No data found in Import sheet' };
  
  const dataSheet = getSheet(SHEET_DATA);
  const existingData = dataSheet.getDataRange().getValues();
  
  // Clear existing data (keep header)
  if (existingData.length > 1) {
    dataSheet.getRange(2, 1, existingData.length - 1, existingData[0].length).clear();
  }
  
  let parsedCount = 0;
  let id = 1;
  
  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip empty rows
    if (!row[0] && !row[1] && !row[2]) continue;
    
    const location = row[0] || '';
    const productName = row[1] || '';
    const internalRef = row[2] || '';
    const category = row[3] || '';
    const brand = row[4] || '';
    const lotSerial = row[5] || '';
    const qtySystem = parseFloat(row[6]) || 0;
    const qtyFisik = row[7] !== '' && row[7] !== undefined ? parseFloat(row[7]) : '';
    const keterangan = row[9] || '';
    
    // Calculate selisih
    const selisih = qtyFisik !== '' ? qtySystem - qtyFisik : '';
    
    // Determine status
    let status = 'Belum';
    if (qtyFisik !== '') {
      status = selisih === 0 ? 'Match' : 'Selisih';
    }
    
    dataSheet.appendRow([
      id,
      location,
      productName,
      internalRef,
      category,
      brand,
      lotSerial,
      qtySystem,
      qtyFisik,
      selisih,
      status,
      '', // Assigned To
      '', // Inputter
      '', // Timestamp
      keterangan
    ]);
    
    id++;
    parsedCount++;
  }
  
  logAction('PARSE_CSV', '', '', `Parsed ${parsedCount} items`);
  
  return { success: true, count: parsedCount };
}

// ==================== USER MANAGEMENT ====================
function getUsers() {
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const users = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      users.push({
        email: data[i][0],
        name: data[i][1],
        role: data[i][2],
        status: data[i][3]
      });
    }
  }
  
  return users;
}

function addUser(email, name, role) {
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { error: 'Users sheet not found' };
  
  // Check if user already exists
  const existing = getUsers().find(u => u.email === email);
  if (existing) return { error: 'User already exists' };
  
  sheet.appendRow([email, name, role, 'Active']);
  logAction('ADD_USER', '', '', `${email} (${role})`);
  
  return { success: true };
}

function updateUserStatus(email, status) {
  const sheet = getSheet(SHEET_USERS);
  if (!sheet) return { error: 'Users sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      sheet.getRange(i + 1, 4).setValue(status);
      logAction('UPDATE_USER', '', '', `${email} -> ${status}`);
      return { success: true };
    }
  }
  
  return { error: 'User not found' };
}

function getCurrentUserRole() {
  const email = getCurrentUserEmail();
  const users = getUsers();
  const user = users.find(u => u.email === email);
  return user ? user.role : 'Staff';
}

function isCurrentUserAdmin() {
  return getCurrentUserRole() === 'Admin';
}

// ==================== DASHBOARD DATA ====================
function getDashboardData() {
  const dataSheet = getSheet(SHEET_DATA);
  if (!dataSheet) return { error: 'Data sheet not found' };
  
  const data = dataSheet.getDataRange().getValues();
  const headers = data[0];
  
  let totalItems = 0;
  let countedItems = 0;
  let matchItems = 0;
  let selisihItems = 0;
  
  const locationStats = {};
  const brandStats = {};
  const categoryStats = {};
  const staffStats = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    totalItems++;
    
    const location = row[1] || 'Unknown';
    const brand = row[5] || 'Unknown';
    const category = row[4] || 'Unknown';
    const assignedTo = row[11] || 'Unassigned';
    const status = row[10] || 'Belum';
    
    // Location stats
    if (!locationStats[location]) {
      locationStats[location] = { total: 0, counted: 0, match: 0, selisih: 0 };
    }
    locationStats[location].total++;
    
    // Brand stats
    if (!brandStats[brand]) {
      brandStats[brand] = { total: 0, counted: 0 };
    }
    brandStats[brand].total++;
    
    // Category stats
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, counted: 0 };
    }
    categoryStats[category].total++;
    
    // Staff stats
    if (!staffStats[assignedTo]) {
      staffStats[assignedTo] = { total: 0, counted: 0 };
    }
    staffStats[assignedTo].total++;
    
    if (status !== 'Belum') {
      countedItems++;
      locationStats[location].counted++;
      brandStats[brand].counted++;
      categoryStats[category].counted++;
      staffStats[assignedTo].counted++;
      
      if (status === 'Match') {
        matchItems++;
        locationStats[location].match++;
      } else if (status === 'Selisih') {
        selisihItems++;
        locationStats[location].selisih++;
      }
    }
  }
  
  return {
    totalItems,
    countedItems,
    matchItems,
    selisihItems,
    percentage: totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0,
    locationStats,
    brandStats,
    categoryStats,
    staffStats
  };
}

// ==================== ITEMS MANAGEMENT ====================
function getAllItems(filters) {
  const dataSheet = getSheet(SHEET_DATA);
  if (!dataSheet) return [];
  
  const data = dataSheet.getDataRange().getValues();
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    const item = {
      id: row[0],
      location: row[1],
      productName: row[2],
      internalRef: row[3],
      category: row[4],
      brand: row[5],
      lotSerial: row[6],
      qtySystem: row[7],
      qtyFisik: row[8],
      selisih: row[9],
      status: row[10],
      assignedTo: row[11],
      inputter: row[12],
      timestamp: row[13],
      keterangan: row[14]
    };
    
    // Apply filters
    let include = true;
    
    if (filters) {
      if (filters.location && item.location !== filters.location) include = false;
      if (filters.brand && item.brand !== filters.brand) include = false;
      if (filters.category && item.category !== filters.category) include = false;
      if (filters.status && item.status !== filters.status) include = false;
      if (filters.assignedTo && item.assignedTo !== filters.assignedTo) include = false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.productName.toLowerCase().includes(searchLower) && 
            !item.internalRef.toLowerCase().includes(searchLower)) {
          include = false;
        }
      }
    }
    
    if (include) items.push(item);
  }
  
  return items;
}

function getAssignedItems() {
  const email = getCurrentUserEmail();
  return getAllItems({ assignedTo: email });
}

function submitCount(itemId, qtyFisik, keterangan) {
  const dataSheet = getSheet(SHEET_DATA);
  if (!dataSheet) return { error: 'Data sheet not found' };
  
  const data = dataSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == itemId) {
      const qtySystem = parseFloat(data[i][7]) || 0;
      const selisih = qtySystem - qtyFisik;
      const status = selisih === 0 ? 'Match' : 'Selisih';
      const email = getCurrentUserEmail();
      const timestamp = new Date();
      
      // Update the row
      const rowNum = i + 1;
      dataSheet.getRange(rowNum, 9).setValue(qtyFisik);      // Qty Fisik
      dataSheet.getRange(rowNum, 10).setValue(selisih);       // Selisih
      dataSheet.getRange(rowNum, 11).setValue(status);         // Status
      dataSheet.getRange(rowNum, 13).setValue(email);          // Inputter
      dataSheet.getRange(rowNum, 14).setValue(timestamp);      // Timestamp
      dataSheet.getRange(rowNum, 15).setValue(keterangan);    // Keterangan
      
      logAction('SUBMIT_COUNT', itemId, '', `Qty: ${qtyFisik}, Selisih: ${selisih}`);
      
      return { success: true, selisih, status };
    }
  }
  
  return { error: 'Item not found' };
}

// ==================== ASSIGNMENT ====================
function getAssignments() {
  const sheet = getSheet(SHEET_ASSIGNMENT);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const assignments = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      assignments.push({
        id: data[i][0],
        userEmail: data[i][1],
        filterType: data[i][2],
        filterValue: data[i][3],
        dateAssigned: data[i][4],
        status: data[i][5]
      });
    }
  }
  
  return assignments;
}

function assignItems(userEmail, filterType, filterValue) {
  const sheet = getSheet(SHEET_ASSIGNMENT);
  const dataSheet = getSheet(SHEET_DATA);
  if (!sheet || !dataSheet) return { error: 'Sheet not found' };
  
  // Create assignment record
  const assignmentId = Utilities.getUuid();
  sheet.appendRow([assignmentId, userEmail, filterType, filterValue, new Date(), 'Active']);
  
  // Update data items
  const data = dataSheet.getDataRange().getValues();
  let assignedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    let match = false;
    
    switch (filterType) {
      case 'Location':
        match = row[1] === filterValue;
        break;
      case 'Brand':
        match = row[5] === filterValue;
        break;
      case 'Category':
        match = row[4] === filterValue;
        break;
      case 'All':
        match = true;
        break;
    }
    
    if (match && !row[11]) { // Only assign if not already assigned
      dataSheet.getRange(i + 1, 12).setValue(userEmail);
      assignedCount++;
    }
  }
  
  logAction('ASSIGN_ITEMS', '', '', `${assignedCount} items to ${userEmail} (${filterType}: ${filterValue})`);
  
  return { success: true, assignedCount };
}

function removeAssignment(assignmentId) {
  const sheet = getSheet(SHEET_ASSIGNMENT);
  if (!sheet) return { error: 'Sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === assignmentId) {
      sheet.getRange(i + 1, 6).setValue('Removed');
      
      // Remove assignment from data items
      const userEmail = data[i][1];
      const filterType = data[i][2];
      const filterValue = data[i][3];
      
      const dataSheet = getSheet(SHEET_DATA);
      const items = dataSheet.getDataRange().getValues();
      
      for (let j = 1; j < items.length; j++) {
        if (items[j][11] === userEmail) {
          let match = false;
          switch (filterType) {
            case 'Location': match = items[j][1] === filterValue; break;
            case 'Brand': match = items[j][5] === filterValue; break;
            case 'Category': match = items[j][4] === filterValue; break;
          }
          if (match) {
            dataSheet.getRange(j + 1, 12).setValue('');
          }
        }
      }
      
      logAction('REMOVE_ASSIGNMENT', assignmentId, '', '');
      return { success: true };
    }
  }
  
  return { error: 'Assignment not found' };
}

// ==================== FILTER OPTIONS ====================
function getFilterOptions() {
  const dataSheet = getSheet(SHEET_DATA);
  if (!dataSheet) return {};
  
  const data = dataSheet.getDataRange().getValues();
  
  const locations = new Set();
  const brands = new Set();
  const categories = new Set();
  const statuses = new Set();
  const staffList = new Set();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) locations.add(data[i][1]);
    if (data[i][5]) brands.add(data[i][5]);
    if (data[i][4]) categories.add(data[i][4]);
    if (data[i][10]) statuses.add(data[i][10]);
    if (data[i][11]) staffList.add(data[i][11]);
  }
  
  return {
    locations: Array.from(locations).sort(),
    brands: Array.from(brands).sort(),
    categories: Array.from(categories).sort(),
    statuses: Array.from(statuses).sort(),
    staffList: Array.from(staffList).sort()
  };
}

// ==================== REPORT ====================
function getReconciliationReport(filters) {
  const items = getAllItems(filters);
  
  const report = {
    totalItems: items.length,
    countedItems: items.filter(i => i.status !== 'Belum').length,
    matchItems: items.filter(i => i.status === 'Match').length,
    selisihItems: items.filter(i => i.status === 'Selisih').length,
    totalQtySystem: 0,
    totalQtyFisik: 0,
    totalSelisih: 0,
    items: []
  };
  
  items.forEach(item => {
    report.totalQtySystem += item.qtySystem || 0;
    report.totalQtyFisik += item.qtyFisik || 0;
    report.totalSelisih += item.selisih || 0;
    
    if (item.status !== 'Belum') {
      report.items.push(item);
    }
  });
  
  return report;
}

function exportToCSV(filters) {
  const items = getAllItems(filters);
  
  let csv = 'ID,Location,Product Name,Internal Ref,Category,Brand,Lot/Serial,Qty System,Qty Fisik,Selisih,Status,Assigned To,Inputter,Timestamp,Keterangan\n';
  
  items.forEach(item => {
    csv += `${item.id},"${item.location}","${item.productName}","${item.internalRef}","${item.category}","${item.brand}","${item.lotSerial}",${item.qtySystem},${item.qtyFisik || ''},${item.selisih || ''},"${item.status}","${item.assignedTo}","${item.inputter}","${item.timestamp}","${item.keterangan}"\n`;
  });
  
  return csv;
}

// ==================== RESET ====================
function resetAllData() {
  if (!isCurrentUserAdmin()) return { error: 'Only admin can reset data' };
  
  const ss = getSpreadsheet();
  
  // Clear Data sheet
  const dataSheet = ss.getSheetByName(SHEET_DATA);
  if (dataSheet && dataSheet.getLastRow() > 1) {
    dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, dataSheet.getLastColumn()).clear();
  }
  
  // Clear Assignment sheet
  const assignSheet = ss.getSheetByName(SHEET_ASSIGNMENT);
  if (assignSheet && assignSheet.getLastRow() > 1) {
    assignSheet.getRange(2, 1, assignSheet.getLastRow() - 1, assignSheet.getLastColumn()).clear();
  }
  
  logAction('RESET_DATA', '', '', 'All data reset');
  
  return { success: true };
}

// ==================== BULK OPERATIONS ====================
function bulkAssignByLocation(userEmail, locations) {
  const sheet = getSheet(SHEET_ASSIGNMENT);
  const dataSheet = getSheet(SHEET_DATA);
  if (!sheet || !dataSheet) return { error: 'Sheet not found' };
  
  let totalAssigned = 0;
  
  locations.forEach(location => {
    const assignmentId = Utilities.getUuid();
    sheet.appendRow([assignmentId, userEmail, 'Location', location, new Date(), 'Active']);
    
    const data = dataSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === location && !data[i][11]) {
        dataSheet.getRange(i + 1, 12).setValue(userEmail);
        totalAssigned++;
      }
    }
  });
  
  logAction('BULK_ASSIGN', '', '', `${totalAssigned} items to ${userEmail}`);
  
  return { success: true, totalAssigned };
}

function clearAllAssignments() {
  if (!isCurrentUserAdmin()) return { error: 'Only admin can clear assignments' };
  
  const dataSheet = getSheet(SHEET_DATA);
  if (!dataSheet) return { error: 'Data sheet not found' };
  
  const data = dataSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][11]) {
      dataSheet.getRange(i + 1, 12).setValue('');
    }
  }
  
  const assignSheet = getSheet(SHEET_ASSIGNMENT);
  if (assignSheet && assignSheet.getLastRow() > 1) {
    assignSheet.getRange(2, 1, assignSheet.getLastRow() - 1, assignSheet.getLastColumn()).clear();
  }
  
  logAction('CLEAR_ASSIGNMENTS', '', '', 'All assignments cleared');
  
  return { success: true };
}
