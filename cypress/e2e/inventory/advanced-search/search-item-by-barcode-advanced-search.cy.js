import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

describe.skip('Inventory', () => {
  describe('Advanced search', () => {
    const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const randomPostfix = getRandomPostfix();
    const testData = {
      userProperties: {},
      instances: [
        { title: `AT_C729567_FolioInstance_${randomPostfix}_1`, barcode: `729567${randomDigits}` },
        {
          title: `AT_C729567_FolioInstance_${randomPostfix}_2`,
          barcode: `${randomDigits}729567(987)`,
        },
      ],
    };

    let instanceTypeId;
    let holdingsTypeId;
    let locationId;
    let loanTypeId;
    let materialTypeId;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C729567');
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialTypeId = res.id;
          });
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            holdingsTypeId = res[0].id;
          });
        })
        .then(() => {
          testData.instances.forEach((instance, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instance.title,
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId: locationId,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                  barcode: instance.barcode,
                },
              ],
            }).then((instanceIds) => {
              testData.instances[index].id = instanceIds.instanceId;
            });
          });
        });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.userProperties = userProperties;

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.instances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });
    });

    // Trillium+ only
    it(
      'C729567 Advanced search | Search for Item by barcode field using "Barcode" search option (spitfire)',
      { tags: [] },
      () => {
        // Switch to Item tab
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();

        // Step 1: Click on "Advanced search" button
        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.checkAdvSearchItemsModalFields(0);

        // Step 2: Configure advanced search query
        InventoryInstances.fillAdvSearchRow(
          0,
          testData.instances[0].barcode,
          'Exact phrase',
          'Barcode',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          0,
          testData.instances[0].barcode,
          'Exact phrase',
          'Barcode',
        );
        // Fill second row with OR operator
        InventoryInstances.fillAdvSearchRow(
          1,
          testData.instances[1].barcode,
          'Contains all',
          'Barcode',
          'OR',
        );
        InventoryInstances.checkAdvSearchModalItemValues(
          1,
          testData.instances[1].barcode,
          'Contains all',
          'Barcode',
          'OR',
        );
        // Step 3: Click on "Search" button in modal
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        // Expected: Instance records, which searched items are associated with, will be displayed in the result list
        InventoryInstances.verifySelectedSearchOption('Advanced search');
        InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);
        InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);
        // Verify we get results from both barcode searches
        InventorySearchAndFilter.checkRowsCount(2);
      },
    );
  });
});
