import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import SetRecordForDeletionModal from '../../../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Set record for deletion', () => {
    const testData = {
      instanceTitle:
        'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `C663348 testMarcFile${getRandomPostfix()}.mrc`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.consortiaInventoryShareLocalInstance.gui,
        ]);
        cy.resetTenant();

        cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
        cy.setTenant(Affiliations.University);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.uiInventoryViewCreateEditInstances.gui,
        ]);
        cy.resetTenant();

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C663348 Check local record deletion on Central tenant (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C663348'] },
      () => {
        InventoryInstance.shareInstance();
        InventoryInstance.waitLoading();

        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.setRecordForDeletion();
        SetRecordForDeletionModal.waitLoading();
        SetRecordForDeletionModal.verifyModalView(testData.instanceTitle);
        SetRecordForDeletionModal.clickConfirm();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
        InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
        InstanceRecordView.verifyInstanceIsSetForDeletion();

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsSetForDeletion();

        ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsSetForDeletion();
      },
    );
  });
});
