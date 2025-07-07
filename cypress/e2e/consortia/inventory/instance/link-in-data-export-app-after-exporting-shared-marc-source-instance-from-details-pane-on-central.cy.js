import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      marcFile: {
        marc: 'oneMarcBib.mrc',
        fileName: `C422086 autotestMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
    };

    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
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
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C422086 (CONSORTIA) Verify the link in Data export app after exporting shared MARC Source Instance from Instance details pane on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C422086'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
        InstanceRecordView.exportInstanceMarc();
        cy.visit(TopMenu.dataExportPath);
        cy.wait(1000);
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
