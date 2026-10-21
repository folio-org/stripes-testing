import { APPLICATION_NAMES, SORT_DIRECTIONS } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import DataExportLogsConsortiumManager, {
  DATA_EXPORT_LOGS_COLUMNS,
} from '../../../support/fragments/consortium-manager/data-export/dataExportLogsConsortiumManager';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
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
    const [defaultMemberTenant, otherMemberTenant] = [centralTenant, universityTenant].sort(
      (a, b) => a.tenantName.localeCompare(b.tenantName),
    );
    let testData;

    before('Create test data and login', () => {
      testData = {
        logs: {},
      };
      tenants.forEach(({ descriptor }) => {
        testData.logs[descriptor] = {
          fileName: `AT_C397994_EmptyFile_${descriptor}_${getRandomPostfix()}.csv`,
        };
        FileManager.createFile(`cypress/fixtures/${testData.logs[descriptor].fileName}`, '');
      });

      cy.clearLocalStorage();
      cy.resetTenant();
      cy.getAdminToken();
      tenants.forEach(({ tenantId, descriptor }) => {
        cy.setTenant(tenantId);
        ExportFile.exportFileViaApi(testData.logs[descriptor].fileName);
        DataExportLogsConsortiumManager.getRecordsTotalCountViaApi().then((count) => {
          testData.logs[descriptor].count = count;
        });
      });

      cy.setTenant(collegeTenant.tenantId);
      cy.createTempUser([Permissions.dataExportUploadExportDownloadFileViewLogs.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          // Central affiliation is assigned automatically to user created in member tenant
          cy.resetTenant();
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]);
          cy.affiliateUserToTenant({
            tenantId: universityTenant.tenantId,
            userId: testData.user.userId,
            permissions: [Permissions.dataExportUploadExportDownloadFileViewLogs.gui],
          });

          cy.setTenant(collegeTenant.tenantId);
          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(
            collegeTenant.tenantName,
            centralTenant.tenantName,
          );
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(collegeTenant.tenantId);
      Users.deleteViaApi(testData.user.userId);
      tenants.forEach(({ descriptor }) => {
        FileManager.deleteFile(`cypress/fixtures/${testData.logs[descriptor].fileName}`);
      });
    });

    it(
      'C397994 User created in member tenant is able to view data export jobs of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C397994'] },
      () => {
        // Step 1: Click "Consortium manager" app button in the header
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

        // Step 2: Click "Select members" button
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyStatusOfSelectMembersModal(3);

        // Step 3: Check central and member-2 tenants and uncheck member-1 tenant
        SelectMembers.changeSelectAllCheckbox('check');
        SelectMembers.selectMembers(collegeTenant.tenantName);
        SelectMembers.verifyMembersFound(3);
        SelectMembers.verifyTotalSelected(2);
        SelectMembers.verifyAvailableTenants(tenants.map(({ tenantName }) => tenantName));
        SelectMembers.verifyMemberIsSelected(collegeTenant.tenantName, false);
        SelectMembers.verifyMemberIsSelected(centralTenant.tenantName, true);
        SelectMembers.verifyMemberIsSelected(universityTenant.tenantName, true);

        // Step 4: Click "Save & close" button in "Select members" modal
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

        // Step 5: Click "Data export" in "Management" pane
        ConsortiumManagerApp.chooseSettingsItem(settingsItems.dataExport);
        DataExportLogsConsortiumManager.verifyDataExportPane();
        ConsortiumManagerApp.verifySelectedMember(defaultMemberTenant.tenantName);

        // Step 6: Click "Member" dropdown in "Data export" pane
        DataExportLogsConsortiumManager.verifyMemberDropdownFilterPlaceholder();
        ConsortiumManagerApp.verifyTenantsInDropdown([
          defaultMemberTenant.tenantName,
          otherMemberTenant.tenantName,
        ]);
        ConsortiumManagerApp.verifySelectedMember(defaultMemberTenant.tenantName);

        // Step 7: Check data in "Data export" logs table for default selected member
        DataExportLogsConsortiumManager.verifyRecordsFound(
          testData.logs[defaultMemberTenant.descriptor].count,
        );
        DataExportLogsConsortiumManager.verifyLogWithFileNameDisplayed(
          testData.logs[defaultMemberTenant.descriptor].fileName,
        );
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING,
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 8: Click "Ended running" column name
        DataExportLogsConsortiumManager.clickColumnHeader(DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING);
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 9: Click "Ended running" column name once again
        DataExportLogsConsortiumManager.clickColumnHeader(DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING);
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING,
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 10: Click "Total" column name
        DataExportLogsConsortiumManager.clickColumnHeader(DATA_EXPORT_LOGS_COLUMNS.TOTAL);
        DataExportLogsConsortiumManager.verifyColumnIsNotSorted(
          DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING,
        );
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.TOTAL,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 11: Select another tenant in "Member" dropdown
        ConsortiumManagerApp.selectTenantFromDropdown(otherMemberTenant.tenantName);
        ConsortiumManagerApp.verifySelectedMember(otherMemberTenant.tenantName);
        DataExportLogsConsortiumManager.waitLoading();
        DataExportLogsConsortiumManager.verifyRecordsFound(
          testData.logs[otherMemberTenant.descriptor].count,
        );
        DataExportLogsConsortiumManager.verifyLogWithFileNameDisplayed(
          testData.logs[otherMemberTenant.descriptor].fileName,
        );
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.TOTAL,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 12: Click "ID" column name
        DataExportLogsConsortiumManager.clickColumnHeader(DATA_EXPORT_LOGS_COLUMNS.ID);
        DataExportLogsConsortiumManager.verifyColumnIsNotSorted(DATA_EXPORT_LOGS_COLUMNS.TOTAL);
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.ID,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 13: Click "ID" column name once again
        DataExportLogsConsortiumManager.clickColumnHeader(DATA_EXPORT_LOGS_COLUMNS.ID);
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.ID,
          SORT_DIRECTIONS.DESCENDING,
        );
      },
    );
  });
});
