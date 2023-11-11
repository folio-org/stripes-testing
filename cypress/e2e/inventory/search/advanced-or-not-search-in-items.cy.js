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
  const randomCallNumber = `112CN${getRandomPostfix()}`;
  const testData = {
    instances: [
      {
        title: `C422023_autotest_instance ${getRandomPostfix()}`,
        itemBarcode: uuid(),
      },
      {
        title: `C422023_autotest_instance ${getRandomPostfix()}`,
        itemCallNumber: randomCallNumber,
        itemBarcode: uuid(),
      },
      {
        title: `C422023_autotest_instance ${getRandomPostfix()}`,
        itemCallNumber: randomCallNumber,
        itemBarcode: uuid(),
      },
    ],
    defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
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
      })
      .then(() => {
        testData.instances.forEach((instance, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instance.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: instance.defaultLocation.id,
                callNumber: instance.callNumber,
              },
            ],
            items: [
              {
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((instanceIds) => {
            testData.instances[index].id = instanceIds.instanceId;
            testData.instances[index].itemId = instanceIds.itemIds[0].id;
            cy.getHoldings({
              limit: 1,
              query: `"instanceId"="${instanceIds.instanceId}"`,
            }).then((items) => {
              testData.instances[index].uuid = items[0].uuid;
            });
          });
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
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        testData.instances[2].itemBarcode,
      );
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C400623 Search Items using advanced search with "OR", "NOT" operators (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToItem();
      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.fillAdvSearchRow(
        0,
        testData.instances[0].uuid,
        'Exact phrase',
        'Item UUID',
      );
      InventoryInstances.checkAdvSearchModalValues(
        0,
        testData.instances[0].uuid,
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
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instances[0].itemNote,
        'Contains all',
        'Barcode',
        'OR',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult([
        testData.instances[0].title,
        testData.instances[1].title,
      ]);

      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.checkAdvSearchModalValues(
        0,
        testData.instances[0].uuid,
        'Exact phrase',
        'Item UUID',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instances[0].itemNote,
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
      InventoryInstances.checkAdvSearchModalValues(
        0,
        testData.instances[1].itemCallNumber,
        'Exact phrase',
        'Effective call number (item), normalized',
      );
      InventoryInstances.fillAdvSearchRow(
        1,
        testData.instances[1].itemBarcode,
        'Starts with',
        'Keyword (title, contributor, identifier, HRID, UUID)',
        'NOT',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instances[1].itemBarcode,
        'Starts with',
        'Keyword (title, contributor, identifier, HRID, UUID)',
        'NOT',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult([testData.instances[1].title]);
    },
  );
});
