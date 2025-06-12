import {
  AccessionTables,
  Configurations,
} from '../../../support/fragments/settings/remote-storage';
import RemoteStorage from '../../../support/fragments/settings/remote-storage/remoteStorage';
import settingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('remote-storage-configuration', () => {
  const rs = Configurations.configurations.CaiaSoft;

  beforeEach('Login', () => {
    cy.loginAsAdmin({
      path: settingsMenu.remoteStoragePath,
      waiter: () => cy.wait(3000),
    });
    RemoteStorage.goToConfigurations();
    Configurations.waitLoading();
  });

  it(
    'C343219 Check “Accession tables” page without configurations with CaiaSoft provider (volaris)',
    { tags: ['criticalPath', 'volaris', 'C343219'] },
    () => {
      Configurations.ensureRemoteStorageExists('RS2');
      Configurations.deleteAllRemoteStoragesViaAPIExceptOf('RS2');

      Configurations.deleteRemoteStorage('RS2');
      AccessionTables.openTabAccessionTablesFromSettings();
      Configurations.verifyCaiaSoftWarning();

      // returning remote storage configuration
      Configurations.openConfigurationsTabFromSettings();
      rs.create('RS2');
    },
  );

  it(
    'C343220 Configure remote storage and open “Accession tables” using the “Remote storage” pane (volaris)',
    { tags: ['criticalPath', 'volaris', 'C343220'] },
    () => {
      const testName = getRandomPostfix();
      rs.create(testName);
      Configurations.verifyCreatedConfiguration(testName, rs);

      AccessionTables.openTabAccessionTablesFromSettings();
      AccessionTables.verifyAccessionTablePane();

      Configurations.openConfigurationsTabFromSettings();
      Configurations.deleteRemoteStorage(testName);
    },
  );
});
