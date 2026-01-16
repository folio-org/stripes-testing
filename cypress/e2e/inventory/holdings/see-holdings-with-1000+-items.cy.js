import uuid from 'uuid';
import { LOCATION_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Holdings', () => {
    let user;
    const quantityOfItems = 1005;
    const quantityOfItemsOnPage = 200;
    const testData = {
      instanceTitle: `AT_C350639_Instance_${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
            testData.loanTypeName = res[0].name;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
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
        .then((specialInstanceIds) => {
          testData.testInstanceIds = specialInstanceIds;

          Array.from({ length: quantityOfItems }, () => {
            return ItemRecordNew.createViaApi({
              holdingsId: specialInstanceIds.holdingIds[0].id,
              itemBarcode: uuid(),
              materialTypeId: testData.materialTypeId,
              permanentLoanTypeId: testData.loanTypeId,
            });
          });
        });

      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"title"=="${testData.instanceTitle}"`,
        }).then((instance) => {
          instance.items.forEach((el) => cy.deleteItemViaApi(el.id));
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C350639 Verify the ability to see holdings with 1000+ items: CASE 1 (folijet)',
      { tags: ['smoke', 'folijet', 'C350639', 'shiftLeft'] },
      () => {
        InventorySearchAndFilter.searchByParameter(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          testData.instanceTitle,
        );
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyItemsCount(quantityOfItems, LOCATION_NAMES.MAIN_LIBRARY_UI);
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
        InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(
          `${LOCATION_NAMES.MAIN_LIBRARY_UI} >`,
          quantityOfItemsOnPage,
        );
        InstanceRecordView.clickNextPaginationButton();
        InstanceRecordView.verifyQuantityOfItemsRelatedtoHoldings(
          `${LOCATION_NAMES.MAIN_LIBRARY_UI} >`,
          quantityOfItemsOnPage,
        );
      },
    );
  });
});
