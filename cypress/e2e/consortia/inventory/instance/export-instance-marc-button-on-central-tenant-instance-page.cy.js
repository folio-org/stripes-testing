import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instanceId = instanceData.instanceId;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
      cy.resetTenant();
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C409470 (CONSORTIA) Verify the "Export instance (MARC)" button on Central tenant Instance page (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C409470'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InstanceRecordView.exportInstanceMarc();
        FileManager.verifyFile(
          InventoryActions.verifyInstancesMARCFileName,
          'QuickInstanceExport*',
          InventoryActions.verifyInstancesMARC,
          [[testData.instanceId]],
        );
      },
    );
  });
});
