import permissions from '../../support/dictionary/permissions';
import { Behavior, OaiPmh } from '../../support/fragments/settings/oai-pmh';
import { SECTIONS } from '../../support/fragments/settings/oai-pmh/oaipmhPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';

let user;
const calloutMessageText = 'Setting was successfully updated.';

describe('OAI-PMH', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.oaipmhSettingsEdit.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaiPmh.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C367985 Verify that "Record Source" dropdown is added to Behavior page (firebird)',
    { tags: ['criticalPath', 'firebird', 'C367985'] },
    () => {
      OaiPmh.checkSectionListItems();
      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      Behavior.verifyBehaviorPane();
      Behavior.verifyRecordSourceDropdownDefaultValue('Source record storage');
      Behavior.pickFromRecordSourceDropdown('Inventory');
      Behavior.clickSave();
      InteractorsTools.checkCalloutMessage(calloutMessageText);

      // Re-login and verify the settings are saved
      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaiPmh.waitLoading,
        authRefresh: true,
      });
      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      Behavior.verifyRecordSourceDropdownDefaultValue('Inventory');
      Behavior.pickFromRecordSourceDropdown('Source records storage and Inventory');
      Behavior.clickSave();
      InteractorsTools.checkCalloutMessage(calloutMessageText);

      // Re-login and verify the settings are saved
      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaiPmh.waitLoading,
        authRefresh: true,
      });
      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      Behavior.verifyRecordSourceDropdownDefaultValue('Source record storage and Inventory');
      Behavior.pickFromRecordSourceDropdown('Source records storage');
      Behavior.clickSave();
      InteractorsTools.checkCalloutMessage(calloutMessageText);
    },
  );
});
