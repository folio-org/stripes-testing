import { matching } from '@interactors/html';
import { LOAN_TYPE_NAMES, LOCATION_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import InteractorsTools from '../../../support/utils/interactorsTools';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import { ItemRecordEdit } from '../../../support/fragments/inventory';

describe('inventory', () => {
  describe('Item', () => {
    const testData = {
      user: {},
      instanceData: {
        instanceTitle: `Instance ${getRandomPostfix()}`,
      },
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
      calloutMessage: '^The item - HRID.* has been successfully saved.$',
      statisticalCode: 'Book, print (books)',
    };

    before('create test data and login', () => {
      cy.createTempUser([Permissions.inventoryAll.gui])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
            testData.locationId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              },
            ],
            items: [],
          });
        })
        .then((data) => {
          testData.instanceData.instanceId = data.instanceId;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.instanceData.instanceId,
        );
      });
    });

    it(
      'C400654 Check the new formatting of Statistical codes field on Item create/edit screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'eurekaPhase1'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceData.instanceTitle);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        InventoryInstance.addItem();
        ItemRecordNew.waitLoading(testData.instanceData.instanceTitle);

        ItemRecordNew.clickStatisticalCodeButton();

        ItemRecordNew.openStatisticalCodeDropdown();
        ItemRecordNew.verifyStatisticalCodeDropdown();

        ItemRecordNew.filterStatisticalCodeByName('ARL');
        ItemRecordNew.verifyStatisticalCodeListOptionsFilteredBy('ARL');

        ItemRecordNew.chooseStatisticalCode(testData.statisticalCode);
        ItemRecordNew.checkErrorMessageForStatisticalCode(false);

        ItemRecordNew.addMaterialType(testData.materialType);
        ItemRecordNew.addPermanentLoanType(testData.permanentLoanType);

        ItemRecordNew.save();
        InventoryInstance.waitLoading();
        InteractorsTools.checkCalloutMessage(matching(new RegExp(testData.calloutMessage)));

        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
        InventoryInstance.openItemByStatus('Available');
        InventoryItems.edit();
        ItemRecordEdit.waitLoading(testData.instanceData.instanceTitle);

        ItemRecordNew.openStatisticalCodeDropdown();
        ItemRecordNew.verifyStatisticalCodeDropdown();

        ItemRecordNew.filterStatisticalCodeByName('ARL');
        ItemRecordNew.verifyStatisticalCodeListOptionsFilteredBy('ARL');

        ItemRecordNew.chooseStatisticalCode(testData.statisticalCode);
        ItemRecordNew.checkErrorMessageForStatisticalCode(false);
      },
    );
  });
});
