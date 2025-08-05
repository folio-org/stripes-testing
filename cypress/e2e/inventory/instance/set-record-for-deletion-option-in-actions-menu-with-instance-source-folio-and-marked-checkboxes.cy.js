import { Permissions } from '../../../support/dictionary';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;

        cy.getInstanceById(testData.instance.instanceId).then((body) => {
          body.staffSuppress = true;
          body.discoverySuppress = true;
          cy.updateInstance(body);
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
        Permissions.enableStaffSuppressFacet.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.selectYesfilterStaffSuppress();
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });
    });

    it(
      'C436846 Check "Set record for deletion" option in Actions menu with Instance source FOLIO and marked checkboxes (folijet)',
      { tags: ['extendedPath', 'folijet', 'C436846'] },
      () => {
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.setRecordForDeletion,
          true,
        );
      },
    );
  });
});
