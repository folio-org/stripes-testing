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

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C478253_FolioInstance_${randomPostfix}`;
    const testData = {
      user: {},
      instance: {},
      holdings: {},
      item: {},
    };
    const callNumberData = {
      callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
      callNumberPrefix: 'AT',
      callNumber: 'QS 47 .GA8 E253',
      callNumberSuffix: `${randomFourDigitNumber()}`,
      copyNumber: 'c.2',
      volume: 'v. 1',
      enumeration: 'no. 2',
      chronology: '1922',
    };

    const fullCallNumber = `${callNumberData.callNumber} ${callNumberData.callNumberSuffix}`;
    const callNumberQueryValue = `${callNumberData.callNumberPrefix} ${callNumberData.callNumber} ${callNumberData.callNumberSuffix}`;
    const expectedEffectiveCallNumber = `${callNumberQueryValue} ${callNumberData.volume} ${callNumberData.enumeration} ${callNumberData.chronology} ${callNumberData.copyNumber}`;
    const querySearchOption = 'Query search';
    let instanceData;

    before('Create data and user', () => {
      cy.getAdminToken();
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
      'C478253 Verify "fullCallNumber" generation when all "Call number" fields are filled in "Item" record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C478253'] },
      () => {
        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(instanceData.id);
        InventoryInstances.selectInstanceById(instanceData.id);

        // Click add item button
        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(instanceTitle);
        // Fill required fields
        ItemRecordNew.addMaterialType(testData.materialTypeName);
        ItemRecordNew.addPermanentLoanType(testData.loanTypeName);
        // Fill call number and enumeration fields
        ItemRecordNew.fillCallNumberValues({
          callNumber: callNumberData.callNumber,
          callNumberType: callNumberData.callNumberType,
          callNumberPrefix: callNumberData.callNumberPrefix,
          callNumberSuffix: callNumberData.callNumberSuffix,
          volume: callNumberData.volume,
          enumeration: callNumberData.enumeration,
          chronology: callNumberData.chronology,
          copyNumber: callNumberData.copyNumber,
        });
        // Save item
        ItemRecordNew.saveAndClose({ itemSaved: true });
        // Verify detail view
        InventoryInstance.verifyInstanceTitle(instanceTitle);
        // Switch to Browse
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        BrowseCallNumber.waitForCallNumberToAppear(fullCallNumber);
        InventorySearchAndFilter.fillInBrowseSearch(fullCallNumber);
        // Intercept browse call
        cy.intercept('GET', '/browse/call-numbers/all/instances*').as('browseCallNumbers');
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
        // Open item detail view and verify effective call number
        InventoryInstance.openHoldings('');
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.verifyEffectiveCallNumber(expectedEffectiveCallNumber);
      },
    );
  });
});
