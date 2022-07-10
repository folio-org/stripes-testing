export default {
  // direct paths to folio apps to use in cy.visit() into initial steps of our scenarios
  // TODO: add separated scenarios related with TopMenu implementation
  agreementsPath : '/erm/agreements',
  inventoryPath : '/inventory',
  settingsPath : '/settings',
  financePath : '/finance',
  ledgerPath : '/finance/ledger',
  fundPath : '/finance/fund',
  dataImportPath : '/data-import',
  fiscalYearPath : '/finance/fiscalyear',
  eholdingsPath : '/eholdings',
  dataExportPath : '/data-export',
  ordersPath : '/orders',
  invoicesPath : '/invoice',
  circulationLogPath : '/circulation-log',
  remoteStorageConfigurationPath : 'settings/remote-storage/configurations',
  organizationsPath : '/organizations',
  marcAuthorities: '/marc-authorities',
  inventorySettingsFastAddPath: '/settings/inventory/fastAdd',
  requestsPath: '/requests',
  usersPath: '/users',
  checkInPath: '/checkin',
  checkOutPath: '/checkout',
  receivingPath: '/receiving',
  bulkEditPath: '/bulk-edit'
};
