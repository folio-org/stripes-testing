import permissions from '../../support/dictionary/permissions';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { Behavior, General, OaiPmh, Technical } from '../../support/fragments/settings/oai-pmh';
import { SECTIONS } from '../../support/fragments/settings/oai-pmh/oaipmhPane';

let user;

describe('OAI-PMH', () => {
  before('Create test data', () => {
    cy.createTempUser([permissions.oaipmhView.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaiPmh.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C422242 "Settings (OAI-PMH): Can view" permission for OAI-PMH (firebird)',
    { tags: ['smoke', 'firebird', 'shiftLeft', 'C422242'] },
    () => {
      TopMenuNavigation.navigateToApp('Settings', 'OAI-PMH');
      OaiPmh.checkSectionListItems();
      OaiPmh.selectSection(SECTIONS.GENERAL);
      General.verifyGeneralPane(true);
      General.verifySaveButton(true);
      OaiPmh.selectSection(SECTIONS.TECHNICAL);
      Technical.verifyTechnicalPane(true);
      Technical.verifySaveButton(true);
      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      Behavior.verifyBehaviorPane(true);
      Behavior.verifySaveButton(true);
    },
  );
});
