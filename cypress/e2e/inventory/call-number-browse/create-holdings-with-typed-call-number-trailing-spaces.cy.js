import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { CALL_NUMBER_TYPE_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {
      user: {},
      callNumber: 'ND543 R80 A2 5438  ', // Note: call number with trailing spaces
      callNumberWithoutSpaces: 'ND543 R80 A2 5438',
      callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
    };
    const instanceTitle = `AT_C543802_FolioInstance_${getRandomPostfix()}`;
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          // Clean up any existing test data
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C543802');
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
            testData.locationString = `${res.name} (${res.code})`;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            testData.loanTypeName = loanTypes[0].name;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.materialTypeName = res.name;
          });
        })
        .then(() => {
          // Create instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instanceTitle,
            },
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;
          });
        });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProps) => {
        testData.user = userProps;
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C543802');
    });

    it(
      'C543802 Create FOLIO Holdings record with typed call number and trailing spaces (LC case) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C543802'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);

        // Navigate to instance
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();

        // Step 1: Click on the "Add holdings" button
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.waitLoading();

        // Step 2: Select any available Permanent location in "Location"
        HoldingsRecordEdit.changePermanentLocation(testData.locationString);

        // Step 3: Fill in following fields of "Holdings call number" section in "Location" accordion:
        // - Select "Library of Congress classification" in "Call number type" dropdown
        // - Input following call number value (with trailing spaces) in "Call number" field
        HoldingsRecordEdit.chooseCallNumberType(testData.callNumberType);
        HoldingsRecordEdit.fillCallNumber(testData.callNumber);

        // Step 4: Click on the "Save & close" button
        HoldingsRecordEdit.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 5: Click "Add item" button next to added holding in detail view pane
        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(instanceTitle);

        // Step 6: Select any value in "Material type" dropdown and "Permanent loan type" dropdown
        ItemRecordNew.addMaterialType(testData.materialTypeName);
        ItemRecordNew.addPermanentLoanType(testData.loanTypeName);

        // Step 7: Click on the "Save & close" button
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 8: Click on the "View holdings" button
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 9: Verify that "Call number" field doesn't have trailing spaces after a value
        HoldingsRecordView.checkCallNumber(testData.callNumberWithoutSpaces);

        // Step 10: Close the detail view of "Holdings" record
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Wait for call number to propagate to browse
        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberWithoutSpaces);

        // Step 11: Run browse using created call number without trailing spaces and using "Call numbers (all)" browse option
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(testData.callNumberWithoutSpaces);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberWithoutSpaces);

        // Step 12: Run browse using created call number with trailing spaces and using "Call numbers (all)" browse option
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(testData.callNumber);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberWithoutSpaces);

        // Step 13: Run browse using created call number without trailing spaces and using "Library of Congress classification" browse option
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(testData.callNumberWithoutSpaces);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberWithoutSpaces);

        // Step 14: Run browse using created call number with trailing spaces and using "Library of Congress classification" browse option
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(testData.callNumber);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberWithoutSpaces);
      },
    );
  });
});
