import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import {
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomDigits = randomFourDigitNumber();
    const testData = {
      user: {},
      callNumber: `ND543 R80 A3 ${randomDigits}  `, // Note: call number with trailing spaces
      callNumberWithoutSpaces: `ND543 R80 A3 ${randomDigits}`,
      callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
    };
    const instanceTitle = `AT_C543803_FolioInstance_${getRandomPostfix()}`;
    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          // Clean up any existing test data
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C543803');
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
            testData.loanTypeId = loanTypes[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.materialTypeId = res.id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
        })
        .then(() => {
          // Create instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              },
            ],
            items: [
              {
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((createdInstanceData) => {
            instanceId = createdInstanceData.instanceId;
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.uiInventoryViewCreateEditHoldings.gui,
            Permissions.uiInventoryViewCreateEditInstances.gui,
            Permissions.uiInventoryViewCreateEditItems.gui,
          ]).then((userProps) => {
            testData.user = userProps;
          });
        });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C543803');
    });

    it(
      'C543803 Edit FOLIO Holdings record with typed call number and trailing spaces (LC case) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C543803'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        // Navigate to instance
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();

        // Open holdings view first
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 1: Click on the "Actions" button >> Select "Edit" option
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Step 2: Fill in following fields of "Holdings call number" section in "Location" accordion:
        // - Select "Library of Congress classification" in "Call number type" dropdown
        // - Input following call number value (with trailing spaces) in "Call number" field
        HoldingsRecordEdit.chooseCallNumberType(testData.callNumberType);
        HoldingsRecordEdit.fillCallNumber(testData.callNumber);

        // Step 3: Click on the "Save & close" button
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.waitLoading();

        // Verify that "Call number" field doesn't have trailing spaces after a value
        HoldingsRecordView.checkCallNumber(testData.callNumberWithoutSpaces);

        // Step 4: Close the detail view of "Holdings" record
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Wait for call number to propagate to browse
        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberWithoutSpaces);

        // Step 5: Run browse using created call number without trailing spaces and using "Call numbers (all)" browse option
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(testData.callNumberWithoutSpaces);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberWithoutSpaces);

        // Step 6: Run browse using created call number with trailing spaces and using "Call numbers (all)" browse option
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(testData.callNumber);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberWithoutSpaces);

        // Step 7: Run browse using created call number without trailing spaces and using "Library of Congress classification" browse option
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(testData.callNumberWithoutSpaces);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumberWithoutSpaces);

        // Step 8: Run browse using created call number with trailing spaces and using "Library of Congress classification" browse option
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
