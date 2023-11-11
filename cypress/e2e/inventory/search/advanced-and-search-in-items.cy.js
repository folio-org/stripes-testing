import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { LOCATION_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory -> Advanced search', () => {
  let user;
  const testData = {
    instances: [
      {
        title: `C400622_autotest_instance ${getRandomPostfix()}`,
        itemBarcode: uuid(),
        itemCallNumber: `CNY${getRandomPostfix()}`,
        itemNote: 'Case 7 note 007',
      },
      {
        title: `C400622_autotest_instance ${getRandomPostfix()}`,
        itemBarcode: uuid(),
        itemCallNumber: `CNY${getRandomPostfix()}`,
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
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((locations) => {
          testData.locationsId = locations.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
        InventoryInstances.getItemNoteTypes({ limit: 1 }).then((noteTypes) => {
          testData.noteTypeId = noteTypes[0].id;
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
              barcode: testData[0].instances.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
              itemLevelCallNumber: testData[0].instances.itemCallNumber,
              notes: [
                {
                  itemNoteTypeId: testData.noteTypeId,
                  note: testData[0].instances.itemNote,
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
              barcode: testData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
              itemLevelCallNumber: testData[1].instances.itemCallNumber,
            },
          ],
        });
      });

    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
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
    'C400622 Search Items using advanced search with "AND" operator (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToItem();
      InventoryInstances.clickAdvSearchButton();
      cy.wrap([0, 1, 2, 3, 4, 5]).each((rowIndex) => {
        InventoryInstances.checkAdvSearchItemsModalFields(rowIndex);
      });
      InventoryInstances.clickCancelBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();

      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.fillAdvSearchRow(
        0,
        testData.instances[0].itemCallNumber,
        'Contains all',
        'Effective call number (item)',
      );
      InventoryInstances.checkAdvSearchModalValues(
        0,
        testData.instances[0].itemCallNumber,
        'Contains all',
        'Effective call number (item)',
      );
      InventoryInstances.fillAdvSearchRow(
        1,
        testData.instances[0].itemNote,
        'Contains all',
        'Item notes (all)',
        'AND',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instances[0].itemNote,
        'Contains all',
        'Item notes (all)',
        'AND',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult([testData.instances[1].title]);
    },
  );
});
