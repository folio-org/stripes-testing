import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import SetRecordForDeletionModal from '../../../../support/fragments/inventory/modals/setRecordForDeletionModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        marcFileName: `C446004 marcFileName${getRandomPostfix()}.mrc`,
      };
      const testData = {
        instanceTitle:
          'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
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
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        });
      });

      it(
        'C446004 (CONSORTIA) Check "Set record for deletion" action for MARC Local Instance in Actions menu on Member tenant (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C446004'] },
        () => {
          InstanceRecordView.waitLoading();
          InstanceRecordView.clickActionsButton();
          InstanceRecordView.setRecordForDeletion();
          SetRecordForDeletionModal.waitLoading();
          SetRecordForDeletionModal.verifyModalView(testData.instanceTitle);
          SetRecordForDeletionModal.clickConfirm();
          SetRecordForDeletionModal.isNotDisplayed();
          InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
          InstanceRecordView.waitLoading();
          InteractorsTools.checkCalloutMessage(
            `${testData.instanceTitle} has been set for deletion`,
          );
        },
      );
    });
  });
});
