import { HOLDINGS_TYPE_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Holdings', () => {
    const testData = {
      instanceTitle: `AT_C399072_Instance_${getRandomPostfix()}`,
      originalHoldingsType: HOLDINGS_TYPE_NAMES.PHYSICAL,
      updatedHoldingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: `name="${testData.originalHoldingsType}"` }).then(
            (res) => {
              testData.holdingTypeId = res[0].id;
            },
          );
          cy.getLocations({ limit: 1, query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (res) => {
              testData.locationId = res.id;
            },
          );
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
          }).then((instanceIds) => {
            testData.instanceId = instanceIds.instanceId;
            testData.holdingId = instanceIds.holdingIds[0].id;
          });
        });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditHoldings.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C399072 Saving record using "Save & keep editing" button when duplicating a "Holdings" record (folijet)',
      { tags: ['extendedPath', 'folijet', 'C399072'] },
      () => {
        // Step 1: Find Instance record and click Search
        InventoryInstances.searchByTitle(testData.instanceId);

        // Step 2: Click on "Title" value in second pane
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();

        // Step 3: Click on "View holdings" button next to Holding name
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 4: Click on "Actions" → Select "Duplicate"
        HoldingsRecordView.duplicate();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.verifyHoldingsTypeSelected(testData.originalHoldingsType);
        HoldingsRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveAndKeep: true,
          cancel: true,
        });

        // Step 5: Update value in any field (change "Holdings type" value)
        HoldingsRecordEdit.fillHoldingFields({
          holdingType: testData.updatedHoldingsType,
        });
        HoldingsRecordEdit.verifyHoldingsTypeSelected(testData.updatedHoldingsType);

        // Step 6: Click on the "Save & keep editing" button
        HoldingsRecordEdit.saveAndKeepEditing({ holdingSaved: true });
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.verifyHoldingsTypeSelected(testData.updatedHoldingsType);
        InventoryInstance.verifyLastUpdatedDate();

        // Step 7: Click on "Record last updated" accordion to verify user info
        InventoryInstance.verifyLastUpdatedUser(
          `${testData.user.lastName}, ${testData.user.firstName}`,
        );

        // Step 8: Close the "Edit holdings" window
        HoldingsRecordEdit.closeWithoutSave();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkHoldingsType(testData.updatedHoldingsType);
      },
    );
  });
});
