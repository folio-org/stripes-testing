import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  SORT_DIRECTIONS,
} from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import DataImportLogsConsortiumManager, {
  DATA_IMPORT_LOGS_COLUMNS,
} from '../../../support/fragments/consortium-manager/data-import/dataImportLogsConsortiumManager';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    const marcFile = 'oneMarcBib.mrc';
    const tenants = [
      { tenantId: Affiliations.Consortia, tenantName: tenantNames.central, descriptor: 'Central' },
      { tenantId: Affiliations.College, tenantName: tenantNames.college, descriptor: 'College' },
      {
        tenantId: Affiliations.University,
        tenantName: tenantNames.university,
        descriptor: 'University',
      },
    ];
    const [centralTenant, collegeTenant, universityTenant] = tenants;
    // First member in alphabetical order is selected by default in "Member" dropdown
    const [defaultMemberTenant, otherMemberTenant] = [collegeTenant, universityTenant].sort(
      (a, b) => a.tenantName.localeCompare(b.tenantName),
    );
    let testData;

    before('Create test data and login', () => {
      testData = {
        logs: {},
      };
      tenants.forEach(({ descriptor }) => {
        testData.logs[descriptor] = {
          fileName: `AT_C397382_MarcFile_${descriptor}_${getRandomPostfix()}.mrc`,
        };
      });
      cy.clearLocalStorage();
      cy.resetTenant();
      cy.getAdminToken();
      tenants.forEach(({ tenantId, descriptor }) => {
        cy.setTenant(tenantId);
        DataImport.uploadFileViaApi(
          marcFile,
          testData.logs[descriptor].fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.logs[descriptor].instanceId = response[0].instance.id;
        });
        DataImportLogsConsortiumManager.getLogsTotalCountViaApi().then((count) => {
          testData.logs[descriptor].count = count;
        });
      });

      cy.resetTenant();
      cy.createTempUser([
        Permissions.consortiaSettingsConsortiumManagerView.gui,
        Permissions.settingsDataImportView.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          [collegeTenant, universityTenant].forEach(({ tenantId }) => {
            cy.affiliateUserToTenant({
              tenantId,
              userId: testData.user.userId,
              permissions: [Permissions.settingsDataImportView.gui],
            });
          });
          cy.login(testData.user.username, testData.user.password);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      [collegeTenant, universityTenant, centralTenant].forEach(({ tenantId, descriptor }) => {
        cy.setTenant(tenantId);
        InventoryInstance.deleteInstanceViaApi(testData.logs[descriptor].instanceId);
      });
    });

    it(
      'C397382 User created in central tenant is able to view data import jobs of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C397382'] },
      () => {
        // Step 1: Click "Consortium manager" app button in the header
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();
        ConsortiumManagerApp.verifyMembersSelected(3);

        // Step 2: Click "Select members" button
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyStatusOfSelectMembersModal(3);

        // Step 3: Check both member tenants and uncheck central tenant
        SelectMembers.changeSelectAllCheckbox('check');
        SelectMembers.selectMembers(centralTenant.tenantName);
        SelectMembers.verifyMembersFound(3);
        SelectMembers.verifyTotalSelected(2);
        SelectMembers.verifyAvailableTenants(tenants.map(({ tenantName }) => tenantName));
        SelectMembers.verifyMemberIsSelected(centralTenant.tenantName, false);
        SelectMembers.verifyMemberIsSelected(collegeTenant.tenantName, true);
        SelectMembers.verifyMemberIsSelected(universityTenant.tenantName, true);

        // Step 4: Click "Save & close" button in "Select members" modal
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

        // Step 5: Click "Data import" in "Logs & reports" section on "Management" pane
        ConsortiumManagerApp.chooseSettingsItem(settingsItems.dataImport);
        DataImportLogsConsortiumManager.verifyDataImportPane();
        ConsortiumManagerApp.verifySelectedMember(defaultMemberTenant.tenantName);

        // Step 6: Click "Member" dropdown in "Data import" pane
        DataImportLogsConsortiumManager.verifyMemberDropdownFilterPlaceholder();
        ConsortiumManagerApp.verifyTenantsInDropdown([
          defaultMemberTenant.tenantName,
          otherMemberTenant.tenantName,
        ]);
        ConsortiumManagerApp.verifySelectedMember(defaultMemberTenant.tenantName);

        // Step 7: Check data in "Data import" logs table for default selected member
        DataImportLogsConsortiumManager.verifyLogsFound(
          testData.logs[defaultMemberTenant.descriptor].count,
        );
        DataImportLogsConsortiumManager.verifyLogWithFileNameDisplayed(
          testData.logs[defaultMemberTenant.descriptor].fileName,
        );
        DataImportLogsConsortiumManager.verifyListSortedBy(
          DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING,
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 8: Click "Ended running" column name
        DataImportLogsConsortiumManager.clickColumnHeader(DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING);
        DataImportLogsConsortiumManager.verifyListSortedBy(
          DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 9: Click "Ended running" column name once again
        DataImportLogsConsortiumManager.clickColumnHeader(DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING);
        DataImportLogsConsortiumManager.verifyListSortedBy(
          DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING,
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 10: Click "Status" column name
        DataImportLogsConsortiumManager.clickColumnHeader(DATA_IMPORT_LOGS_COLUMNS.STATUS);
        DataImportLogsConsortiumManager.verifyColumnIsNotSorted(
          DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING,
        );
        DataImportLogsConsortiumManager.verifyColumnSortDirection(
          DATA_IMPORT_LOGS_COLUMNS.STATUS,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 11: Select another tenant in "Member" dropdown
        ConsortiumManagerApp.selectTenantFromDropdown(otherMemberTenant.tenantName);
        ConsortiumManagerApp.verifySelectedMember(otherMemberTenant.tenantName);
        DataImportLogsConsortiumManager.waitLoading();
        DataImportLogsConsortiumManager.verifyLogsFound(
          testData.logs[otherMemberTenant.descriptor].count,
        );
        DataImportLogsConsortiumManager.verifyLogWithFileNameDisplayed(
          testData.logs[otherMemberTenant.descriptor].fileName,
        );
        DataImportLogsConsortiumManager.verifyColumnSortDirection(
          DATA_IMPORT_LOGS_COLUMNS.STATUS,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 12: Click "ID" column name
        DataImportLogsConsortiumManager.clickColumnHeader(DATA_IMPORT_LOGS_COLUMNS.ID);
        DataImportLogsConsortiumManager.verifyColumnIsNotSorted(DATA_IMPORT_LOGS_COLUMNS.STATUS);
        DataImportLogsConsortiumManager.verifyListSortedBy(
          DATA_IMPORT_LOGS_COLUMNS.ID,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 13: Click "ID" column name once again
        DataImportLogsConsortiumManager.clickColumnHeader(DATA_IMPORT_LOGS_COLUMNS.ID);
        DataImportLogsConsortiumManager.verifyListSortedBy(
          DATA_IMPORT_LOGS_COLUMNS.ID,
          SORT_DIRECTIONS.DESCENDING,
        );
      },
    );
  });
});
