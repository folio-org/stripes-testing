import { calloutTypes } from '../../../../interactors';
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
    const permissionErrorMessage =
      'Could not load jobs data. User does not have required permissions.';
    // First member in alphabetical order is selected by default in "Member" dropdown
    const [defaultMemberName] = [tenantNames.central, tenantNames.college].sort((a, b) => a.localeCompare(b));
    const isMemberWithoutPermissionDefault = defaultMemberName === tenantNames.college;
    const verifyLogsNotLoadedWithoutPermission = () => {
      ConsortiumManagerApp.checkMessage(permissionErrorMessage, calloutTypes.error);
      ConsortiumManagerApp.verifyListIsEmpty();
      DataImportLogsConsortiumManager.verifyLogsFound();
    };
    let testData;

    before('Create test data and login', () => {
      testData = {
        fileName: `AT_C397988_MarcFile_Central_${getRandomPostfix()}.mrc`,
      };

      cy.clearLocalStorage();
      cy.resetTenant();
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        marcFile,
        testData.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });
      DataImportLogsConsortiumManager.getLogsTotalCountViaApi().then((count) => {
        testData.centralLogsCount = count;
      });

      cy.createTempUser([
        Permissions.consortiaSettingsConsortiumManagerView.gui,
        Permissions.settingsDataImportView.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.uiOrganizationsViewEdit.gui],
          });
          cy.login(testData.user.username, testData.user.password);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C397988 User without "Data import" permission is NOT able to view data import jobs of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C397988'] },
      () => {
        // Step 1: Click "Consortium manager" app button in the header
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

        // Step 2: Click "Data import" in "Management" pane
        ConsortiumManagerApp.chooseSettingsItem(settingsItems.dataImport);
        // Member without "Data import" permission selected by default shows permission error
        if (isMemberWithoutPermissionDefault) verifyLogsNotLoadedWithoutPermission();
        DataImportLogsConsortiumManager.verifyDataImportPane({
          hasLogs: !isMemberWithoutPermissionDefault,
        });
        ConsortiumManagerApp.verifySelectedMember(defaultMemberName);

        // Step 3: Select all members
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.changeSelectAllCheckbox('check');
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);

        // Step 4: Click "Member" dropdown in "Data import" pane
        DataImportLogsConsortiumManager.verifyMemberDropdownFilterPlaceholder();
        ConsortiumManagerApp.verifyTenantsInDropdown([tenantNames.central, tenantNames.college]);
        ConsortiumManagerApp.verifySelectedMember(defaultMemberName);

        // Step 5: Select central tenant option in "Member" dropdown => Check data in logs table
        ConsortiumManagerApp.selectTenantFromDropdown(tenantNames.central);
        ConsortiumManagerApp.verifySelectedMember(tenantNames.central);
        DataImportLogsConsortiumManager.waitLoading();
        DataImportLogsConsortiumManager.verifyLogsFound(testData.centralLogsCount);
        DataImportLogsConsortiumManager.verifyLogWithFileNameDisplayed(testData.fileName);
        DataImportLogsConsortiumManager.verifyListSortedBy(
          DATA_IMPORT_LOGS_COLUMNS.ENDED_RUNNING,
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
