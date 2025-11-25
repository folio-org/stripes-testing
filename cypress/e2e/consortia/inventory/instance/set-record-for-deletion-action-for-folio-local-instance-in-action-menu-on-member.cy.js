import { APPLICATION_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import SetRecordForDeletionModal from '../../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {};

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.uiInventorySetRecordsForDeletion.gui,
            Permissions.inventoryAll.gui,
          ]);

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        });
      });

      it(
        'C446003 (CONSORTIA) Check "Set record for deletion" action for FOLIO Local Instance in Actions menu on Member tenant (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C446003'] },
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
