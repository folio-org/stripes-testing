import permissions from '../../../support/dictionary/permissions';
import Configurations from '../../../support/fragments/settings/remote-storage/configurations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('remote-storage-configuration', () => {
  before('create user', () => {
    cy.createTempUser([permissions.remoteStorageCRUD.gui, permissions.inventoryAll.gui]).then(
      (userProperties) => {
        user = userProperties;
      },
    );
  });

  beforeEach('login', () => {
    cy.login(user.username, user.password, {
      path: TopMenu.remoteStorageConfigurationPath,
      waiter: Configurations.waitLoading,
      authRefresh: true,
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C163919 Configure remote storage (volaris)',
    { tags: ['smoke', 'volaris', 'C163919'] },
    () => {
      // parametrized providers
      [
        Configurations.configurations.CaiaSoft,
        Configurations.configurations.DematicEMS,
        Configurations.configurations.DematicStagingDirector,
      ].forEach((configuration) => {
        const name = `AutotestConfigurationName${getRandomPostfix()}`;
        configuration.create(name);
        Configurations.verifyCreatedConfiguration(name, configuration);
        const newName = `newAutotestConfigurationName${getRandomPostfix()}`;
        Configurations.editConfiguration(name, { nameInput: newName });
        Configurations.confirmCreateRemoteStorage();
        Configurations.verifyCreatedConfiguration(name, configuration);
        Configurations.editConfiguration(
          name,
          { nameInput: `shouldnotbesaved${getRandomPostfix()}` },
          false,
        );
        Configurations.closeEditConfiguration();
        Configurations.clickCloseWithoutSavingButtonInAreYouSureForm();
        Configurations.deleteRemoteStorage(newName);
      });
    },
  );

  it(
    'C163920 Edit remote storage configuration  (volaris)',
    { tags: ['smoke', 'volaris', 'C163920'] },
    () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;
      const configuration = Configurations.configurations.DematicStagingDirector;
      const urlToEdit = 'newTestUrl';
      const timingToEdit = '7';

      configuration.create(name);
      Configurations.verifyCreatedConfiguration(name, configuration);

      // edit and verify url
      Configurations.editConfiguration(name, { urlInput: urlToEdit });
      Configurations.closeWithSaving();
      Configurations.verifyEditedConfiguration(name, { urlInput: urlToEdit });

      // edit and verify timing
      Configurations.editConfiguration(name, { timingInput: timingToEdit });
      Configurations.closeWithoutSaving();
      Configurations.editConfiguration(name, { urlInput: urlToEdit, timingInput: '1' });
      Configurations.closeWithSaving();

      // delete created configuration
      Configurations.deleteRemoteStorage(name);
    },
  );
});
