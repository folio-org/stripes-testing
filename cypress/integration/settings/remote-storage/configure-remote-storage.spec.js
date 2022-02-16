import TopMenu from '../../../support/fragments/topMenu';
import RemoteStorageHelper from '../../../support/fragments/settings/remote-storage/configuration';
import getRandomPostfix from '../../../support/utils/stringTools';
import testTypes from '../../../support/dictionary/testTypes';

describe('export instance records', () => {
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.remoteStorageConfigurationPath);
  });

  // parametrized providers
  [
    RemoteStorageHelper.providers.CaiaSoft,
    RemoteStorageHelper.providers.DematicEMS,
    RemoteStorageHelper.providers.DematicStagingDirector
  ].forEach(provider => {
    it('C163919 configure remote storage', { tags: [testTypes.smoke] }, () => {
      const name = `TestName${getRandomPostfix()}`;

      provider.create(name);
      RemoteStorageHelper.verifyCreatedRemoteStorage(name, provider);
      RemoteStorageHelper.tryToEditRemoteStorage(name);
      RemoteStorageHelper.verifyCreatedRemoteStorage(name, provider);
      provider.delete(name);
    });
  });
});
