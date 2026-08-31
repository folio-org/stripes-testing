import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TemporarySessionLocale from '../../../support/fragments/settings/developer/session-locale/temporarySessionLocale';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { HTML, including } from '../../../../interactors';
import { APPLICATION_NAMES } from '../../../support/constants';
import SettingsPane from '../../../support/fragments/settings/settingsPane';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C398020_FolioInstance_${randomPostfix}`,
      itemBarcode: `at_c398020_${randomPostfix}`,
      englishTexts: {
        itemData: 'book, available',
        localeOption: 'German (Germany) / Deutsch (Deutschland)',
        developerTab: 'Developer',
        localeTab: 'Session locale',
        holdings: 'Holdings: ',
      },
      germanTexts: {
        localePaneTitle: 'TEMPORÄRES Session-Gebietsschema',
        inventoryTexts: ['Katalog', 'Suchen', 'Browsen'],
        itemData: 'book, Verfügbar',
        holdings: 'Bestand: ',
      },
    };
    let testUser;

    function verifyTextShown(text) {
      cy.expect(HTML(including(text)).exists());
    }

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        testData.instanceId = InventoryInstances.createInstanceViaApi(
          testData.instanceTitle,
          testData.itemBarcode,
        );
      });
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiSettingsDeveloperSessionLocale.gui,
      ]).then((userProperties) => {
        testUser = userProperties;

        cy.login(testUser.username, testUser.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser?.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C398020 Verify that Item data and Material type are displayed in lower case on Items detail page (promin)',
      { tags: ['extendedPath', 'promin', 'C398020'] },
      () => {
        // Step 1: Find instance, open item detail page via barcode
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion(testData.englishTexts.holdings);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);

        // Step 2: Verify material type and status are lowercase in English ("book, available")
        verifyTextShown(testData.englishTexts.itemData);

        // Steps 3-4: Switch session locale to German
        TopMenuNavigation.navigateToApp(
          APPLICATION_NAMES.SETTINGS,
          testData.englishTexts.developerTab,
        );
        SettingsPane.selectSettingsTab(testData.englishTexts.localeTab);
        TemporarySessionLocale.waitLoading();
        TemporarySessionLocale.selectCountry(testData.englishTexts.localeOption);
        TemporarySessionLocale.verifyTitleOfPaneHeader(testData.germanTexts.localePaneTitle);

        // Step 5: Return to Inventory, reopen same item, verify German locale case
        TopMenu.openInventoryApp();
        testData.germanTexts.inventoryTexts.forEach((text) => {
          verifyTextShown(text);
        });
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion(testData.germanTexts.holdings);
        InventoryInstance.openItemByBarcodeAndIndex(testData.itemBarcode, 0);
        verifyTextShown(testData.germanTexts.itemData);
      },
    );
  });
});
