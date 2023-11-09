import { Configurations } from '../../../support/fragments/settings/remote-storage';
import RemoteStorage from '../../../support/fragments/settings/remote-storage/remoteStorage';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import DeleteRemoteStorageModal from '../../../support/fragments/settings/remote-storage/madals/deleteRemoteStorageModal';

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
  });

  it(
    'C163921 Delete remote storage configuration (firebird) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.firebird] },
    () => {
      // #1 - 2 Open **"Settings"** app and **"Remote Storage"** in "Settings"
      cy.visit(SettingsMenu.remoteStoragePath);
      // #3 Click on **"Configurations"** option
      RemoteStorage.goToConfigurations();
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
