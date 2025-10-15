import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import SetRecordForDeletionModal from '../../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Set record for deletion', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle: "101 things I wish I'd known when I started using hypnosis / Dabney Ewin.",
      };
      const marcFile = {
        marc: 'marcBibFileForC663346.mrc',
        fileName: `C663346 testMarcFile${getRandomPostfix()}.mrc`,
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

        cy.createTempUser().then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [
              CapabilitySets.uiInventoryInstanceEdit,
              CapabilitySets.uiInventoryInstanceStaffSuppressedRecordsView,
              CapabilitySets.uiConsortiaInventoryLocalSharingInstances,
              CapabilitySets.uiInventoryInstanceSetRecordsForDeletion,
            ],
          );

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [
              CapabilitySets.uiInventoryInstanceEdit,
              CapabilitySets.uiInventoryInstanceStaffSuppressedRecordsView,
              CapabilitySets.uiConsortiaInventoryLocalSharingInstances,
              CapabilitySets.uiInventoryInstanceSetRecordsForDeletion,
            ],
          );
          cy.resetTenant();

          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventoryInstanceEdit],
          );
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
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
        'C663346 Check shared record deletion on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C663346'] },
        () => {
          InventoryInstance.waitLoading();
          InventoryInstance.shareInstance();
          InventoryInstance.waitLoading();

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
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

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceIsSetForDeletion();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceIsSetForDeletion();
        },
      );
    });
  });
});
