import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const C402760testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C402760 autotestFileName ${getRandomPostfix()}`,
      instanceIds: [],
      instanceSource: 'MARC',
    };
    const C402761testData = {
      instanceSource: 'FOLIO',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.uiInventoryViewCreateEditInstances.gui,
          ]);
          cy.loginAsAdmin({
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          DataImport.uploadFileViaApi(C402760testData.filePath, C402760testData.marcFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(C402760testData.marcFileName);
          Logs.getCreatedItemsID().then((link) => {
            C402760testData.instanceIds.push(link.split('/')[5]);
          });
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            C402761testData.instance = instanceData;
          });
          cy.resetTenant();
        });
    });

    beforeEach('Login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      ConsortiumManager.switchActiveAffiliation(tenantNames.college);
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(C402760testData.instanceIds[0]);
    });

    it(
      'C402760 (CONSORTIA) Verify the Source of a MARC, Local Instance on Member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.bySource(C402760testData.instanceSource);
        InventorySearchAndFilter.byShared('No');
        InventorySearchAndFilter.searchInstanceByTitle(C402760testData.instanceIds[0]);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.verifyInstanceSource(C402760testData.instanceSource);
        InstanceRecordView.verifyEditInstanceButtonIsEnabled();
      },
    );

    it(
      'C402761 (CONSORTIA) Verify the Source of a FOLIO, local Instance on Member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.bySource(C402761testData.instanceSource);
        InventorySearchAndFilter.byShared('No');
        InventorySearchAndFilter.searchInstanceByTitle(C402761testData.instance.instanceId);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.verifyInstanceSource(C402761testData.instanceSource);
        InstanceRecordView.verifyEditInstanceButtonIsEnabled();
      },
    );
  });
});
