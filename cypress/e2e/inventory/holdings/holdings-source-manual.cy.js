import { including } from '@interactors/html';
import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  item: {
    instanceName: `Inventory Instance ${randomFourDigitNumber()}`,
    itemBarcode: randomFourDigitNumber(),
  },
  permanentLocation: 'Annex (KU/CC/DI/A)',
  calloutMessage: 'has been successfully saved.',
};

describe('inventory', () => {
  describe('Holdings', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
      ]).then((createdUserProperties) => {
        testData.user = createdUserProperties;
        testData.item.instanceId = InventoryInstances.createInstanceViaApi(
          testData.item.instanceName,
          testData.item.itemBarcode,
        );
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C367932 Verify holdings source added holdings manually (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        InventoryInstances.searchByTitle(testData.item.instanceName);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.item.instanceName);
        InventorySearchAndFilter.checkRowsCount(1);

        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(testData.item.instanceName);

        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.changePermanentLocation(testData.permanentLocation);

        InventoryNewHoldings.saveAndClose();
        InventoryInstance.checkCalloutMessage(including(testData.calloutMessage));

        InventoryInstance.openHoldings(['']);
        HoldingsRecordView.checkSource('FOLIO');
      },
    );
  });
});
