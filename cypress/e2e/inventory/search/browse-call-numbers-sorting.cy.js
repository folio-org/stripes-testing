import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import { CALL_NUMBER_TYPE_NAMES, LOCATION_NAMES } from '../../../support/constants';

describe('Inventory -> Call Number Browse', () => {
  let userId;
  const testData = {};
  beforeEach('create tests data', () => {
    testData.instanceTitle = `autoTestInstanceTitle ${getRandomPostfix()}`;
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        });
      })
      .then((instance) => {
        testData.instanceId = instance.instanceId;
      });

    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  afterEach('delete test data', () => {
    Users.deleteViaApi(userId);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
  });

  it(
    'C388549 Browse call numbers - Correct sorting for Other scheme type call numbers (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const holdingsCallNumbers = ['FIC WAL', 'B WASHINGTON', 'FIC CLE', 'B JORDAN', 'SC BRU'];
      const itemsCallNumbers = ['SC VIV', 'FIC DAN', 'DVD F GON', 'B OBAMA', 'SC DAH'];
      // #1 Input query in search input field that will return Instance records → Click "Search" button
      InventoryInstance.searchByTitle(testData.instanceTitle);
      // #2 Click on "Title" value for any row in second pane
      InventoryInstances.selectInstance();

      // #9 Repeat Steps 3-8 using the following "Call number" values for holdings:
      // * "FIC WAL"
      // * "B WASHINGTON"
      // * "FIC CLE"
      // * "B JORDAN"
      // * "SC BRU"
      holdingsCallNumbers.forEach((callNumber) => {
        // #3 Click "Add holdings" button
        InventoryInstance.pressAddHoldingsButton();
        // #4 In "Location" accordion:
        // * Select any value in "Permanent" dropdown in "Location" accordion
        HoldingsRecordEdit.changePermanentLocation(LOCATION_NAMES.ANNEX);
        // * Select "Other scheme" in "Call number type" dropdown
        HoldingsRecordEdit.chooseCallNumberType(CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME);
        // * Input value in "Call number" field ("Holdings call number" section of "Location" accordion):
        HoldingsRecordEdit.fillCallNumber(callNumber);
        // #5 Click "Save & close"
        HoldingsRecordEdit.saveAndClose();
        // #6 Click "Add item" button next to added holding line in detail view
        InventoryInstance.clickAddItemByHoldingName(callNumber);
        // #7 Input:
        // * select any value in "Material type" dropdown
        // * select any value in "Permanent loan type" dropdown
        InventoryInstance.fillItemRequiredFields();
        // * unique value in "Barcode" field
        ItemRecordNew.addBarcode(`barcode ${getRandomPostfix()}`);
        // #8 Click "Save & close"
        ItemRecordNew.save();
        InventoryInstance.verifyNumberOfItemsInHoldingByName(callNumber, 1);
      });

      // #10 Click "Add holdings" button
      InventoryInstance.pressAddHoldingsButton();
      // #11 In "Location" accordion:
      // * Select any value in "Permanent" dropdown in "Location" accordion
      HoldingsRecordEdit.changePermanentLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
      // #12 Click "Save & close"
      HoldingsRecordEdit.saveAndClose();

      // #16 Repeat Steps 13-15 using the following values in "Call number" field:
      //  * "SC VIV"
      // * "FIC DAN"
      // * "DVD F GON"
      // * "B OBAMA"
      // * "SC DAH"
      itemsCallNumbers.forEach((callNumber, index) => {
        // #13 Click "Add item" button next to added holding line in detail view
        InventoryInstance.clickAddItemByHoldingName(LOCATION_NAMES.MAIN_LIBRARY_UI);
        // #14 Input:
        // * select any value in "Material type" dropdown
        // * select any value in "Permanent loan type" dropdown
        InventoryInstance.fillItemRequiredFields();
        // * unique value in "Barcode" field
        ItemRecordNew.addBarcode(`barcode ${getRandomPostfix()}`);
        // * Select "Other scheme" in "Call number type" dropdown
        ItemRecordNew.chooseCallNumberType(CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME);
        // * Input value in "Call number" field:
        ItemRecordNew.addCallNumber(callNumber);
        // #15 Click "Save & close"
        ItemRecordNew.save();
        InventoryInstance.verifyNumberOfItemsInHoldingByName(
          LOCATION_NAMES.MAIN_LIBRARY_UI,
          index + 1,
        );
      });

      // #17 * Select "Browse" in toggle
      // * Select "Other scheme" browse option
      InventorySearchAndFilter.selectBrowseOtherScheme();
      // * Fill browse input field with "B JORDAN"
      InventorySearchAndFilter.browseSearch('B JORDAN');
      // * Click "Search" button
      // * Browse results are shown in second pane
      // * A row with "Call number" value equal to "B JORDAN" is highlighted (bold text)
      BrowseCallNumber.valueInResultTableIsHighlighted('B JORDAN');
      // * Below highlighted row, rows with following call numbers are shown in this order:
      //   * B OBAMA
      //   * B WASHINGTON
      //   * DVD F GON
      //   * FIC CLE
      //   * FIC DAN
      //   * FIC WAL
      //   * SC BRU
      //   * SC DAH
      //   * SC VIV
      const requiredRowsOrder = [
        'B JORDAN',
        'B OBAMA',
        'B WASHINGTON',
        'DVD F GON',
        'FIC CLE',
        'FIC DAN',
        'FIC WAL',
        'SC BRU',
        'SC DAH',
        'SC VIV',
      ];
      BrowseCallNumber.resultRowsIsInRequiredOder(requiredRowsOrder);
    },
  );

  it(
    'C388548 Browse call numbers - Correct sorting for Dewey type call numbers (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const holdingsCallNumbers = ['331.2', '331.042', '331.01', '331.016', '331.1'];
      const itemsCallNumbers = ['331', '331.041', '331.198', '331.0413', '331.02'];
      // #1 Input query in search input field that will return Instance records → Click "Search" button
      InventoryInstance.searchByTitle(testData.instanceTitle);
      // #2 Click on "Title" value for any row in second pane
      InventoryInstances.selectInstance();

      // #9 Repeat Steps 3-8 using the following "Call number" values for holdings:
      // * "331.2"
      // * "331.042"
      // * "331.01"
      // * "331.016"
      // * "331.1"
      holdingsCallNumbers.forEach((callNumber) => {
        // #3 Click "Add holdings" button
        InventoryInstance.pressAddHoldingsButton();
        // #4 In "Location" accordion:
        // * Select any value in "Permanent" dropdown in "Location" accordion
        HoldingsRecordEdit.changePermanentLocation(LOCATION_NAMES.ANNEX);
        // * Select "Dewey Decimal classification" in "Call number type" dropdown
        HoldingsRecordEdit.chooseCallNumberType(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL);
        // * Input  following value in "Call number" field ("Holdings call number" section of "Location" accordion):
        HoldingsRecordEdit.fillCallNumber(callNumber);
        // #5 Click "Save & close"
        HoldingsRecordEdit.saveAndClose();
        // #6 Click "Add item" button next to added holding line in detail view
        InventoryInstance.clickAddItemByHoldingName(callNumber);
        // #7 Input:
        // * select any value in "Material type" dropdown
        // * select any value in "Permanent loan type" dropdown
        InventoryInstance.fillItemRequiredFields();
        // * unique value in "Barcode" field
        ItemRecordNew.addBarcode(`barcode ${getRandomPostfix()}`);
        // #8 Click "Save & close"
        ItemRecordNew.save();
        InventoryInstance.verifyNumberOfItemsInHoldingByName(callNumber, 1);
      });

      // #10 Click "Add holdings" button
      InventoryInstance.pressAddHoldingsButton();
      // #11 In "Location" accordion:
      // * Select any value in "Permanent" dropdown in "Location" accordion
      HoldingsRecordEdit.changePermanentLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
      // #12 Click "Save & close"
      HoldingsRecordEdit.saveAndClose();

      // #16 Repeat Steps 13-15 using the following values in "Call number" field:
      // * "331"
      // * "331.041"
      // * "331.198"
      // * "331.0413"
      // * "331.02"
      itemsCallNumbers.forEach((callNumber, index) => {
        // #13 Click "Add item" button next to added holding line in detail view
        InventoryInstance.clickAddItemByHoldingName(LOCATION_NAMES.MAIN_LIBRARY_UI);
        // #14 Input:
        // * select any value in "Material type" dropdown
        // * select any value in "Permanent loan type" dropdown
        InventoryInstance.fillItemRequiredFields();
        // * unique value in "Barcode" field
        ItemRecordNew.addBarcode(`barcode ${getRandomPostfix()}`);
        // * Select "Other scheme" in "Call number type" dropdown
        ItemRecordNew.chooseCallNumberType(CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL);
        // * Input value in "Call number" field:
        ItemRecordNew.addCallNumber(callNumber);
        // #15 Click "Save & close"
        ItemRecordNew.save();
        InventoryInstance.verifyNumberOfItemsInHoldingByName(
          LOCATION_NAMES.MAIN_LIBRARY_UI,
          index + 1,
        );
      });

      // #17 * Select "Browse" in toggle
      // * Select "Dewey Decimal classification" browse option
      InventorySearchAndFilter.selectBrowseDeweyDecimal();
      // * Fill browse input field with "331"
      // * Click "Search" button
      InventorySearchAndFilter.browseSearch('331');
      // * A row with "Call number" value equal to "331" is highlighted (bold text)
      BrowseCallNumber.valueInResultTableIsHighlighted('331');
      // * Below highlighted row, rows with following call numbers are shown in this order:
      //   * 331.01
      //   * 331.016
      //   * 331.02
      //   * 331.041
      //   * 331.0413
      //   * 331.042
      //   * 331.1
      //   * 331.198
      //   * 331.2
      const requiredRowsOrder = [
        '331',
        '331.01',
        '331.016',
        '331.02',
        '331.041',
        '331.0413',
        '331.042',
        '331.1',
        '331.198',
        '331.2',
      ];
      BrowseCallNumber.resultRowsIsInRequiredOder(requiredRowsOrder);
    },
  );
});
