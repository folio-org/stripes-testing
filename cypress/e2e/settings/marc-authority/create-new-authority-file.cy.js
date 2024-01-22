import Permissions from '../../../support/dictionary/permissions';
import ManageAuthorityFiles from '../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
// import DataImport from '../../../support/fragments/data_import/dataImport';
// import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
// import Logs from '../../../support/fragments/data_import/logs/logs';
// import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
// import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
// import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
// import Users from '../../../support/fragments/users/users';
// import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      const testData = {};

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiSettingsManageAuthorityFiles.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorityFilesPath,
              waiter: ManageAuthorityFiles.waitLoading,
            });
          },
        );
      });

      after(() => {});

      it(
        'C423992 Create new "Authority file" with empty "Base URL" field at "Settings >> MARC authority >> Manage authority files" pane (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'parallel'] },
        () => {
          ManageAuthorityFiles.clickNewButton();
          ManageAuthorityFiles.verifyEditableRowAdded();
          ManageAuthorityFiles.verifyTableHeaders();
        },
      );
    });
  });
});
