import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Configurations } from '../../../support/fragments/settings/remote-storage';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const name = `AutotestConfigurationName${getRandomPostfix()}`;
const caiaSoft = Configurations.configurations.CaiaSoft;
const dematicStagingDirector = Configurations.configurations.DematicStagingDirector;

describe('Remote Storage', () => {
  before('create test data', () => {
    cy.createTempUser([Permissions.remoteStorageCRUD.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.remoteStorageConfigurationPath,
        waiter: Configurations.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C367964 Verify text of success toast when creating remote storage configurations (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      Configurations.openCreateConfigurationForm();
      Configurations.checkProviderNameDropdownValues();
      dematicStagingDirector.fillRequiredFields(name);
      dematicStagingDirector.verifyRequiredFields(name);
      Configurations.clickSaveAndCloseThenCheck();
      Configurations.cancelConfirmation();
      caiaSoft.fillRequiredFields(name);
      caiaSoft.verifyRequiredFields(name);
      Configurations.clickSaveAndCloseThenCheck();
      Configurations.confirmCreateRemoteStorage();
      Configurations.verifyCreatedConfiguration(name, caiaSoft);
      Configurations.deleteRemoteStorage(name);
    },
  );
});
