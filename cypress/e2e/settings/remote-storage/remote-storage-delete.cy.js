import { Permissions } from '../../../support/dictionary';
import { Configurations } from '../../../support/fragments/settings/remote-storage';
import DeleteRemoteStorageModal from '../../../support/fragments/settings/remote-storage/madals/deleteRemoteStorageModal';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('remote-storage-configuration', () => {
  const testData = {};
  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Configurations.createViaApi().then((res) => {
        testData.configuration = res;
      });
    });

    cy.createTempUser([Permissions.remoteStorageCRUD.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Configurations.deleteViaApi(testData.configuration.id);
  });

  it(
    'C163921 Delete remote storage configuration (volaris) (TaaS)',
    { tags: ['criticalPath', 'volaris', 'C163921'] },
    () => {
      // #1 - 2 Open **"Settings"** app and **"Remote Storage"** in "Settings"
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      // #3 Click on **"Configurations"** option
      Configurations.openConfigurationsTabFromSettings();
      // #4 Click on row, which is configured in Precondition #2 (e.g. Test)
      Configurations.selectRemoteStorage(testData.configuration.name);
      // #6 Click **"Delete"** option
      Configurations.clickDeleteRemoteStorage(testData.configuration.name);
      // Confirmation pop up will appear with:
      // * Title "Remove <name of remote storage configuration (e.g. Test)>"
      // * Text "Are you sure you want to delete the remote storage configuration?"
      // * "Cancel" active button
      // * "Delete" active button
      DeleteRemoteStorageModal.verifyModalView(testData.configuration.name);
      // #7 Click **"Cancel"**
      DeleteRemoteStorageModal.cancelModal();
      // #8 Click **"Action"** => **"Delete"**
      Configurations.clickDeleteRemoteStorage(testData.configuration.name);
      DeleteRemoteStorageModal.verifyModalView(testData.configuration.name);
      // #9 Click **"Delete"** button on the pop-up window
      DeleteRemoteStorageModal.confirm();
      // * At the bottom of the screen appears notification "Remote storage configuration was successfully deleted."
      // * Configuration is deleted from the table
      Configurations.verifyDeletedConfiguration(testData.configuration.name);
    },
  );
});
