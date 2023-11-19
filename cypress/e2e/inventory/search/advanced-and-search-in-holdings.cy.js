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
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';

describe('Inventory -> Advanced search', () => {
  let user;
  const hotKeys = InventoryHotkeys.hotKeys;
  const randomCallNumber = `YCN${getRandomPostfix()}`;
  const testData = {
    advSearchOption: 'Advanced search',
    instances: [
      {
        title: `C422017_autotest_instance ${getRandomPostfix()}`,
        holdingsCallNumber: randomCallNumber,
        itemBarcode: uuid(),
      },
      {
        title: `C422017_autotest_instance ${getRandomPostfix()}`,
        holdingsCallNumber: randomCallNumber,
        itemBarcode: uuid(),
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
                permanentLocationId: testData.locationsId,
                callNumber: instance.holdingsCallNumber,
              },
            ],
            items: [
              {
                barcode: instance.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((instanceIds) => {
            testData.instances[index].id = instanceIds.instanceId;
            testData.instances[index].holdingsId = instanceIds.holdingIds[0].id;
            cy.getHoldings({
              limit: 1,
              query: `"instanceId"="${instanceIds.instanceId}"`,
            }).then((holdings) => {
              testData.instances[index].holdingsHRID = holdings[0].hrid;
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

  after('Deleting test data', () => {
    cy.getAdminToken().then(() => {
      testData.instances.forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C422017 Search Holdings using advanced search with "AND" operator (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventorySearchAndFilter.switchToHoldings();
      InventoryInstances.clickAdvSearchButton();
      cy.wrap([0, 1, 2, 3, 4, 5]).each((rowIndex) => {
        InventoryInstances.checkAdvSearchHoldingsModalFields(rowIndex);
      });
      InventoryInstances.clickCloseBtnInAdvSearchModal();
      InventoryInstances.clickAdvSearchButton();
      InventoryInstances.fillAdvSearchRow(
        0,
        testData.instances[0].holdingsCallNumber,
        'Exact phrase',
        'Call number, normalized',
      );
      InventoryInstances.checkAdvSearchModalValues(
        0,
        testData.instances[0].holdingsCallNumber,
        'Exact phrase',
        'Call number, normalized',
      );
      InventoryInstances.fillAdvSearchRow(
        1,
        testData.instances[1].holdingsHRID,
        'Contains any',
        'Holdings HRID',
        'AND',
      );
      InventoryInstances.checkAdvSearchModalValues(
        1,
        testData.instances[1].holdingsHRID,
        'Contains any',
        'Holdings HRID',
        'AND',
      );
      InventoryInstances.clickSearchBtnInAdvSearchModal();
      InventoryInstances.checkAdvSearchModalAbsence();
      InventoryInstances.verifySelectedSearchOption(testData.advSearchOption);
      InventorySearchAndFilter.verifySearchResult(testData.instances[1].title);

      InventoryInstances.clickAdvSearchButton();
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      InventoryInstances.checkAdvSearchModalAbsence();
    },
  );
});
