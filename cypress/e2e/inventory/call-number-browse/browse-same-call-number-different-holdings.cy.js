import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const instanceTitle1 = `AT_C692245_FolioInstance_${randomPostfix}_1`;
    const instanceTitle2 = `AT_C692245_FolioInstance_${randomPostfix}_2`;
    const testData = { user: {} };
    const callNumber1 = `PS${randomDigits}.A45C6 ${randomDigits}5`;
    const callNumber2 = `PS${randomDigits}.A45C6 ${randomDigits}6`;
    let locationAId;
    let locationBId;

    before('Create data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C692245*');
      cy.then(() => {
        // Get two different locations
        cy.getLocations({ limit: 2, query: '(isActive=true and name<>"AT_*")' }).then(() => {
          locationAId = Cypress.env('locations')[0].id;
          locationBId = Cypress.env('locations')[1].id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.holdingsSourceId = folioSource.id;
        });
      }).then(() => {
        // Instance 1: 2 holdings (different locations), each with 1 item
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: instanceTitle1,
            instanceTypeId: testData.instanceTypeId,
          },
        }).then((createdInstance) => {
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: createdInstance.instanceId,
            permanentLocationId: locationAId,
            sourceId: testData.holdingsSourceId,
          }).then((holding) => {
            InventoryItems.createItemViaApi({
              holdingsRecordId: holding.id,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              itemLevelCallNumber: callNumber1,
            });
          });
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: createdInstance.instanceId,
            permanentLocationId: locationBId,
            sourceId: testData.holdingsSourceId,
          }).then((holding) => {
            InventoryItems.createItemViaApi({
              holdingsRecordId: holding.id,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              itemLevelCallNumber: callNumber1,
            });
          });
        });

        // Instance 2: 2 holdings (different locations), each with 1 item
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            title: instanceTitle2,
            instanceTypeId: testData.instanceTypeId,
          },
        }).then((createdInstance) => {
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: createdInstance.instanceId,
            permanentLocationId: locationAId,
            sourceId: testData.holdingsSourceId,
          }).then((holding) => {
            InventoryItems.createItemViaApi({
              holdingsRecordId: holding.id,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              itemLevelCallNumber: callNumber2,
            });
          });
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: createdInstance.instanceId,
            permanentLocationId: locationBId,
            sourceId: testData.holdingsSourceId,
          }).then((holding) => {
            InventoryItems.createItemViaApi({
              holdingsRecordId: holding.id,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeId },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              itemLevelCallNumber: callNumber2,
            });
          });
        });

        // Create a user with inventory permissions
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
          testData.user = userProps;
        });
      });
    });

    beforeEach('Configure call number browse settings', () => {
      cy.getAdminToken();
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle1);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle2);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
    });

    it(
      'C692245 Browse for same call number which exists in two holdings (with different locations) of the same Instance (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C692245'] },
      () => {
        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        // Browse for callNumber1
        BrowseCallNumber.waitForCallNumberToAppear(callNumber1);
        InventorySearchAndFilter.fillInBrowseSearch(callNumber1);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: callNumber1 }],
        });
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumber1, '1');
        BrowseCallNumber.checkValuePresentForRow(callNumber1, 1, instanceTitle1);
        // Browse for callNumber2
        BrowseCallNumber.waitForCallNumberToAppear(callNumber2);
        InventorySearchAndFilter.fillInBrowseSearch(callNumber2);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: callNumber2 }],
        });
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumber2, '1');
        BrowseCallNumber.checkValuePresentForRow(callNumber2, 1, instanceTitle2);
      },
    );
  });
});
