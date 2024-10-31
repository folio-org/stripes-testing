import { Permissions } from '../../../support/dictionary';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { LOCATION_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceTitle: `C716 Inventory Instance ${getRandomPostfix()}`,
  locationName: LOCATION_NAMES.MAIN_LIBRARY_UI,
};

describe('Inventory', () => {
  describe('Holdings', () => {
    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${testData.locationName}"` }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
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
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        testData.user = createdUserProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.testInstanceIds.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C716 Delete a holding without dependencies (folijet)',
      { tags: ['extendedPath', 'folijet', 'C716'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.delete();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyHoldingsAbsent(testData.locationName);
      },
    );
  });
});
