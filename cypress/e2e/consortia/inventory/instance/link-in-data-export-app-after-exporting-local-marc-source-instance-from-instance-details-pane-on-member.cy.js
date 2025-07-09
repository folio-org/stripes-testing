import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      marcFile: {
        marc: 'oneMarcBib.mrc',
        fileName: `C422080 autotestMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      },
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });
      cy.resetTenant();

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
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
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C422080 (CONSORTIA) Verify the link in Data export app after exporting local MARC Source Instance from Instance details pane on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C422080'] },
      () => {
        InventoryInstances.searchByTitle(testData.instanceId);
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
