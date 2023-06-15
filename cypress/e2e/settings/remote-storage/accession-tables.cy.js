import RemoteStorageHelper from '../../../support/fragments/settings/remote-storage/remote-storage-configuration';
import TestTypes from '../../../support/dictionary/testTypes';
import settingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';

describe('remote-storage-configuration', () => {
  const rs = RemoteStorageHelper.configurations.CaiaSoft;

  it('C343219 Check “Accession tables” page without configurations with CaiaSoft provider (firebird)', { tags: [TestTypes.criticalPath, devTeams.firebird] }, () => {
    // delete existing remote storage conf
    cy.loginAsAdmin({ path: settingsMenu.remoteStorageConfigurationPathPath, waiter: RemoteStorageHelper.waitLoading });
    RemoteStorageHelper.deleteRemoteStorage('RS2');

    cy.visit(settingsMenu.remoteStorageAccTablesPathPath);
    RemoteStorageHelper.verifyCaiaSoftWarning();

    // returning remote storage conf
    cy.visit(settingsMenu.remoteStorageConfigurationPathPath);
    rs.create('RS2');
  });
});
