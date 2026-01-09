import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomCallNumber = `001MYCN2225858${getRandomPostfix()}`;
    const testData = {
      advSearchOption: 'Advanced search',
      instances: [
        {
          title: `C400622_autotest_instance ${getRandomPostfix()}`,
          itemBarcode: uuid(),
          itemCallNumber: randomCallNumber,
          itemNote: 'Case 7 note 007',
        },
        {
          title: `C400622_autotest_instance ${getRandomPostfix()}`,
          itemBarcode: uuid(),
          itemCallNumber: randomCallNumber,
        },
      ],
    };

    before('Creating data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locations) => {
              testData.locationsId = locations.id;
            },
          );
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
          InventoryInstances.getItemNoteTypes({ limit: 1 }).then((res) => {
            testData.noteTypeId = res[0].id;
          });
        })
        .then(() => {
          // create the first instance and holdings and item
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[0].title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: testData.instances[0].itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
                itemLevelCallNumber: testData.instances[0].itemCallNumber,
                notes: [
                  {
                    itemNoteTypeId: testData.noteTypeId,
                    note: testData.instances[0].itemNote,
                  },
                ],
              },
            ],
          });
          // create the second instance and holdings and item
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instances[1].title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: testData.instances[1].itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
                itemLevelCallNumber: testData.instances[1].itemCallNumber,
              },
            ],
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.instances[0].itemBarcode,
        );
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
          testData.instances[1].itemBarcode,
        );
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C736741 Search Items using advanced search with "AND" operator (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C736741', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventoryInstances.clickAdvSearchButton();
        cy.wrap([0, 1, 2, 3, 4, 5]).each((rowIndex) => {
          InventoryInstances.checkAdvSearchItemsModalFields(rowIndex);
        });
        InventoryInstances.clickCloseBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          '001MYCN2225858',
          'Contains all',
          'Effective call number (item), normalized',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          0,
          '001MYCN2225858',
          'Contains all',
          'Effective call number (item), normalized',
        );
        InventoryInstances.fillAdvSearchRow(
          1,
          '7 note 007',
          'Contains all',
          'Item notes (all)',
          'AND',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          1,
          '7 note 007',
          'Contains all',
          'Item notes (all)',
          'AND',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchModalItemValues(
          0,
          '001MYCN2225858',
          'Contains all',
          'Effective call number (item), normalized',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          1,
          '7 note 007',
          'Contains all',
          'Item notes (all)',
          'AND',
        );
        InventoryInstances.closeAdvancedSearchModal();
      },
    );
  });
});
