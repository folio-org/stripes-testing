import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TagsGeneral from '../../../support/fragments/settings/tags/tags-general';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Tags', () => {
  let user;

  before('Create test user and login', () => {
    cy.createTempUser([Permissions.uiViewTagsSettings.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C347893 Change focus for Tags settings (promin)',
    { tags: ['extendedPath', 'promin', 'C347893'] },
    () => {
      // Step 1: Go to Settings → Settings nav pane has focus
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
      SettingsPane.waitLoading();
      // TO DO: uncomment line below after https://folio-org.atlassian.net/browse/STRIPES-1024 is fixed
      // SettingsPane.checkSettingsNavPaneFocused();

      // Step 2: Click Tags → Tags settings display in second column, focus moves there
      SettingsPane.selectSettingsTab('Tags');
      TagsGeneral.waitLoading();
      SettingsPane.checkAppSettingsNavPaneFocused();
    },
  );
});
