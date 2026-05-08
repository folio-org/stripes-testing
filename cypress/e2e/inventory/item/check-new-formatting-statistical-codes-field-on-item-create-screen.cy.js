import { matching } from '@interactors/html';
import {
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { ItemRecordEdit } from '../../../support/fragments/inventory';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const testData = {
      user: {},
      instanceData: {
        instanceTitle: `AT_C400654_Instance_${getRandomPostfix()}`,
      },
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
      calloutMessage: '^The item - HRID.* has been successfully saved.$',
      statisticalCode: 'Book, print (books)',
    };

    before('Create test data and login', () => {
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

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.instanceData.instanceId,
        );
      });
    });

    it(
      'C400654 Check the new formatting of Statistical codes field on Item create/edit screen (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C400654'] },
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

        ItemRecordNew.openStatisticalCodeDropdown();
        ItemRecordNew.chooseStatisticalCode(testData.statisticalCode);
        ItemRecordNew.checkErrorMessageForStatisticalCode(false);

        ItemRecordNew.addMaterialType(testData.materialType);
        ItemRecordNew.addPermanentLoanType(testData.permanentLoanType);

        ItemRecordNew.save();
        InventoryInstance.waitLoading();
        InteractorsTools.checkCalloutMessage(matching(new RegExp(testData.calloutMessage)));

        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
        InventoryInstance.openItemByStatus(ITEM_STATUS_NAMES.AVAILABLE);
        InventoryItems.edit();
        ItemRecordEdit.waitLoading(testData.instanceData.instanceTitle);

        ItemRecordNew.openStatisticalCodeDropdown();
        ItemRecordNew.verifyStatisticalCodeDropdown();

        ItemRecordNew.filterStatisticalCodeByName('ARL');
        ItemRecordNew.verifyStatisticalCodeListOptionsFilteredBy('ARL');
        ItemRecordNew.openStatisticalCodeDropdown();
        ItemRecordNew.chooseStatisticalCode(testData.statisticalCode);
        ItemRecordNew.checkErrorMessageForStatisticalCode(false);
      },
    );
  });
});
