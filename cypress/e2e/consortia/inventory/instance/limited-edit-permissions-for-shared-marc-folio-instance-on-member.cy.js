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
    const C402335testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C402335 autotestFileName ${getRandomPostfix()}`,
      instanceIds: [],
      instanceSource: 'MARC',
    };
    const C402376testData = {
      instanceSource: 'FOLIO',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.uploadFileViaApi(C402335testData.filePath, C402335testData.marcFileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(C402335testData.marcFileName);
      Logs.getCreatedItemsID().then((link) => {
        C402335testData.instanceIds.push(link.split('/')[5]);
      });
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        C402376testData.instance = instanceData;
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          C402335testData.user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, C402335testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(C402335testData.user.userId, [
            Permissions.uiInventoryViewCreateEditInstances.gui,
          ]);
        });
    });

    beforeEach('Login', () => {
      cy.login(C402335testData.user.username, C402335testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      ConsortiumManager.switchActiveAffiliation(tenantNames.college);
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(C402335testData.instanceIds[0]);
      InventoryInstance.deleteInstanceViaApi(C402376testData.instance.instanceId);
      Users.deleteViaApi(C402335testData.user.userId);
    });

    it(
      'C402335 (CONSORTIA) Verify limited Edit permissions for Shared MARC instance on Member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.bySource(C402335testData.instanceSource);
        InventorySearchAndFilter.byShared('Yes');
        InventorySearchAndFilter.searchInstanceByTitle(C402335testData.instanceIds[0]);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.verifyInstanceSource(C402335testData.instanceSource);
        InstanceRecordView.verifyEditInstanceButtonAbsent();
      },
    );

    it(
      'C402376 (CONSORTIA) Verify limited Edit permissions for Shared FOLIO instance on Member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.bySource(C402376testData.instanceSource);
        InventorySearchAndFilter.byShared('Yes');
        InventorySearchAndFilter.searchInstanceByTitle(C402376testData.instance.instanceId);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.verifyInstanceSource(C402376testData.instanceSource);
        InstanceRecordView.verifyEditInstanceButtonAbsent();
      },
    );
  });
});
