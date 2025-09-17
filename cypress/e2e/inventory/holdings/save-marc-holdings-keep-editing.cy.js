import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Holdings', () => {
    const testData = {
      marcBibTitle: `AT_C490889_MarcBibInstance_${getRandomPostfix()}`,
      numberOfItems: '5',
    };

    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
          (location) => {
            // create MARC instance with Holding and without Items
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              testData.instanceId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  instanceData.id,
                  instanceData.hrid,
                  location.code,
                );
              });
            });
          },
        );
      }).then(() => {
        cy.createTempUser([Permissions.uiInventoryViewCreateEditHoldings.gui]).then(
          (userProperties) => {
            user = userProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
    });

    it(
      'C490889 Saving record using "Save & keep editing" button when editing a "Holdings" record with source "MARC" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C490889'] },
      () => {
        // Step 1: Find MARC Instance with MARC holdings
        // Filter Holdings by "Source" facet and search
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.searchBySourceHolding(INSTANCE_SOURCE_NAMES.MARC);
        InventorySearchAndFilter.verifyResultListExists();
        InventoryInstances.searchByTitle(testData.marcBibTitle);

        // Step 2: Click on "Title" value in second pane
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.verifyInstanceTitle(testData.marcBibTitle);

        // Step 3: Click on "View holdings" button next to Holding name
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkSource(INSTANCE_SOURCE_NAMES.MARC);

        // Step 4: Click on "Actions" → Select "Edit"
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.checkButtonsEnabled({
          saveAndClose: false,
          saveAndKeep: false,
          cancel: true,
        });

        // Step 5: Update any editable field (add "Number of items" value)
        HoldingsRecordEdit.fillHoldingFields({
          numberOfItems: testData.numberOfItems,
        });
        HoldingsRecordEdit.verifyNumberOfItems(testData.numberOfItems);
        HoldingsRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveAndKeep: true,
          cancel: true,
        });

        // Step 7: Click on the "Save & keep editing" button
        HoldingsRecordEdit.saveAndKeepEditing({ holdingSaved: true });
        HoldingsRecordEdit.waitLoading();
        HoldingsRecordEdit.verifyNumberOfItems(testData.numberOfItems);
        InventoryInstance.verifyLastUpdatedDate();

        // Step 8: Click on "Record last updated" accordion to verify user info
        InventoryInstance.verifyLastUpdatedUser(`${user.lastName}, ${user.firstName}`);

        // Step 9: Close the "Edit holdings" window
        HoldingsRecordEdit.closeWithoutSave();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkNumberOfItems(testData.numberOfItems);
      },
    );
  });
});
