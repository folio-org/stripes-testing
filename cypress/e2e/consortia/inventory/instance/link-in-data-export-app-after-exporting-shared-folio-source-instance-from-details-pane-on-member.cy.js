import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
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

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.wait(3000);
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.inventoryAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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
        'C422081 (CONSORTIA) Verify the link in Data export app after exporting shared FOLIO Source Instance from Instance details pane on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C422081'] },
        () => {
          InventoryInstances.searchByTitle(testData.instance.instanceTitle);
          InstanceRecordView.exportInstanceMarc();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.waitLandingPageOpened();
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
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
