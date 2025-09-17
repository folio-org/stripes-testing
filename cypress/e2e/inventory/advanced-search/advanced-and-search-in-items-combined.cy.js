import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const barcodeBase = `MYCODE02070506${randomFourDigitNumber()}`;
    const callNumberBase = `ADVSRCH00900${randomFourDigitNumber()}`;
    const admNoteBase = `009 Advanced note${randomFourDigitNumber()}`;
    const randomAdmNote = `${admNoteBase}${getRandomPostfix()}`;
    const testData = {
      advSearchOption: 'Advanced search',
      instances: [
        {
          title: `C422018_autotest_instance_1 ${getRandomPostfix()}`,
          itemBarcode: `11${barcodeBase}${getRandomPostfix()}`,
          itemAdmNote: '',
          itemCallNumber: '',
        },
        {
          title: `C422018_autotest_instance_2 ${getRandomPostfix()}`,
          itemBarcode: `22${barcodeBase}${getRandomPostfix()}`,
          itemCallNumber: `${callNumberBase}${getRandomPostfix()}`,
          itemAdmNote: randomAdmNote,
        },
        {
          title: `C422018_autotest_instance_3 ${getRandomPostfix()}`,
          itemBarcode: `33${barcodeBase}${getRandomPostfix()}`,
          itemAdmNote: `${admNoteBase}${getRandomPostfix()}`,
          itemCallNumber: '',
        },
        {
          title: `C422018_autotest_instance_4 ${getRandomPostfix()}`,
          itemBarcode: `Barcode${getRandomPostfix()}`,
          itemAdmNote: '',
          itemCallNumber: '',
        },
      ],
    };

    before('Create users, data', () => {
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
        })
        .then(() => {
          testData.instances.forEach((instance) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationsId,
                },
              ],
              items: [
                {
                  barcode: instance.itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                  itemLevelCallNumber: instance.itemCallNumber,
                  administrativeNotes: [instance.itemAdmNote],
                },
              ],
            });
          });

          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
            InventoryItems.getItemViaApi({
              query: `barcode="${testData.instances[3].itemBarcode}"`,
            }).then((items) => {
              testData.itemHRID = items[0].hrid;
            });
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instance.itemBarcode);
        });
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C422018 Search Items using advanced search with a combination of operators (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C422018', 'eurekaPhase1'] },
      () => {
        InventorySearchAndFilter.switchToItem();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          admNoteBase,
          'Starts with',
          'Item administrative notes',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          0,
          admNoteBase,
          'Starts with',
          'Item administrative notes',
        );
        InventoryInstances.fillAdvSearchRow(1, barcodeBase, 'Contains any', 'Barcode', 'AND');
        InventoryInstances.checkAdvSearchModalItemValues(
          1,
          barcodeBase,
          'Contains any',
          'Barcode',
          'AND',
        );
        InventoryInstances.fillAdvSearchRow(
          2,
          testData.itemHRID,
          'Exact phrase',
          'Item HRID',
          'OR',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          2,
          testData.itemHRID,
          'Exact phrase',
          'Item HRID',
          'OR',
        );
        InventoryInstances.fillAdvSearchRow(
          3,
          callNumberBase,
          'Starts with',
          'Effective call number (item), normalized',
          'NOT',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          3,
          callNumberBase,
          'Starts with',
          'Effective call number (item), normalized',
          'NOT',
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
        InventorySearchAndFilter.verifySearchResult(testData.instances[2].title);
        InventorySearchAndFilter.verifySearchResult(testData.instances[3].title);
        InventorySearchAndFilter.checkRowsCount(2);
      },
    );
  });
});
