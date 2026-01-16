import { Permissions } from '../../../support/dictionary';
import NoteTypes from '../../../support/fragments/settings/notes/noteTypes';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Notes', () => {
  const testData = {};

  before('Create test data', () => {
    cy.createTempUser([Permissions.uiNotesSettingsEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C423517 "Settings>>Notes" HTML page title follows "<<App name>> settings - <<selected page name>> - FOLIO" format (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C423517'] },
    () => {
      SettingsPane.verifyNotesIconInSettings();
      SettingsPane.selectNotesSettings();

      NoteTypes.verifyGeneralSectionExists();
      NoteTypes.clickGeneralButton();
      NoteTypes.waitLoading();
    },
  );
});
