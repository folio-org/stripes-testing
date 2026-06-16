import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import SettingsDataImport from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    // bug report https://folio-org.atlassian.net/browse/STRIPES-1024
    it(
      'C350008 Verify that "Data import" settings displays correctly with focus (folijet)',
      { tags: ['extendedPath', 'folijet', 'C350008'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsPane.waitLoading();
        SettingsPane.checkSettingsNavPaneFocused();

        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.waitLoading();
        SettingsDataImport.checkDataImportNavPaneFocused();
      },
    );
  });
});
