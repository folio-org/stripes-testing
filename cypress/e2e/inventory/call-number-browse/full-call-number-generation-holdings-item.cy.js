import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../support/constants';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C478256_FolioInstance_${randomPostfix}`;
    const testData = {
      user: {},
    };
    const holdingsCallNumberData = {
      callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
      callNumberPrefix: 'AT',
      callNumber: 'PN478 .A256',
      callNumberSuffix: `${randomFourDigitNumber()}`,
      copyNumber: 'c. 3',
    };
    const itemEnumerationData = {
      volume: 'v. 1',
      enumeration: 'no. 2',
      chronology: '1955',
    };
    const fullCallNumber = `${holdingsCallNumberData.callNumber} ${holdingsCallNumberData.callNumberSuffix}`;
    const callNumberQueryValue = `${holdingsCallNumberData.callNumberPrefix} ${holdingsCallNumberData.callNumber} ${holdingsCallNumberData.callNumberSuffix}`;
    const expectedEffectiveCallNumber = `${callNumberQueryValue} ${itemEnumerationData.volume} ${itemEnumerationData.enumeration} ${itemEnumerationData.chronology}`;
    const querySearchOption = 'Query search';
    let instanceData;

    before('Create data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C478256*');
      cy.then(() => {
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeName = res[0].name;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeName = res.name;
        });
      }).then(() => {
        instanceData = InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: instanceTitle,
          holdingsCount: 1,
        })[0];
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: [instanceData],
          location: { id: testData.locationId },
        }).then((createdInstance) => {
          instanceData.id = createdInstance.instanceId;
        });
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
          testData.user = userProps;
        });
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
    });

    it(
      'C478256 Verify "fullCallNumber" generation when all "Call number" fields are filled in "Holdings" record and "Enumeration" fields are filled in "Item" record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C478256'] },
      () => {
        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(instanceData.id);
        InventoryInstances.selectInstanceById(instanceData.id);

        // Open Holdings detail view
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        // Edit Holdings
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.fillCallNumberValues({
          callNumber: holdingsCallNumberData.callNumber,
          callNumberType: holdingsCallNumberData.callNumberType,
          callNumberPrefix: holdingsCallNumberData.callNumberPrefix,
          callNumberSuffix: holdingsCallNumberData.callNumberSuffix,
          copyNumber: holdingsCallNumberData.copyNumber,
        });
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.waitLoading();
        // Close Holdings detail view
        HoldingsRecordView.close();
        // Back to Instance detail view
        InventoryInstance.verifyInstanceTitle(instanceTitle);
        // Add Item to Holdings
        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(instanceTitle);
        ItemRecordNew.addMaterialType(testData.materialTypeName);
        ItemRecordNew.addPermanentLoanType(testData.loanTypeName);
        // Fill only enumeration fields
        ItemRecordNew.fillCallNumberValues({
          volume: itemEnumerationData.volume,
          enumeration: itemEnumerationData.enumeration,
          chronology: itemEnumerationData.chronology,
        });
        ItemRecordNew.saveAndClose({ itemSaved: true });
        // Switch to Browse
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        BrowseCallNumber.waitForCallNumberToAppear(fullCallNumber);
        InventorySearchAndFilter.fillInBrowseSearch(fullCallNumber);
        // Intercept browse call
        cy.intercept('GET', '/browse/call-numbers/lc/instances*').as('browseCallNumbers');
        InventorySearchAndFilter.clickSearch();
        cy.wait('@browseCallNumbers').then(({ response }) => {
          const found = response.body.items.find((item) => item.fullCallNumber === fullCallNumber);
          // eslint-disable-next-line no-unused-expressions
          expect(found).to.exist;
        });
        // Click on the call number in the result
        InventorySearchAndFilter.selectFoundItemFromBrowseResultList(fullCallNumber);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption,
          `itemFullCallNumbers="${callNumberQueryValue}"`,
        );
        InventoryInstances.selectInstanceById(instanceData.id);
        // Open item detail view and verify effective call number
        InventoryInstance.openHoldings('');
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.verifyEffectiveCallNumber(expectedEffectiveCallNumber);
      },
    );
  });
});
