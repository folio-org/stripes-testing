import { Permissions } from '../../../support/dictionary';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TemporarySessionLocale from '../../../support/fragments/settings/developer/session-locale/temporarySessionLocale';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import TenantPane, { TENANTS } from '../../../support/fragments/settings/tenant/tenantPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Settings', () => {
  describe('Tenant', () => {
    const testData = {
      buttonLanguage: 'German (Germany) / Deutsch (Deutschland)',
      defaultButtonLanguage: 'American English / American English',
      paneHeaderTitle: 'TEMPORÄRES Session-Gebietsschema',
      defaultPaneHeaderTitle: 'TEMPORARY Session locale',
    };
    const instanceTitle = `C407670 autotestInstance ${randomFourDigitNumber()}`;
    const itemBarcode = Helper.getRandomBarcode();
    const HoldingData = {
      rowNumber: 1,
      status: 'Verfügbar',
      accordionHeaderLanguageValue: 'Bestand: Main Library',
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.createInstanceViaApi(instanceTitle, itemBarcode);
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
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
      cy.visit(SettingsMenu.tenantPath);
      TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
      Localization.clickChangeSessionLocalLanguage();
      TemporarySessionLocale.waitLoading();
      TemporarySessionLocale.selectCountry(testData.defaultButtonLanguage);
      TemporarySessionLocale.verifyTitleOfPaneHeader(testData.defaultPaneHeaderTitle);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
      });
    });

    it(
      'C407670 Verify the item status language in the instances item list when session locale is "German" (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        TenantPane.selectTenant(TENANTS.LANGUAGE_AND_LOCALIZATION);
        Localization.clickChangeSessionLocalLanguage();
        TemporarySessionLocale.waitLoading();
        TemporarySessionLocale.selectCountry(testData.buttonLanguage);
        TemporarySessionLocale.verifyTitleOfPaneHeader(testData.paneHeaderTitle);
        TopMenu.openInventoryApp();
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.searchByStatus('Verfügbar');
        InventoryInstances.searchByTitle(instanceTitle);
        InventoryInstance.checkHoldingsStatus(
          HoldingData.rowNumber,
          HoldingData.status,
          HoldingData.accordionHeaderLanguageValue,
        );
      },
    );
  });
});
