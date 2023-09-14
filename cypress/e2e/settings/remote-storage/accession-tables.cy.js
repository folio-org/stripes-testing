import {
  Configurations,
  AccessionTables,
} from '../../../support/fragments/settings/remote-storage';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import settingsMenu from '../../../support/fragments/settingsMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('remote-storage-configuration', () => {
  const rs = Configurations.configurations.CaiaSoft;

  it(
    'C343219 Check “Accession tables” page without configurations with CaiaSoft provider (firebird)',
    { tags: [TestTypes.criticalPath, DevTeams.firebird] },
    () => {
      // delete existing remote storage conf
      cy.loginAsAdmin({
        path: settingsMenu.remoteStorageConfigurationPath,
        waiter: Configurations.waitLoading,
      });
      Configurations.deleteRemoteStorage('RS2');

      cy.visit(settingsMenu.remoteStorageAccTablesPath);
      Configurations.verifyCaiaSoftWarning();

      // returning remote storage conf
      cy.visit(settingsMenu.remoteStorageConfigurationPath);
      rs.create('RS2');
    },
  );

  it(
    'C343220 Configure remote storage and open “Accession tables” using the “Remote storage” pane (firebird)',
    { tags: [TestTypes.criticalPath, DevTeams.firebird] },
    () => {
      cy.loginAsAdmin({
        path: settingsMenu.remoteStorageConfigurationPath,
        waiter: Configurations.waitLoading,
      });

      const testName = getRandomPostfix();
      rs.create(testName);
      Configurations.verifyCreatedConfiguration(testName, rs);

      cy.visit(settingsMenu.remoteStorageAccTablesPath);
      AccessionTables.verifyAccessionTablePane();

      cy.visit(settingsMenu.remoteStorageConfigurationPath);
      Configurations.deleteRemoteStorage(testName);
    },
  );
});
