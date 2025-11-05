import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.dataExportViewAddUpdateProfiles.gui,
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
        FileManager.deleteFileFromDownloadsByMask(testData.fileName);
        FileManager.deleteFile(`cypress/fixtures/${testData.fileName}`);
        FileManager.deleteFileFromDownloadsByMask('*.csv');
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });

      it(
        'C422085 (CONSORTIA) Verify the link in Data export app after exporting shared FOLIO Source Instance from Instance details pane on Central tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C422085'] },
        () => {
          InventoryInstances.searchByTitle(testData.instance.instanceTitle);
          InstanceRecordView.exportInstanceMarc();

          cy.visit(TopMenu.dataExportPath);
          ExportFile.waitLandingPageOpened();
          ExportFile.getExportedFileNameViaApi().then((name) => {
            testData.fileName = name;
            ExportFile.downloadExportedMarcFile(name);
            // Need to wait,while file to be downloaded
            cy.wait(2000);
            FileManager.findDownloadedFilesByMask(`*${name}`).then((files) => expect(files.length).eq(1));
          });
        },
      );
    });
  });
});
