import TopMenu from '../../../support/fragments/topMenu';
import RemoteStorageHelper from '../../../support/fragments/settings/remote-storage/remote-storage-configuration';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';

describe('export instance records', () => {
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.remoteStorageConfigurationPath);
  });

  // parametrized providers
  [
    RemoteStorageHelper.configurations.CaiaSoft,
    RemoteStorageHelper.configurations.DematicEMS,
    RemoteStorageHelper.configurations.DematicStagingDirector
  ].forEach(configuration => {
    it('C163919 configure remote storage', { tags: [testTypes.smoke] }, () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;

      configuration.create(name);
      RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);
      RemoteStorageHelper.editConfiguration(name);
      RemoteStorageHelper.closeWithoutSaving();
      RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);
      RemoteStorageHelper.deleteRemoteStorage(name, configuration);
    });
  });
});
