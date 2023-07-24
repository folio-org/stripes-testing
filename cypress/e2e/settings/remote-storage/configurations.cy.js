import RemoteStorageHelper from '../../../support/fragments/settings/remote-storage/remote-storage-configuration';
import Users from '../../../support/fragments/users/users';
import TestTypes from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';

let user;
const name = `AutotestConfigurationName${getRandomPostfix()}`;

describe('remote-storage-configuration', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.remoteStorageCRUD.gui]).then(userProperties => {
      user = userProperties;
      cy.login(user.username, user.password, { path: SettingsMenu.remoteStorageConfigurationPath, waiter: RemoteStorageHelper.waitLoading });
    });
  });

  after('delet test data', () => {
    RemoteStorageHelper.deleteRemoteStorage(name);
    Users.deleteViaApi(user.userId);
  });

  it('C343219 Check “Accession tables” page without configurations with CaiaSoft provider (firebird)', { tags: [TestTypes.criticalPath, devTeams.firebird] }, () => {
    const dematicEMS = RemoteStorageHelper.configurations.DematicEMS;
    const caiaSoft = RemoteStorageHelper.configurations.CaiaSoft;
    const dematicStagingDirector = RemoteStorageHelper.configurations.DematicStagingDirector;

    dematicEMS.create(name);
    RemoteStorageHelper.verifyCreatedConfiguration(name, dematicEMS);

    RemoteStorageHelper.editConfiguration(name, { provider: caiaSoft.title });
    RemoteStorageHelper.closeWithSaving();
    RemoteStorageHelper.verifyEditedConfiguration(name, { provider: caiaSoft.title });
    RemoteStorageHelper.verifyDataSynchronizationSettingsAccordion(false);

    RemoteStorageHelper.editConfiguration(name, { provider: dematicStagingDirector.title });
    RemoteStorageHelper.closeWithSaving();
    RemoteStorageHelper.verifyEditedConfiguration(name, { provider: `${dematicStagingDirector.title} (TCP/IP)` });
    RemoteStorageHelper.verifyDataSynchronizationSettingsAccordion(true);
  });
});
