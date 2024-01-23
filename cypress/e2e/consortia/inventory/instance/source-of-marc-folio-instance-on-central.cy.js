import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const C402762testData = {
      filePath: 'oneMarcBib.mrc',
      marcFileName: `C402762 autotestFileName${getRandomPostfix()}`,
      instanceIds: [],
      instanceSource: 'MARC',
    };
    const C402763testData = {
      instanceSource: 'FOLIO',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui])
        .then((userProperties) => {
          user = userProperties;
        })
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          DataImport.uploadFileViaApi(C402762testData.filePath, C402762testData.marcFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(C402762testData.marcFileName);
          Logs.getCreatedItemsID().then((link) => {
            C402762testData.instanceIds.push(link.split('/')[5]);
          });
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            C402763testData.instance = instanceData;
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
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(C402762testData.instanceIds[0]);
      InventoryInstance.deleteInstanceViaApi(C402763testData.instance.instanceId);
    });

    it(
      'C402762 (CONSORTIA) Verify the Source of a MARC Instance on Central tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.bySource(C402762testData.instanceSource);
        InventorySearchAndFilter.searchInstanceByTitle(C402762testData.instanceIds[0]);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.verifyInstanceSource(C402762testData.instanceSource);
        InstanceRecordView.verifyEditInstanceButtonIsEnabled();
      },
    );

    it(
      'C402763 (CONSORTIA) Verify the Source of a FOLIO Instance on Central tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.bySource(C402763testData.instanceSource);
        InventorySearchAndFilter.searchInstanceByTitle(C402763testData.instance.instanceId);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InstanceRecordView.verifyInstanceSource(C402763testData.instanceSource);
        InstanceRecordView.verifyEditInstanceButtonIsEnabled();
      },
    );
  });
});
