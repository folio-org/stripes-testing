import permissions from '../../../support/dictionary/permissions';
import { Configurations } from '../../../support/fragments/settings/remote-storage';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

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
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C343288 Data synchronization settings section must be present only for Dematic StagingDirector provider (volaris)',
    { tags: ['criticalPath', 'volaris', 'C343288'] },
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
    'C343287 Data synchronization settings field must be undefined for any provider except Dematic StagingDirector (volaris)',
    { tags: ['criticalPath', 'volaris', 'C343287'] },
    () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;

      Configurations.verifyProviderDataSynchronizationSettings();
      dematicStagingDirector.create(name);
      Configurations.verifyCreatedConfiguration(name, dematicStagingDirector);

      Configurations.deleteRemoteStorage(name);
    },
  );
});
