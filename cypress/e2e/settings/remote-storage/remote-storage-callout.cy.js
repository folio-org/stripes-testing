import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Configurations } from '../../../support/fragments/settings/remote-storage';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import RemoteStorage from '../../../support/fragments/settings/remote-storage/remoteStorage';

let user;
const caiaSoft = Configurations.configurations.CaiaSoft;
const dematicStagingDirector = Configurations.configurations.DematicStagingDirector;
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
    'C367964 Verify text of success toast when creating remote storage configurations (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;
      // #1 Go to the "Settings" app
      // #2 Select "Remote storage"
      cy.visit(SettingsMenu.remoteStoragePath);
      // The "Remote storage" pane  is appears and contains of: "Configurations", "Accession tables"
      RemoteStorage.checkSettingItems();

      // #3 Select "Configurations" on the "Remote storage" pane by clicking on it
      RemoteStorage.goToConfigurations();

      // #4 Select the "New" button
      Configurations.openCreateConfigurationForm();

      // #6 "Provider name" dropdown expands and consists of the options: "Dematic EMS (API)", "Dematic StagingDirector (TCP/IP)", "CaiaSoft"
      Configurations.checkProviderNameDropdownValues();

      // #5 Fill in "Remote storage name"
      // #7 Select  the "Dematic StagingDirector (TCP/IP)" from the "Provider name" dropdown
      // #8 Fill into "Data synchronization schedule Runs every" input field with "1" minute value
      dematicStagingDirector.fillRequiredFields(name);
      // Check that the entered values is shown in the input fields
      dematicStagingDirector.verifyRequiredFields(name);

      // #9 Select "Save & close" button
      Configurations.clickSaveAndCloseThenCheck();
      // #10 Click "Cancel" button
      Configurations.cancelConfirmation();

      // #11 Click on the "Provider name" dropdown and select another configuration -- "CaiaSoft"
      // #12 Select "Change permanent location" from the dropdown on the "Accession holding workflow preference" accordion
      // #13 Select "Items received at remote storage scanned into FOLIO" from the dropdown on the "Returning workflow preference" accordion
      caiaSoft.fillRequiredFields(name);
      // Check that the entered values is shown in the input fields
      caiaSoft.verifyRequiredFields(name);

      // #14 Select "Save & close" button
      Configurations.clickSaveAndCloseThenCheck();
      // #15 Select "Save" button
      Configurations.confirmCreateRemoteStorage();
      // Success toast at the bottom of the "Configurations" pane reads: "Remote storage configuration was successfully created"
      Configurations.verifyCreatedConfiguration(name, caiaSoft);
      Configurations.deleteRemoteStorage(name);
    },
  );

  it(
    'C367965 Verify text of success toast when editing remote storage configurations (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;
      const editedConfiguration = {
        provider: 'CaiaSoft',
        accessionHoldingWorkflow: 'Change permanent location',
        returningWorkflow: 'Items received at remote storage scanned into FOLIO',
      };
      // #1 Go to the "Settings" app
      // #2 Select "Remote storage"
      cy.visit(SettingsMenu.remoteStoragePath);

      // #3 Select "Configurations" on the "Remote storage" pane by clicking on it
      RemoteStorage.goToConfigurations();

      // #4 - 9 Create "Dematic EMS (API)" configuration
      dematicEMS.create(name);
      Configurations.verifyCreatedConfiguration(name, dematicEMS);

      // #10 - 15 Edit Configuration
      Configurations.editConfiguration(name, editedConfiguration);
      // #16 Select "Save" button
      Configurations.closeWithSaving();
      // Success toast at the bottom of the "Configurations" pane reads: "Remote storage configuration was successfully changed."
      Configurations.verifyEditedConfiguration(name);

      Configurations.deleteRemoteStorage(name);
    },
  );
});
