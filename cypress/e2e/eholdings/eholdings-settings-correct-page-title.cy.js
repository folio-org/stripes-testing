import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import SettingsPane from '../../support/fragments/settings/settingsPane';
import Credentials from '../../support/fragments/settings/eholdings/credentials';
import { APPLICATION_NAMES, EHOLDINGS_KB_SETTINGS_TABS } from '../../support/constants';

describe('eHoldings', () => {
  const getExpectedTitle = (optionName) => `${APPLICATION_NAMES.EHOLDINGS} settings - ${optionName ? `${optionName}` : 'Knowledge base'} - FOLIO`;
  let kbName;
  let user;

  before('Creating user', () => {
    cy.getAdminToken();
    Credentials.getCredentialsViaApi().then((kbs) => {
      kbName = kbs[0].attributes.name;
    });

    cy.createTempUser([
      Permissions.uiSettingsEHoldingsAssignUsers.gui,
      Permissions.uiSettingsEHoldingsViewAccessStatusTypes.gui,
      Permissions.uiSettingsEHoldingsViewCustomLabel.gui,
      Permissions.uiSettingsEHoldingsRootProxyEdit.gui,
      Permissions.uiSettingsEHoldingsViewSettings.gui,
      Permissions.uiSettingsEHoldingsUsageConsolidationView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.settingsPath,
        waiter: SettingsPane.waitLoading,
      });
    });
  });

  after('Delete user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C423384 Verify that "Settings>>eHoldings" HTML page title follows "<<App name>> settings - <<selected page name>> - FOLIO" format (spitfire)',
    { tags: ['extendedPath', 'spitfire', 'C423384'] },
    () => {
      SettingsPane.selectSettingsTab(APPLICATION_NAMES.EHOLDINGS);
      SettingsPane.checkPaneIsOpened(APPLICATION_NAMES.EHOLDINGS);
      Credentials.checkKnowledgeBaseExists(kbName);

      Credentials.openCredentialsPane(kbName);
      cy.title().should('eq', getExpectedTitle());

      Object.values(EHOLDINGS_KB_SETTINGS_TABS).forEach((tabName) => {
        SettingsPane.selectSettingsTab(tabName);
        SettingsPane.checkPaneIsOpened(tabName);
        cy.title().should('eq', getExpectedTitle(tabName));
      });
    },
  );
});
