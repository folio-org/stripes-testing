import { calloutTypes } from '../../../../interactors';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
let adminSourceRecord;
const fileName = 'empty.csv';
const permissionErrorMessage = 'Could not load jobs data. User does not have required permissions.';

describe('Data Export', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.getAdminUserDetails().then((record) => {
        adminSourceRecord = record;
      });
      cy.createTempUser([
        Permissions.consortiaSettingsConsortiumManagerView.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
        Permissions.dataExportSettingsViewOnly.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: user.userId,
          permissions: [
            Permissions.dataExportViewAddUpdateProfiles.gui,
            Permissions.dataExportSettingsViewOnly.gui,
          ],
        });

        cy.resetTenant();
        cy.loginAsAdmin({
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ExportFile.uploadFile(fileName);
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getCentralInfo',
        );
        cy.wait('@getCentralInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === adminSourceRecord.id);
          const jobId = jobData.hrId;
          const resultFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            0,
            jobId,
            adminSourceRecord.username,
            'Default holdings',
            true,
          );
        });

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        DataExportLogs.waitLoading();
        ExportFile.uploadFile(fileName);
        ExportFile.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
          'getCollegeInfo',
        );
        cy.wait('@getCollegeInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === adminSourceRecord.id);
          const jobId = jobData.hrId;
          const resultFileName = `${fileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            0,
            jobId,
            adminSourceRecord.username,
            'Default holdings',
            true,
          );
        });
        cy.logout();
        cy.resetTenant();
        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C552503 ECS | Verify that the list of exported jobs is not available for the user with "Settings (Data export): Can view only" and "Settings (Data export): Can view, add, update profiles" permissions in "Consortium manager" app (consortia) (firebird)',
      { tags: ['extendedPathECS', 'firebird', 'C552503'] },
      () => {
        // Step 1: Click "Data export" in "Management" pane under "Logs & Reports" section
        ConsortiumManagerApp.chooseSettingsItem(settingsItems.dataExport);
        ConsortiumManagerApp.verifySelectedSettingIsDisplayed(settingsItems.dataExport);
        ConsortiumManagerApp.verifyMembersSelected(2);
        ConsortiumManagerApp.verifySelectedMember(tenantNames.college);
        ConsortiumManagerApp.verifyListIsEmpty();
        ConsortiumManagerApp.checkMessage(permissionErrorMessage, calloutTypes.error);

        // Step 2: Select member tenant in "Member" dropdown
        ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.central);
        ConsortiumManagerApp.verifyListIsEmpty();
        ConsortiumManagerApp.checkMessage(permissionErrorMessage, calloutTypes.error);
      },
    );
  });
});
