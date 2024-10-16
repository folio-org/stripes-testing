import uuid from 'uuid';
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
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_RESOURCE_TYPE_IDS } from '../../../support/constants';

const testData = {
  user: {},
  instanceId: uuid(),
  instanceTitle: `Inventory Instance ${getRandomPostfix()}`,
  permanentLocation: 'Annex (KU/CC/DI/A)',
  calloutMessage: 'has been successfully saved.',
};

describe('Inventory', () => {
  describe('Holdings', () => {
    before('Create test data', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditHoldings.gui,
      ]).then((createdUserProperties) => {
        testData.user = createdUserProperties;
        cy.createInstance({
          instance: {
            instanceId: testData.instanceId,
            instanceTypeId: INSTANCE_RESOURCE_TYPE_IDS.TEXT,
            title: testData.instanceTitle,
          },
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.getHoldings({
        limit: 1,
        query: `"instanceId"="${testData.instanceId}"`,
      }).then((holdings) => {
        cy.deleteHoldingRecordViaApi(holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C367932 Verify holdings source added holdings manually (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C367932', 'eurekaPhase1'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventorySearchAndFilter.checkRowsCount(1);

        InventoryInstances.selectInstance();
        InventoryInstance.verifyInstanceTitle(testData.instanceTitle);

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
