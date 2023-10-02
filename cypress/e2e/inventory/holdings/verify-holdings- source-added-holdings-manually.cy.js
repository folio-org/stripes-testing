import { including } from '@interactors/html';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryNewHoldings from '../../../support/fragments/inventory/inventoryNewHoldings';

const testData = {
  user: {},
  item: {
    instanceName: `Inventory Instance ${randomFourDigitNumber()}`,
    itemBarcode: randomFourDigitNumber(),
  },
  permanentLocation: 'Annex (KU/CC/DI/A)',
  calloutMessage: 'has been successfully saved.',
};

describe('Holdings', () => {
  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiInventoryViewCreateEditInstances.gui,
      Permissions.uiInventoryViewCreateEditHoldings.gui,
      Permissions.uiInventoryViewCreateEditItems.gui,
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
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C367932 Verify holdings source added holdings manually (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      InventoryInstance.searchByTitle(testData.item.instanceName);
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.item.instanceName);
      InventorySearchAndFilter.checkRowsCount(1);

      InventoryInstances.selectInstance();
      InventoryInstance.waitLoading();

      InventoryInstance.pressAddHoldingsButton();
      InventoryNewHoldings.fillRequiredFields(including(testData.permanentLocation));
      InventoryNewHoldings.checkPermanentLocation(testData.permanentLocation);

      InventoryNewHoldings.saveAndClose();
      InventoryInstance.waitLoading();
      InventoryInstance.checkCalloutMessage(including(testData.calloutMessage));
      InventoryInstance.checkSourceValue('FOLIO');
    },
  );
});
