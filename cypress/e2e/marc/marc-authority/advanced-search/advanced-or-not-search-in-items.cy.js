import uuid from 'uuid';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      let user;
      const randomCallNumber = `112CN${getRandomPostfix()}`;
      const testData = {
        advSearchOption: 'Advanced search',
        instances: [
          {
            title: `C422023_first_autotest_instance ${getRandomPostfix()}`,
            itemBarcode: uuid(),
          },
          {
            title: `C422023_second_autotest_instance ${getRandomPostfix()}`,
            itemCallNumber: randomCallNumber,
            itemBarcode: uuid(),
          },
          {
            title: `C422023_third_autotest_instance ${getRandomPostfix()}`,
            itemCallNumber: randomCallNumber,
            itemBarcode: uuid(),
          },
        ],
        defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
      };

      before('Creating data', () => {
        cy.getAdminToken()
          .then(() => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('C422023*');
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
                },
              ],
            }).then((instanceIds) => {
              testData.instances[0].ids = instanceIds;
              testData.instances[0].ItemUuid = testData.instances[0].ids.holdingIds[0].itemIds[0];
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
                  callNumber: testData.instances[1].itemCallNumber,
                },
              ],
              items: [
                {
                  barcode: testData.instances[1].itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((instanceIds) => {
              testData.instances[1].ids = instanceIds;
            });
            // create the third instance and holdings and item
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instances[2].title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationsId,
                  callNumber: testData.instances[2].itemCallNumber,
                },
              ],
              items: [
                {
                  barcode: testData.instances[2].itemBarcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            }).then((instanceIds) => {
              testData.instances[2].ids = instanceIds;
            });
          });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
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
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
            testData.instances[2].itemBarcode,
          );
          Users.deleteViaApi(user.userId);
        });
      });

      it(
        'C400623 Search Items using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C400623'] },
        () => {
          InventorySearchAndFilter.switchToItem();
          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.fillAdvSearchRow(
            0,
            testData.instances[0].ItemUuid,
            'Exact phrase',
            'Item UUID',
          );
          InventoryInstances.checkAdvSearchModalItemValues(
            0,
            testData.instances[0].ItemUuid,
            'Exact phrase',
            'Item UUID',
          );
          InventoryInstances.fillAdvSearchRow(
            1,
            testData.instances[1].itemBarcode,
            'Contains all',
            'Barcode',
            'OR',
          );
          InventoryInstances.checkAdvSearchModalItemValues(
            1,
            testData.instances[1].itemBarcode,
            'Contains all',
            'Barcode',
            'OR',
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          InventoryInstances.checkAdvSearchModalAbsence();
          InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
          InventorySearchAndFilter.verifySearchResult(testData.instances[0].title);
          InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);

          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.checkAdvSearchModalItemValues(
            0,
            testData.instances[0].ItemUuid,
            'Exact phrase',
            'Item UUID',
          );
          InventoryInstances.checkAdvSearchModalItemValues(
            1,
            testData.instances[1].itemBarcode,
            'Contains all',
            'Barcode',
            'OR',
          );
          InventoryInstances.clickCloseBtnInAdvSearchModal();
          InventoryInstances.resetAllFilters();
          InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
          InventorySearchAndFilter.verifySearchFieldIsEmpty();

          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.fillAdvSearchRow(
            0,
            testData.instances[1].itemCallNumber,
            'Exact phrase',
            'Effective call number (item), normalized',
          );
          InventoryInstances.checkAdvSearchModalItemValues(
            0,
            testData.instances[1].itemCallNumber,
            'Exact phrase',
            'Effective call number (item), normalized',
          );
          InventoryInstances.fillAdvSearchRow(
            1,
            testData.instances[2].title,
            'Starts with',
            'Keyword (title, contributor, identifier, HRID, UUID)',
            'NOT',
          );
          InventoryInstances.checkAdvSearchModalItemValues(
            1,
            testData.instances[2].title,
            'Starts with',
            'Keyword (title, contributor, identifier, HRID, UUID)',
            'NOT',
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          InventoryInstances.checkAdvSearchModalAbsence();
          InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
          InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);
        },
      );
    });
  });
});
