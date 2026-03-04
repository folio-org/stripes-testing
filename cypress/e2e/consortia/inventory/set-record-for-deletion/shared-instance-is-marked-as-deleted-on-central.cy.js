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
        heldByAccordionName: 'Held by',
        instanceTitle:
          'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
      };
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        fileName: `C656323 testMarcFile${getRandomPostfix()}.mrc`,
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

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [
              CapabilitySets.uiInventoryInstanceEdit,
              CapabilitySets.uiConsortiaInventoryLocalSharingInstances,
              CapabilitySets.uiInventoryInstanceStaffSuppressedRecordsView,
            ],
          );
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [
              CapabilitySets.uiInventoryInstanceEdit,
              CapabilitySets.uiInventoryInstanceSetRecordsForDeletion,
              CapabilitySets.uiConsortiaInventoryLocalSharingInstances,
            ],
          );
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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
        'C656323 Verify that the shared instance is marked as deleted on the Central tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C656323'] },
        () => {
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
          InventoryInstance.clickShareLocalInstanceButton();
          InventoryInstance.clickShareInstance();
          InventoryInstance.verifyCalloutMessage(
            `Local instance ${testData.instanceTitle} has been successfully shared`,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
          InstanceRecordView.verifyInstanceIsSetForDeletion();
        },
      );
    });
  });
});
