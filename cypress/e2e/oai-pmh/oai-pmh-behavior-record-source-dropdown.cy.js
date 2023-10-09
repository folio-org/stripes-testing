import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import permissions from '../../support/dictionary/permissions';
import SettingsMenu from '../../support/fragments/settingsMenu';
import OaipmhPane from '../../support/fragments/oai-pmh/oaipmhPane';
import BehaviorPane from '../../support/fragments/oai-pmh/behaviorPane';
import InteractorsTools from '../../support/utils/interactorsTools';

let user;
const calloutMessageText = 'Setting was successfully updated.';

describe('OAI-PMH', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.oaipmhSettingsEdit.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaipmhPane.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });

  it(
    'C367985 Verify that "Record Source" dropdown is added to Behavior page',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      OaipmhPane.verifyPaneElements();
      OaipmhPane.clickBehaviorItem();
      BehaviorPane.verifyBehaviorPane();
      BehaviorPane.verifyRecordSourceDropdownDefaultValue('Source record storage');
      BehaviorPane.pickFromRecordSourceDropdown('Inventory');
      BehaviorPane.clickSave();
      InteractorsTools.checkCalloutMessage(calloutMessageText);

      // Re-login and verify the settings are saved
      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaipmhPane.waitLoading,
      });
      OaipmhPane.clickBehaviorItem();
      BehaviorPane.verifyRecordSourceDropdownDefaultValue('Inventory');
      BehaviorPane.pickFromRecordSourceDropdown('Source records storage and Inventory');
      BehaviorPane.clickSave();
      InteractorsTools.checkCalloutMessage(calloutMessageText);

      // Re-login and verify the settings are saved
      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaipmhPane.waitLoading,
      });
      OaipmhPane.clickBehaviorItem();
      BehaviorPane.verifyRecordSourceDropdownDefaultValue('Source record storage and Inventory');
      BehaviorPane.pickFromRecordSourceDropdown('Source records storage');
      BehaviorPane.clickSave();
      InteractorsTools.checkCalloutMessage(calloutMessageText);
    },
  );
});
