import RemoteStorageHelper from '../../../support/fragments/settings/remote-storage/remote-storage-configuration';
import TestTypes from '../../../support/dictionary/testTypes';
import settingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('remote-storage-configuration', () => {
  const rs = RemoteStorageHelper.configurations.CaiaSoft;

  it('C343219 Check “Accession tables” page without configurations with CaiaSoft provider (firebird)', { tags: [TestTypes.criticalPath, devTeams.firebird] }, () => {
    // delete existing remote storage conf
    cy.loginAsAdmin({ path: settingsMenu.remoteStorageConfigurationPath, waiter: RemoteStorageHelper.waitLoading });
    RemoteStorageHelper.deleteRemoteStorage('RS2');

    cy.visit(settingsMenu.remoteStorageAccTablesPath);
    RemoteStorageHelper.verifyCaiaSoftWarning();

    // returning remote storage conf
    cy.visit(settingsMenu.remoteStorageConfigurationPath);
    rs.create('RS2');
  });

  it('C343220 Configure remote storage and open “Accession tables” using the “Remote storage” pane (firebird)', { tags: [TestTypes.criticalPath, devTeams.firebird] }, () => {
    cy.loginAsAdmin({ path: settingsMenu.remoteStorageConfigurationPath, waiter: RemoteStorageHelper.waitLoading });

    const testName = getRandomPostfix();
    rs.create(testName);
    RemoteStorageHelper.verifyCreatedConfiguration(testName, rs);

    cy.visit(settingsMenu.remoteStorageAccTablesPath);
    RemoteStorageHelper.verifyAccessionTablePane();

    cy.visit(settingsMenu.remoteStorageConfigurationPath);
    RemoteStorageHelper.deleteRemoteStorage(testName);
  });
});
