import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../support/constants';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(10);
    const instanceTitle = `AT_C651502_FolioInstance_${randomPostfix}`;
    const itemBarcode = 'No barcode';
    const callNumberCreated = `C651502 ${randomLetters} Created`;
    const callNumberUpdated = `C651502 ${randomLetters} Updated`;
    const testData = { user: {} };
    let instanceId;

    before('Create instance, holdings, and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C651502*');
      cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
        testData.locationId = res.id;
      });
      cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
        testData.loanTypeName = res[0].name;
      });
      cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
        testData.materialTypeName = res.name;
      });
      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        testData.holdingsSourceId = folioSource.id;
      });
      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditHoldings.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProps) => {
        testData.user = userProps;
      });
    });

    beforeEach('Create instance and holdings via API, configure browse settings', () => {
      cy.getAdminToken();
      const instanceData = InventoryInstances.generateFolioInstances({
        instanceTitlePrefix: instanceTitle,
        holdingsCount: 1,
      })[0];
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: [instanceData],
        location: { id: testData.locationId },
      }).then((createdInstance) => {
        instanceId = createdInstance.instanceId;
      });
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        callNumberTypes: [],
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        callNumberTypes: [],
      });
    });

    it(
      "C651502 Create, Update, Delete Item's call number and verify browse result list (spitfire)",
      { tags: ['criticalPath', 'spitfire', 'C651502'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();

        // Add item via UI
        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(instanceTitle);
        ItemRecordNew.addMaterialType(testData.materialTypeName);
        ItemRecordNew.addPermanentLoanType(testData.loanTypeName);
        ItemRecordNew.chooseCallNumberType(CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS);
        ItemRecordNew.addCallNumber(callNumberCreated);
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.waitLoading();

        // Wait for call number to propagate to browse
        BrowseCallNumber.waitForCallNumberToAppear(callNumberCreated);

        // Browse for created call number in both options
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(callNumberCreated);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: callNumberCreated }],
        });
        // Browse in LC
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(callNumberCreated);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: callNumberCreated }],
        });

        // Click found call number, go to instance, expand holdings, click item barcode
        InventorySearchAndFilter.selectFoundItem(callNumberCreated);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings('');
        InventoryInstance.openItemByBarcode(itemBarcode);
        // Edit item via UI, update call number
        ItemRecordView.openItemEditForm(instanceTitle);
        ItemRecordNew.addCallNumber(callNumberUpdated);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Wait for update to propagate
        BrowseCallNumber.waitForCallNumberToAppear(callNumberUpdated);
        BrowseCallNumber.waitForCallNumberToAppear(callNumberCreated, false);

        // Browse for updated call number in both options, verify old not present
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(callNumberUpdated);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: callNumberUpdated }],
        });
        BrowseCallNumber.verifyCallNumbersNotFound([callNumberCreated]);

        // Browse in LC
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(callNumberUpdated);
        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: callNumberUpdated }],
        });
        BrowseCallNumber.verifyCallNumbersNotFound([callNumberCreated]);

        // Click found call number, go to instance, expand holdings, click item barcode
        InventorySearchAndFilter.selectFoundItem(callNumberUpdated);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings('');
        InventoryInstance.openItemByBarcode(itemBarcode);
        // Edit item via UI, clear call number
        ItemRecordView.openItemEditForm(instanceTitle);
        ItemRecordNew.addCallNumber('');
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Wait for delete to propagate
        BrowseCallNumber.waitForCallNumberToAppear(callNumberUpdated, false);

        // Browse for deleted call number in both options, verify not present
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        InventorySearchAndFilter.fillInBrowseSearch(callNumberUpdated);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.checkNonExactSearchResult(callNumberUpdated);
        BrowseCallNumber.verifyCallNumbersNotFound([callNumberCreated]);
        // Browse in LC
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(callNumberCreated);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.checkNonExactSearchResult(callNumberCreated);
        BrowseCallNumber.verifyCallNumbersNotFound([callNumberUpdated]);
      },
    );
  });
});
