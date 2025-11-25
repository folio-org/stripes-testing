import { Permissions } from '../../../../support/dictionary';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import SetRecordForDeletionModal from '../../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {};

      before('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([
          Permissions.uiInventorySetRecordsForDeletion.gui,
          Permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
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
        'C445999 (CONSORTIA) Check "Set record for deletion" action for FOLIO Shared Instance in Actions menu on Central tenant (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C445999'] },
        () => {
          InstanceRecordView.waitLoading();
          InstanceRecordView.clickActionsButton();
          InstanceRecordView.setRecordForDeletion();
          SetRecordForDeletionModal.waitLoading();
          SetRecordForDeletionModal.verifyModalView(testData.instance.instanceTitle);
          SetRecordForDeletionModal.clickConfirm();
          SetRecordForDeletionModal.isNotDisplayed();
          InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
          InstanceRecordView.waitLoading();
          InteractorsTools.checkCalloutMessage(
            `${testData.instance.instanceTitle} has been set for deletion`,
          );
        },
      );
    });
  });
});
