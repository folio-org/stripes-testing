import { Configurations } from '../../../support/fragments/settings/remote-storage';
import Users from '../../../support/fragments/users/users';
import testTypes from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';

let user;

const dematicEMS = Configurations.configurations.DematicEMS;
const caiaSoft = Configurations.configurations.CaiaSoft;
const dematicStagingDirector = Configurations.configurations.DematicStagingDirector;

describe('remote-storage-configuration', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.remoteStorageCRUD.gui]).then((userProperties) => {
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
    'C343219 Check “Accession tables” page without configurations with CaiaSoft provider (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;

      dematicEMS.create(name);
      Configurations.verifyCreatedConfiguration(name, dematicEMS);

      Configurations.editConfiguration(name, { provider: caiaSoft.title });
      Configurations.closeWithSaving();
      Configurations.verifyEditedConfiguration(name, { provider: caiaSoft.title });
      Configurations.verifyDataSynchronizationSettingsAccordion(false);

      Configurations.editConfiguration(name, { provider: dematicStagingDirector.title });
      Configurations.closeWithSaving();
      Configurations.verifyEditedConfiguration(name, {
        provider: `${dematicStagingDirector.title}`,
      });
      Configurations.verifyDataSynchronizationSettingsAccordion(true);

      Configurations.deleteRemoteStorage(name);
    },
  );

  it(
    'C343287 Data synchronization settings field must be undefined for any provider except Dematic StagingDirector (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;

      Configurations.verifyProviderDataSynchronizationSettings();
      dematicStagingDirector.create(name);
      Configurations.verifyCreatedConfiguration(name, dematicStagingDirector);

      Configurations.deleteRemoteStorage(name);
    },
  );
});
