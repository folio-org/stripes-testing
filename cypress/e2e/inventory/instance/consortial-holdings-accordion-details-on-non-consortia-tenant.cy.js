import { LOCATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      permanentLocationUI: LOCATION_NAMES.ANNEX_UI,
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
          cy.getLocations({ query: `name="${testData.permanentLocationUI}"` }).then((locations) => {
            testData.locationsId = locations.id;
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
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [],
          }).then((specialInstanceIds) => {
            testData.testInstanceIds = specialInstanceIds;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      cy.deleteHoldingRecordViaApi(testData.testInstanceIds.holdings[0].id);
      InventoryInstance.deleteInstanceViaApi(testData.testInstanceIds.instanceId);
    });

    it(
      'C411621 (NON-CONSORTIA) Verify the Consortial holdings accordion details on Non-consortia tenant (folijet)',
      { tags: ['extendedPath', 'folijet', 'C411621'] },
      () => {
        InventoryInstances.searchByTitle(testData.testInstanceIds.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyConsortiaHoldingsAccordionAbsent();
      },
    );
  });
});
