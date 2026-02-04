import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../support/constants';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Import MARC bib', () => {
      const marcFiles = [
        {
          marc: 'C369080marcBib.mrc',
          fileName: `C369080testMarcBib.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'C369080MarcAuth_1.mrc',
          fileName: `C369080testMarcAuthFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
          heading: 'C369080 Chin, Staceyann, 1972-',
        },
        {
          marc: 'C369080MarcAuth_2.mrc',
          fileName: `C369080testMarcAuthFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
          heading: 'C369080 Feminist poetry',
        },
      ];

      const testData = {};
      const exportedInstanceFileName = `C369080 exportedMarcInstanceFile${getRandomPostfix()}.mrc`;
      const updatedInstanceFileName = `C369080 updatedMarcInstanceFile${getRandomPostfix()}.mrc`;
      const markfileWithout999Field = {
        marc: updatedInstanceFileName,
        fileName: `C369080testMarcBibWithout999Field.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      before(() => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C369080');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C369080');
        DataImport.uploadFilesViaApi(marcFiles).then((ids) => Object.assign(testData, ids));
        cy.createTempUser([
          permissions.moduleDataImportEnabled.gui,
          permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          permissions.inventoryAll.gui,
          permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          testData.userProperties = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
          InventoryInstances.searchByTitle(testData.createdInstanceIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();

          InventoryInstance.verifyAndClickLinkIcon('100');
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(marcFiles[1].heading);
          InventoryInstance.clickLinkButton();
          InventoryInstance.verifyAndClickLinkIcon('650');
          MarcAuthorities.switchToSearch();
          InventoryInstance.searchResults(marcFiles[2].heading);
          InventoryInstance.clickLinkButton();
          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          cy.logout();
        });
      });

      after(() => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C369080');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C369080');
        if (testData?.userProperties?.userId) Users.deleteViaApi(testData.userProperties.userId);
        FileManager.deleteFileFromDownloadsByMask('C369080*');
        FileManager.deleteFile(`cypress/fixtures/${exportedInstanceFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${updatedInstanceFileName}`);
      });

      it(
        'C369080 Export and Import "MARC Bibliographic" record with linked fields (which have $9 with UUID) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C369080'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });

          InventoryInstances.searchByTitle(testData.createdInstanceIDs[0]);
          InventoryInstances.selectInstanceCheckboxByIndex(0);
          InventoryInstances.exportInstanceMarc();

          cy.intercept('/data-export/quick-export').as('getHrid');
          cy.wait('@getHrid', getLongDelay()).then((resp) => {
            const expectedRecordHrid = resp.response.body.jobExecutionHrId;

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            ExportFile.waitLandingPageOpened();
            ExportFile.downloadExportedMarcFileWithRecordHrid(
              expectedRecordHrid,
              exportedInstanceFileName,
            );
            FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
            ExportFile.verifyFileIncludes(
              exportedInstanceFileName,
              [...testData.createdAuthorityIDs].map((id) => `9${id}`),
            ); // 9 - subfield $9 with linked Authority ID
            ExportFile.removeMarcField({
              inputFileName: exportedInstanceFileName,
              outputFileName: updatedInstanceFileName,
              fieldTag: '999',
            });
          });
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.waitLoading();

          DataImport.uploadFilesViaApi(markfileWithout999Field).then(({ createdInstanceIDs }) => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.searchByTitle(createdInstanceIDs[0]);
            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkLinkButtonDontExist('100');
            QuickMarcEditor.checkLinkButtonDontExist('650');
          });
        },
      );
    });
  });
});
