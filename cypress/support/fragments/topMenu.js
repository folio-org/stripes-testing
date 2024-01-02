import { Link, including } from '@interactors/html';

const agreementsPath = '/erm/agreements';
const inventoryPath = '/inventory';
const settingsPath = '/settings';
const financePath = '/finance';
const ledgerPath = '/finance/ledger';
const fundPath = '/finance/fund';
const dataImportPath = '/data-import';
const fiscalYearPath = '/finance/fiscalyear';
const groupsPath = '/finance/groups';
const eholdingsPath = '/eholdings';
const dataExportPath = '/data-export';
const ordersPath = '/orders';
const orderLinesPath = '/orders/lines';
const invoicesPath = '/invoice';
const circulationLogPath = '/circulation-log';
const remoteStorageConfigurationPath = 'settings/remote-storage/configurations';
const organizationsPath = '/organizations';
const marcAuthorities = '/marc-authorities';
const inventorySettingsFastAddPath = '/settings/inventory/fastAdd';
const requestsPath = '/requests';
const usersPath = '/users';
const checkInPath = '/checkin';
const checkOutPath = '/checkout';
const receivingPath = '/receiving';
const bulkEditPath = '/bulk-edit';
const exportManagerPath = '/export-manager';
const exportManagerOrganizationsPath = 'export-manager/edi-jobs';
const customFieldsPath = '/settings/users/custom-fields';
const transferCriteriaPath = 'settings/users/transfer-criteria';
const settingsUserPath = 'settings/users';
const notesPath = '/settings/notes/general';
const permissionSetPath = '/settings/users/perms?layer=add';
const lostItemsRequiringActualCost = '/users/lost-items';
const listsPath = '/lists';
const coursesPath = '/cr/courses';

export default {
  // direct paths to folio apps to use in cy.visit() into initial steps of our scenarios
  // TODO: add separated scenarios related with TopMenu implementation
  agreementsPath,
  inventoryPath,
  settingsPath,
  financePath,
  ledgerPath,
  fundPath,
  dataImportPath,
  fiscalYearPath,
  groupsPath,
  eholdingsPath,
  dataExportPath,
  ordersPath,
  orderLinesPath,
  invoicesPath,
  circulationLogPath,
  remoteStorageConfigurationPath,
  organizationsPath,
  marcAuthorities,
  inventorySettingsFastAddPath,
  requestsPath,
  usersPath,
  checkInPath,
  checkOutPath,
  receivingPath,
  bulkEditPath,
  exportManagerPath,
  exportManagerOrganizationsPath,
  customFieldsPath,
  notesPath,
  permissionSetPath,
  transferCriteriaPath,
  settingsUserPath,
  lostItemsRequiringActualCost,
  listsPath,
  coursesPath,

  openCheckInApp: () => {
    cy.do(Link({ href: including('/checkin') }).click());
  },
  openCheckOutApp: () => {
    cy.do(Link({ href: including('/checkout') }).click());
  },
  openDataImportApp: () => {
    cy.do(Link({ href: including(dataImportPath) }).click());
  },
  openInventoryApp: () => {
    cy.do(Link({ href: including(inventoryPath) }).click());
  },
  openEHoldingsApp: () => {
    cy.do(Link({ href: including('/eholdings') }).click());
  },
};
