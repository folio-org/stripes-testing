import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import TemporarySessionLocale from '../../../support/fragments/settings/developer/session-locale/temporarySessionLocale';

describe('Tenant', () => {
  const testData = {};

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiSettingsDeveloperSessionLocale.gui,
      Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C365610 Verify that "Change session locale" is rendered as a link (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.checkPaneContent();
      Localization.clickChangeSessionLocalLanguage();
      TemporarySessionLocale.waitLoading();
      TemporarySessionLocale.verifyTitleOfPaneHeader('TEMPORARY Session locale');
    },
  );
});
