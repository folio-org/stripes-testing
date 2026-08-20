import { Permissions } from '../../../support/dictionary';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C436847_MarcBibInstance_${getRandomPostfix()}`,
      instanceId: null,
      user: {},
    };

    const marcBibFields = [
      {
        tag: '008',
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: '245',
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
    ];

    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
        (instanceId) => {
          testData.instanceId = instanceId;

          cy.getInstanceById(instanceId).then((body) => {
            body.staffSuppress = true;
            body.discoverySuppress = true;
            cy.updateInstance(body);
          });

          InstanceRecordView.markAsDeletedViaApi(instanceId);

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
            InventoryInstances.searchByTitle(testData.instanceId);
            InventoryInstances.selectInstanceById(testData.instanceId);
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C436847 Check "Set record for deletion" option in Actions menu with Instance source MARC and marked checkboxes (promin)',
      { tags: ['extendedPath', 'promin', 'C436847'] },
      () => {
        // Step 1: mark-deleted API call was executed via API in before()
        // Step 2: Instance is already opened in detail pane
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Verify "Set record for deletion" is NOT present in Actions menu
        InstanceRecordView.validateOptionInActionsMenu(actionsMenuOptions.edit, true);
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.setRecordForDeletion,
          false,
          false,
        );
      },
    );
  });
});
