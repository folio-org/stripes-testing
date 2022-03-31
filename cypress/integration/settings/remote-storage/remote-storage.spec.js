import TopMenu from '../../../support/fragments/topMenu';
import RemoteStorageHelper from '../../../support/fragments/settings/remote-storage/remote-storage-configuration';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';

describe('remote-storage-configuration', () => {
  beforeEach('login', () => {
    // TODO: need to clarify about permissions at FAT-1196
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.remoteStorageConfigurationPath);
  });

  // parametrized providers
  [
    RemoteStorageHelper.configurations.CaiaSoft,
    RemoteStorageHelper.configurations.DematicEMS,
    RemoteStorageHelper.configurations.DematicStagingDirector
  ].forEach(configuration => {
    it('C163919 configure remote storage', { tags: [TestTypes.smoke] }, () => {
      const name = `AutotestConfigurationName${getRandomPostfix()}`;

      configuration.create(name);
      RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);
      RemoteStorageHelper.editConfiguration(name, { nameInput: 'newAutotestConfigurationName' });
      RemoteStorageHelper.closeWithoutSaving();
      RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);
      RemoteStorageHelper.deleteRemoteStorage(name);
    });
  });

  it('C163920 edit remote storage', { tags: [TestTypes.smoke] }, () => {
    const name = `AutotestConfigurationName${getRandomPostfix()}`;
    const configuration = RemoteStorageHelper.configurations.DematicStagingDirector;
    const urlToEdit = 'newTestUrl';
    const timingToEdit = '7';

    configuration.create(name);
    RemoteStorageHelper.verifyCreatedConfiguration(name, configuration);

    // edit and verify url
    RemoteStorageHelper.editConfiguration(name, { urlInput: urlToEdit });
    RemoteStorageHelper.closeWithSaving();
    RemoteStorageHelper.verifyEditedConfiguration(name, { urlInput: urlToEdit });

    // edit and verify timing
    RemoteStorageHelper.editConfiguration(name, { timingInput: timingToEdit });
    RemoteStorageHelper.closeWithoutSaving();
    RemoteStorageHelper.editConfiguration(name, { urlInput: urlToEdit, timingInput: '1' });

    // delete created configuration
    RemoteStorageHelper.deleteRemoteStorage(name);
  });
});
