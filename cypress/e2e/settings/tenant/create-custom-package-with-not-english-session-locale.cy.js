import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import TemporarySessionLocale from '../../../support/fragments/settings/developer/session-locale/temporarySessionLocale';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import getRandomPostfix from '../../../support/utils/stringTools';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';

describe('eHoldings', () => {
  const testData = {
    dataForFirstPackage: {
      packageName: `test_package${getRandomPostfix()}`,
      buttonLanguage: 'Spanish / español',
      paneHeaderTitle: 'Configuración local de la sesión TEMPORAL',
      calloutMessage: 'Paquete personalizado creado.',
    },
    dataForSecondPackage: {
      packageName: `test_package${getRandomPostfix()}`,
      buttonLanguage: 'Italian (Italy) / italiano (Italia)',
      paneHeaderTitle: 'Localizzazione TEMPORANEA di sessione',
      calloutMessage: 'Pacchetto personalizzato creato.',
    },
  };

  before('Create test data', () => {
    cy.getAdminToken();

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
    EHoldingsPackages.deletePackageViaAPI(testData.dataForFirstPackage.packageName);
    EHoldingsPackages.deletePackageViaAPI(testData.dataForSecondPackage.packageName);
  });

  it(
    'C402348 Create custom package when session locale is not "English" (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.clickChangeSessionLocalLanguage();
      TemporarySessionLocale.waitLoading();
      TemporarySessionLocale.selectCountry(testData.dataForFirstPackage.buttonLanguage);
      TemporarySessionLocale.verifyTitleOfPaneHeader(testData.dataForFirstPackage.paneHeaderTitle);
      TopMenu.openEHoldingsApp();
      EHoldingsSearch.switchToPackages();
      EHoldingsPackages.verifyCustomPackage(
        testData.dataForFirstPackage.packageName,
        'Mixed Content',
        testData.dataForFirstPackage.calloutMessage,
      );
      EHoldingsPackageView.close();
      EHoldingsPackages.verifyPackageExistsViaAPI(testData.dataForFirstPackage.packageName, true);
      cy.visit(SettingsMenu.tenantPath);
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.clickChangeSessionLocalLanguage();
      TemporarySessionLocale.waitLoading();
      TemporarySessionLocale.selectCountry(testData.dataForSecondPackage.buttonLanguage);
      TemporarySessionLocale.verifyTitleOfPaneHeader(testData.dataForSecondPackage.paneHeaderTitle);
      TopMenu.openEHoldingsApp();
      EHoldingsSearch.switchToPackages();
      EHoldingsPackages.verifyCustomPackage(
        testData.dataForSecondPackage.packageName,
        'Mixed Content',
        testData.dataForSecondPackage.calloutMessage,
      );
      EHoldingsPackageView.close();
      EHoldingsPackages.verifyPackageExistsViaAPI(testData.dataForSecondPackage.packageName, true);
    },
  );
});
