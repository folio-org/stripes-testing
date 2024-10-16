import {
  AccessionTables,
  Configurations,
} from '../../../support/fragments/settings/remote-storage';
import settingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('remote-storage-configuration', () => {
  const rs = Configurations.configurations.CaiaSoft;

  it(
    'C343219 Check “Accession tables” page without configurations with CaiaSoft provider (firebird)',
    { tags: ['criticalPath', 'firebird', 'C343219'] },
    () => {
      // delete existing remote storage conf
      cy.loginAsAdmin({
        path: settingsMenu.remoteStorageConfigurationPath,
        waiter: Configurations.waitLoading,
      });
      Configurations.deleteRemoteStorage('RS2');

      AccessionTables.openTabAccessionTablesFromSettings();
      Configurations.verifyCaiaSoftWarning();

      // returning remote storage conf
      Configurations.openConfigurationsTabFromSettings();
      rs.create('RS2');
    },
  );

  it(
    'C343220 Configure remote storage and open “Accession tables” using the “Remote storage” pane (firebird)',
    { tags: ['criticalPath', 'firebird', 'C343220'] },
    () => {
      cy.loginAsAdmin({
        path: settingsMenu.remoteStorageConfigurationPath,
        waiter: Configurations.waitLoading,
      });

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
