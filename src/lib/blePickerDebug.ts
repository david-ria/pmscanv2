// Debug utility to control BLE picker behavior
// Usage: 
// - localStorage.setItem('BLE_PICKER_FORCE_SHOW', 'true') - Force picker to show even with 1 device
// - localStorage.setItem('BLE_PICKER_FORCE_SHOW', 'false') - Normal auto-select behavior

(window as any).BLE_PICKER_DEBUG = {
  forceShow: () => {
    localStorage.setItem('BLE_PICKER_FORCE_SHOW', 'true');
    console.log('🔧 BLE Picker will now be forced to show for debugging');
  },
  
  allowAutoSelect: () => {
    localStorage.removeItem('BLE_PICKER_FORCE_SHOW');
    console.log('🔧 BLE Picker will now use normal auto-select behavior');
  },
  
  isForced: () => {
    const forced = localStorage.getItem('BLE_PICKER_FORCE_SHOW') === 'true';
    console.log(`🔧 BLE Picker force show: ${forced}`);
    return forced;
  }
};

console.log('🔧 BLE Picker debug tools available:');
console.log('  window.BLE_PICKER_DEBUG.forceShow() - Force picker to show');
console.log('  window.BLE_PICKER_DEBUG.allowAutoSelect() - Allow auto-select');
console.log('  window.BLE_PICKER_DEBUG.isForced() - Check current state');