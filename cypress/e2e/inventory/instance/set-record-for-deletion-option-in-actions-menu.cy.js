import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SetRecordForDeletionModal from '../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });
    });

    it(
      'C436834 Check "Set record for deletion" option in Actions menu (folijet)',
      { tags: ['extendedPath', 'folijet', 'C436834'] },
      () => {
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.validateOptionInActionsMenu('Set record for deletion');
        InstanceRecordView.setRecordForDeletion();
        SetRecordForDeletionModal.waitLoading();
        SetRecordForDeletionModal.verifyModalView(testData.instance.instanceTitle);
        SetRecordForDeletionModal.clickCancel();
        SetRecordForDeletionModal.isNotDisplayed();
        InstanceRecordView.verifyInstancePaneExists();
      },
    );
  });
});
