import TopMenu from '../../../support/fragments/topMenu';
import Configurations from '../../../support/fragments/settings/remote-storage/configurations';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import permissions from '../../../support/dictionary/permissions';

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
    });
  });

  it(
    'C163919 Configure remote storage (firebird)',
    { tags: [TestTypes.smoke, DevTeams.firebird] },
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
        Configurations.editConfiguration(name, { nameInput: 'newAutotestConfigurationName' });
        Configurations.closeWithoutSaving();
        Configurations.verifyCreatedConfiguration(name, configuration);
        Configurations.deleteRemoteStorage(name);
      });
    },
  );

  it(
    'C163920 Edit remote storage configuration  (firebird)',
    { tags: [TestTypes.smoke, DevTeams.firebird] },
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

      // delete created configuration
      Configurations.deleteRemoteStorage(name);
    },
  );
});
