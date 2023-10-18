import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TemporarySessionLocale from '../../../support/fragments/settings/developer/session-locale/temporarySessionLocale';
import { Localization } from '../../../support/fragments/settings/tenant/general';

describe('eHoldings', () => {
  const testData = {};

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      // create all test objects
    });

    cy.createTempUser([
      Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
      Permissions.uieHoldingsRecordsEdit.gui,
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
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C402348 Create custom package when session locale is not "English" (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.clickChangeSessionLocalLanguage();
      TemporarySessionLocale.selectCountry('español');
      cy.wait(5000);
      cy.pause();
    },
  );
});
