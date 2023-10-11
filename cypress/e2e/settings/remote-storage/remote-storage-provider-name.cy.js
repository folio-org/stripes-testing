import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Configurations } from '../../../support/fragments/settings/remote-storage';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import RemoteStorage from '../../../support/fragments/settings/remote-storage/remoteStorage';

let user;
const name = `AutotestConfigurationName${getRandomPostfix()}`;
const dematicEMS = Configurations.configurations.DematicEMS;

describe('remote-storage-configuration', () => {
  before('create test data', () => {
    cy.createTempUser([Permissions.remoteStorageCRUD.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C365623 Verify that "Provider name" is renamed (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      // #1 Open the "Settings" app
      // #2 Select "Remote storage"
      cy.visit(SettingsMenu.remoteStoragePath);
      // #3 Select "Configurations" in the "Remote storage" pane by clicking on it
      RemoteStorage.goToConfigurations();
      // #4 Select the "New" button
      Configurations.openCreateConfigurationForm();

      // #5 Click on the "Provider name" dropdown from the "General information" accordion to expand it
      // Ddropdown expands and consists of the options:"Dematic EMS (API)", "Dematic StagingDirector (TCP/IP)", "CaiaSoft"
      Configurations.checkProviderNameDropdownValues();

      // #6 Select "Dematic EMS (API)" option
      // #7 Fill into "Remote storage name" field with a title
      dematicEMS.fillRequiredFields(name);

      // #8 Select "Save & close" button
      Configurations.clickSaveAndCloseThenCheck();
      // #9 Select "Save" button in the "Create configuration" modal
      Configurations.confirmCreateRemoteStorage();
      // Successful notification "Remote storage configuration was successfully created." is shown
      // The created configuration is shown in the table on the "Configurations" pane
      // The "Provider" shown in the table = "Dematic EMS (API)"
      Configurations.verifyCreatedConfiguration(name, dematicEMS);

      // #10 Select recently added Configuration by clicking on the row with its name
      // #11 Select "Actions"=> Select "Edit" element
      Configurations.opentEditConfigurationForm(name);
      // #12 Click on the "Provider name" dropdown from the "General information" accordion to expand it
      // Ddropdown expands and consists of the options:"Dematic EMS (API)", "Dematic StagingDirector (TCP/IP)", "CaiaSoft"
      Configurations.checkProviderNameDropdownValues();

      // delete created configuration
      Configurations.closeEditConfiguration();
      Configurations.deleteRemoteStorage(name);
    },
  );
});
