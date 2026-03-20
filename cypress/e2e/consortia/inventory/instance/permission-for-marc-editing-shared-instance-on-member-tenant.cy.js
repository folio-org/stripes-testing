import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryEditMarcRecord from '../../../../support/fragments/inventory/inventoryEditMarcRecord';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      const marcFile = {
        marc: 'oneMarcBib.mrc',
        marcFileName: `C466115 marcFileName${getRandomPostfix()}.mrc`,
      };
      const testData = {
        instanceStatusTerm: 'Cataloged',
        contentOf245Field:
          '$a Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
      };

      before('Create test data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.marcFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;
        });

        cy.createTempUser([
          Permissions.uiInventoryViewCreateEditInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.uiInventoryViewCreateEditInstances.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]);

          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C466115 (CONSORTIA) Verify the permission for MARC editing shared instance on Member tenant (consortia) (folijet)',
        { tags: ['extendedPath', 'folijet', 'C466115'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.chooseInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordEdit.saveAndClose();
          InteractorsTools.checkCalloutMessage(
            'This shared instance has been saved centrally, and updates to associated member library records are in process. Changes in this copy of the instance may not appear immediately.',
          );
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.verifyInstanceStatusTerm(testData.instanceStatusTerm);
          InstanceRecordView.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          InventoryEditMarcRecord.editField(
            testData.contentOf245Field,
            `${testData.contentOf245Field} UPDATED`,
          );
          InventoryEditMarcRecord.saveAndClose();
          InteractorsTools.checkCalloutMessage(
            'This record has successfully saved and is in process. Changes may not appear immediately.',
          );
          InstanceRecordView.verifyInstanceRecordViewOpened();
        },
      );
    });
  });
});
