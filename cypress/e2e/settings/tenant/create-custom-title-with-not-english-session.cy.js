import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { AssignedUsers } from '../../../support/fragments/settings/eholdings';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import TemporarySessionLocale from '../../../support/fragments/settings/developer/session-locale/temporarySessionLocale';
import {
  EHoldingsSearch,
  EHoldingsPackages,
  EHoldingsTitles,
  EHoldingsResourceView,
} from '../../../support/fragments/eholdings';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  const testData = {
    dataForFirstPackage: {
      titleName: `test_title${getRandomPostfix()}`,
      buttonLanguage: 'Spanish / español',
      paneHeaderTitle: 'Configuración local de la sesión TEMPORAL',
    },
    dataForSecondPackage: {
      titleName: `test_title${getRandomPostfix()}`,
      buttonLanguage: 'Italian (Italy) / italiano (Italia)',
      paneHeaderTitle: 'Localizzazione TEMPORANEA di sessione',
    },
  };

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
      Permissions.uieHoldingsRecordsEdit.gui,
      Permissions.uiSettingsDeveloperSessionLocale.gui,
      Permissions.settingsTenantEditLanguageLocationAndCurrency.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
      AssignedUsers.assignUserToDefaultCredentialsViaApi({ userId: testData.user.userId });
      EHoldingsPackages.getCustomPackageViaApi().then((packageName) => {
        testData.packageName = packageName;
      });
      cy.login(testData.user.username, testData.user.password, {
        path: SettingsMenu.tenantPath,
        waiter: TenantPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C402349 Create custom title when session locale is not "English" (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.clickChangeSessionLocalLanguage();
      TemporarySessionLocale.waitLoading();
      TemporarySessionLocale.selectCountry(testData.dataForFirstPackage.buttonLanguage);
      TemporarySessionLocale.verifyTitleOfPaneHeader(testData.dataForFirstPackage.paneHeaderTitle);
      TopMenu.openEHoldingsApp();
      EHoldingsSearch.switchToTitles();
      EHoldingsTitles.create(testData.packageName, testData.dataForFirstPackage.titleName);
      EHoldingsResourceView.checkNames(
        testData.packageName,
        testData.dataForFirstPackage.titleName,
      );
      cy.visit(SettingsMenu.tenantPath);
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.clickChangeSessionLocalLanguage();
      TemporarySessionLocale.waitLoading();
      TemporarySessionLocale.selectCountry(testData.dataForSecondPackage.buttonLanguage);
      TemporarySessionLocale.verifyTitleOfPaneHeader(testData.dataForSecondPackage.paneHeaderTitle);
      TopMenu.openEHoldingsApp();
      EHoldingsSearch.switchToTitles();
      EHoldingsTitles.create(testData.packageName, testData.dataForSecondPackage.titleName);
      EHoldingsResourceView.checkNames(
        testData.packageName,
        testData.dataForSecondPackage.titleName,
      );
    },
  );
});
