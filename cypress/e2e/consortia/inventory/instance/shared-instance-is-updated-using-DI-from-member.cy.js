// import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
// import Users from '../../../../support/fragments/users/users';
// import TopMenu from '../../../../support/fragments/topMenu';
// import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
// import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
// import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
// import InteractorsTools from '../../../../support/utils/interactorsTools';
import Affiliations from '../../../../support/dictionary/affiliations';
// import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import ExportFile from '../../../../support/fragments/data-export/exportFile';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      exportedFileName: `C407746 exportedTestMarcFile${getRandomPostfix()}.mrc`,
    };

    before('Create test data', () => {
      cy.getCollegeAdminToken();
      cy.setTenant(Affiliations.College).then(() => {
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          cy.getConsortiaId()
            .then((consortiaId) => {
              testData.consortiaId = consortiaId;
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.shareInstanceInMemberTenantViaApi({
                sourceTenantId: Affiliations.College,
                instanceIdentifier: instanceData.instanceId,
                targetTenantId: Affiliations.Consortia,
              });
              // InventoryInstance.shareInstanceViaApi(
              //   testData.instanceId,
              //   testData.consortiaId,
              //   Affiliations.College,
              //   Affiliations.Consortia,
              // );
            });
          // cy.shareInstanceInMemberTenantViaApi(
          //   {
          //     sourceTenantId: Affiliations.College,
          //     instanceIdentifier: instanceData.instanceId,
          //     targetTenantId: Affiliations.Consortia,
          //   }
          // );
        });

        //       cy.loginAsAdmin();
        //       ConsortiumManager.switchActiveAffiliation(tenantNames.college);
        //       cy.visit(TopMenu.inventoryPath);
        //       InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        //       InventoryInstance.shareInstance();
        //       InventorySearchAndFilter.closeInstanceDetailPane();
        //       InventorySearchAndFilter.selectResultCheckboxes(1);
        //       InventorySearchAndFilter.exportInstanceAsMarc();

        //       // use cy.getToken function to get toket for current tenant
        //       cy.getCollegeAdminToken();
        //       // download exported marc file
        //       cy.visit(TopMenu.dataExportPath);
        //       cy.wait(2000);
        //       ExportFile.getExportedFileNameViaApi().then((name) => {
        //         testData.marcFile.exportedFileName = name;

        //         ExportFile.downloadExportedMarcFile(testData.marcFile.exportedFileName);
        //       });
        //       cy.resetTenant();
        //     });
      });

      //   cy.getAdminToken();
      //   cy.createTempUser([
      //     Permissions.uiInventoryViewCreateEditInstances.gui,
      //   ])
      //     .then((userProperties) => {
      //       testData.user = userProperties;
      //     })
      //     .then(() => {
      //       cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
      //       cy.setTenant(Affiliations.College);
      //       cy.assignPermissionsToExistingUser(testData.user.userId, [
      //         Permissions.settingsDataImportEnabled.gui,
      //         Permissions.moduleDataImportEnabled.gui,
      //         Permissions.inventoryAll.gui,
      //         Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      //       ]);
      //       cy.resetTenant();
      //     });
    });

    it(
      'C411726 (CONSORTIA) Verify that shared Instance is updated using Data import from member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {},
    );
  });
});
