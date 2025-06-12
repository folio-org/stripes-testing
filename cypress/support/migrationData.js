/*
Data for creation of permission sets and users on Okapi env before migration to Eureka, for migration testing.
Used in this file: cypress/e2e/create-users-for-migration.cy.js
After migration, a set of tests to be run on Eureka using these users instead of creating new ones.
List of tests to be run: https://foliotest.testrail.io/index.php?/runs/view/3030.
Cypress config parameter defining a switch to using pre-defined users in those tests: "migrationTest: true".
*/

import { Permissions } from './dictionary';

export default {
  password: 'Migration123!',
  getUsername: (caseId) => `migration_username_${caseId.toLowerCase()}`,
  getFirstName: (caseId) => `Migration_FirstName_${caseId.toLowerCase()}`,
  getLastName: (caseId) => `Migration_LastName_${caseId.toLowerCase()}`,
  getBarcode: (caseId) => `migration_barcode_${caseId.toLowerCase()}`,
};

export const migrationUsers = [
  { caseId: 'c1211', permissions: [Permissions.settingsCircView.internal] },
  {
    caseId: 'c1213',
    permissions: [Permissions.uiCirculationViewCreateEditDeleteFixedDueDateSchedules.internal],
  },
  { caseId: 'c1214', permissions: [Permissions.settingsLoanPoliciesAll.internal] },
  { caseId: 'c1215', permissions: [Permissions.uiCirculationSettingsNoticePolicies.internal] },
  { caseId: 'c1217', permissions: [Permissions.uiCirculationSettingsNoticeTemplates.internal] },
  { caseId: 'c1218', permissions: [Permissions.settingsCircCRUDRequestPolicies.internal] },
  { caseId: 'c1219', permissions: [Permissions.uiCirculationCreateEditRemoveStaffSlips.internal] },
  {
    caseId: 'c492',
    permissions: [
      Permissions.moduleDataImportEnabled.internal,
      Permissions.settingsDataImportEnabled.internal,
    ],
  },
  {
    caseId: 'c388524',
    permissions: [
      Permissions.checkoutCirculatingItems.internal,
      Permissions.checkoutViewFeeFines.internal,
      Permissions.uiUsersfeefinesView.internal,
    ],
  },
  { caseId: 'c388525', permissions: [Permissions.checkoutCirculatingItems.internal] },
  { caseId: 'c505', permissions: [Permissions.uiCreateEditDeleteMaterialTypes.internal] },
  { caseId: 'c375072', permissions: [Permissions.uiInventoryViewInstances.internal] },
  { caseId: 'c375076', permissions: [Permissions.uiInventoryViewCreateEditInstances.internal] },
  { caseId: 'c375077', permissions: [Permissions.inventoryAll.internal] },
  {
    caseId: 'c494346',
    permissions: [Permissions.uiInventorySettingsConfigureSingleRecordImport.internal],
  },
  {
    caseId: 'c494347',
    permissions: [Permissions.uiInventorySettingsConfigureSingleRecordImport.internal],
  },
  {
    caseId: 'c526',
    permissions: [
      Permissions.uiNotesItemCreate.internal,
      Permissions.uiNotesItemView.internal,
      Permissions.uiNotesItemEdit.internal,
      Permissions.uiNotesItemDelete.internal,
      Permissions.moduleeHoldingsEnabled.internal,
    ],
  },
  {
    caseId: 'c527',
    permissions: [
      Permissions.uiNotesItemCreate.internal,
      Permissions.uiNotesItemView.internal,
      Permissions.uiNotesItemEdit.internal,
      Permissions.uiNotesItemDelete.internal,
      Permissions.moduleeHoldingsEnabled.internal,
    ],
  },
  {
    caseId: 'c528',
    permissions: [
      Permissions.uiNotesItemCreate.internal,
      Permissions.uiNotesItemView.internal,
      Permissions.uiNotesItemEdit.internal,
      Permissions.uiNotesItemDelete.internal,
      Permissions.moduleeHoldingsEnabled.internal,
    ],
  },
  {
    caseId: 'c1245',
    permissions: [
      Permissions.uiNotesItemView.internal,
      Permissions.moduleeHoldingsEnabled.internal,
    ],
  },
  { caseId: 'c1205', permissions: [Permissions.uiNotesSettingsEdit.internal] },
  { caseId: 'c365628', permissions: [Permissions.settingsTenantViewLocation.internal] },
  { caseId: 'c409487', permissions: [Permissions.settingsTenantView.internal] },
  { caseId: 'c410753', permissions: [Permissions.settingsTenantView.internal] },
  {
    caseId: 'c359587',
    permissions: [
      Permissions.uiUserLostItemRequiringActualCost.internal,
      Permissions.uiUserCanAssignUnassignPermissions.internal,
    ],
  },
  {
    caseId: 'c380503',
    permissions: [
      Permissions.uiFeeFinesActions.internal,
      Permissions.uiUsersManualPay.internal,
      Permissions.uiUsersfeefinesCRUD.internal,
      Permissions.uiUsersfeefinesView.internal,
      Permissions.uiUsersDeclareItemLost.internal,
      Permissions.loansView.internal,
    ],
  },
  { caseId: 'c396393', permissions: [Permissions.uiUsersViewAllSettings.internal] },
  { caseId: 'c353617', permissions: [Permissions.uiOrdersView.internal] },
];
