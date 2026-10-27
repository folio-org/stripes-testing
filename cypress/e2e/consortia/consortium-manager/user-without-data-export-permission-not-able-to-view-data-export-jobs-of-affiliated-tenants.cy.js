import { calloutTypes } from '../../../../interactors';
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
    const permissionErrorMessage =
      'Could not load jobs data. User does not have required permissions.';
    // First member in alphabetical order is selected by default in "Member" dropdown
    const [defaultMemberName] = [tenantNames.central, tenantNames.college].sort((a, b) =>
      a.localeCompare(b),
    );
    const isMemberWithoutPermissionDefault = defaultMemberName === tenantNames.college;
    const verifyLogsNotLoadedWithoutPermission = () => {
      ConsortiumManagerApp.checkMessage(permissionErrorMessage, calloutTypes.error);
      ConsortiumManagerApp.verifyListIsEmpty();
      DataExportLogsConsortiumManager.verifyRecordsFound();
    };
    let testData;

    before('Create test data and login', () => {
      testData = {
        fileName: `AT_C397999_EmptyFile_Central_${getRandomPostfix()}.csv`,
      };
      FileManager.createFile(`cypress/fixtures/${testData.fileName}`, '');

      cy.clearLocalStorage();
      cy.resetTenant();
      cy.getAdminToken();
      ExportFile.exportFileViaApi(testData.fileName);

      cy.setTenant(Affiliations.College);
      cy.createTempUser([Permissions.dataExportSettingsViewOnly.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.resetTenant();
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]);

          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
    });

    it(
      'C397999 User without "Data export" permission is NOT able to view data export jobs of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C397999'] },
      () => {
        // Step 1: Click "Consortium manager" app button in the header
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

        // Step 2: Click "Data export" in "Management" pane
        ConsortiumManagerApp.chooseSettingsItem(settingsItems.dataExport);
        // Member without "Data export" permission selected by default shows permission error
        if (isMemberWithoutPermissionDefault) verifyLogsNotLoadedWithoutPermission();
        DataExportLogsConsortiumManager.verifyDataExportPane({
          hasLogs: !isMemberWithoutPermissionDefault,
        });
        ConsortiumManagerApp.verifySelectedMember(defaultMemberName);

        // Step 3: Select all members
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.changeSelectAllCheckbox('check');
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);

        // Step 4: Click "Member" dropdown in "Data export" pane
        DataExportLogsConsortiumManager.verifyMemberDropdownFilterPlaceholder();
        ConsortiumManagerApp.verifyTenantsInDropdown([tenantNames.central, tenantNames.college]);
        ConsortiumManagerApp.verifySelectedMember(defaultMemberName);

        // Step 5: Select central tenant option in "Member" dropdown => Check data in logs table
        // Count is taken from the request the UI rendered, so jobs created by parallel tests don't break it
        cy.intercept('GET', '**/data-export/job-executions?*').as('getLogs');
        ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.central);
        ConsortiumManagerApp.verifySelectedMember(tenantNames.central);
        DataExportLogsConsortiumManager.waitLoading();
        cy.wait('@getLogs').then(({ response }) => {
          DataExportLogsConsortiumManager.verifyRecordsFound(response.body.totalRecords);
        });
        DataExportLogsConsortiumManager.verifyLogWithFileNameDisplayed(testData.fileName);
        DataExportLogsConsortiumManager.verifyListSortedBy(
          DATA_EXPORT_LOGS_COLUMNS.ENDED_RUNNING,
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 6: Select member-1 tenant option in "Member" dropdown
        ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.college);
        ConsortiumManagerApp.verifySelectedMember(tenantNames.college);
        verifyLogsNotLoadedWithoutPermission();
      },
    );
  });
});
