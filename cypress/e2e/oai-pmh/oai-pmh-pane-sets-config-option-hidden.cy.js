import { Permissions } from '../../support/dictionary';
import OaiPmh, { SECTIONS } from '../../support/fragments/oai-pmh/oaipmhPane';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('OAI-PMH', () => {
  const testData = {};

  before('Create test data', () => {
    cy.createTempUser([Permissions.oaipmhSettingsEdit.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.oaiPmhPath,
        waiter: OaiPmh.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C376937 Verify "Sets" configuration option is hidden in "OAI-PMH" pane of "OAI-PMH" settings (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      TopMenuNavigation.navigateToApp('Settings');
      TopMenuNavigation.navigateToApp('Settings', 'OAI-PMH');

      OaiPmh.checkPageTitle('OAI-PMH settings - FOLIO');

      OaiPmh.selectSection(SECTIONS.GENERAL);
      OaiPmh.checkPageTitle('OAI-PMH settings - General - FOLIO');

      OaiPmh.selectSection(SECTIONS.TECHNICAL);
      OaiPmh.checkPageTitle('OAI-PMH settings - Technical - FOLIO');

      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      OaiPmh.checkPageTitle('OAI-PMH settings - Behavior - FOLIO');

      OaiPmh.checkSectionListItemDoesNotExist('Sets');
    },
  );
});
