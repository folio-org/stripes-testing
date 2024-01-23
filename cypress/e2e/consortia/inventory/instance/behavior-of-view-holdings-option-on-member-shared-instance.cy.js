import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
// import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
// import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C409516 autotestFileName ${getRandomPostfix()}`,
      instanceIds: [],
      instanceSource: 'MARC',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]);
        cy.loginAsAdmin({
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        DataImport.uploadFileViaApi(testData.filePath, testData.marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.instanceIds.push(link.split('/')[5]);
        });
        cy.getConsortiaId()
          .then((consortiaId) => {
            testData.consortiaId = consortiaId;
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            InventoryInstance.shareInstanceViaApi(
              testData.testData.instanceIds[0],
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
          });
        cy.resetTenant();

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    // after('Delete test data', () => {
    //   cy.resetTenant();
    //   cy.getAdminToken();
    //   InventoryHoldings.deleteHoldingRecordViaApi(testData.instance.holdingId);
    //   InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    //   Locations.deleteViaApi(testData.location);
    //   ServicePoints.deleteViaApi(testData.servicePoint.id);
    //   Users.deleteViaApi(user.userId);
    // });

    it(
      'C409516 (CONSORTIA) Verify the behavior of "View holdings" option on member tenant shared Instance (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        // InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        // InventoryInstances.selectInstance();
        // InventoryInstance.expandConsortiaHoldings();
        // InventoryInstance.expandMemberHoldings(tenantNames.college);
        // InventoryInstance.openHoldingView();
        // ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        // HoldingsRecordView.checkActionsMenuOptions();
      },
    );
  });
});
