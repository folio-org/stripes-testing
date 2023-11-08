import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import OaiPmh, { SECTIONS } from '../../support/fragments/oai-pmh/oaipmhPane';

describe('OAI-PMH', () => {
  const testData = {
    user: {},
  };

  before('Create test data', () => {
    cy.createTempUser([Permissions.oaipmhViewLogs.gui]).then((userProperties) => {
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
    'C410816 Settings (OAI-PMH): HTML page title format (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      // Open "Settings" -> "OAI-PMH"
      OaiPmh.checkSectionListItems({ canViewLogs: true });
      OaiPmh.checkPageTitle('OAI-PMH settings - FOLIO');

      // Click on "General" on the second pane
      OaiPmh.selectSection(SECTIONS.GENERAL);
      OaiPmh.checkPageTitle('OAI-PMH settings - General - FOLIO');

      // Click on "Technical" on the second pane
      OaiPmh.selectSection(SECTIONS.TECHNICAL);
      OaiPmh.checkPageTitle('OAI-PMH settings - Technical - FOLIO');

      // Click on "Behavior" on the second pane
      OaiPmh.selectSection(SECTIONS.BEHAVIOR);
      OaiPmh.checkPageTitle('OAI-PMH settings - Behavior - FOLIO');

      // Click on "Logs" on the second pane
      OaiPmh.selectSection(SECTIONS.LOGS);
      OaiPmh.checkPageTitle('OAI-PMH settings - Logs - FOLIO');
    },
  );
});
