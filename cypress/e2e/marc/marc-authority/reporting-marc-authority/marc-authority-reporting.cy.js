import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        searchOption: 'Keyword',
        title:
          'C375231Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC375231_1.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcBibFileForC375231_2.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcAuthFileForC375231_1.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          propertyName: 'relatedAuthorityInfo',
        },
      ];

      const createdAuthorityID = [];

      before('Creating user and uploading files', () => {
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
        });

        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.entries.forEach((record) => {
              createdAuthorityID.push(record[marcFile.propertyName].idList[0]);
            });
          });
        });
      });

      beforeEach('Login to the application', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID[1]);
        MarcAuthority.deleteViaAPI(createdAuthorityID[2]);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C375231 "MARC authority headings updates (CSV)" report includes correct number of linked "MARC bib" records (spitfire)',
        { tags: ['smoke', 'spitfire'] },
        () => {
          const dataForC375231 = [
            {
              recordTitle: createdAuthorityID[0],
              tagValue: '240',
              marcValue:
                'C375231Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
            },
            {
              recordTitle: createdAuthorityID[1],
              tagValue: '700',
              marcValue:
                'C375231Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
            },
          ];

          dataForC375231.forEach((value) => {
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(value.recordTitle);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(value.tagValue);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(value.marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.pressSaveAndClose();
            InventoryInstance.waitLoading();
          });

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.searchOption, testData.title);
          MarcAuthorities.selectTitle(testData.title);
          MarcAuthority.edit();
          // Waiter needed for the whole page to be loaded.
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(
            '100',
            '$a C375231Beethoven, Ludwig Jr, $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
          );
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.saveAndCheck();

          const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
          const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();
          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);
            cy.visit(TopMenu.exportManagerPath);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            // Waiter needed for the job file to be downloaded.
            cy.wait(1000);
          });

          const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
          const fileNameMask = `${downloadedReportDate}*`;
          FileManager.verifyFile(
            MarcAuthorities.verifyMARCAuthorityFileName,
            fileNameMask,
            MarcAuthorities.verifyContentOfExportFile,
            [
              'Last updated',
              `${downloadedReportDate}`,
              'Original heading',
              '"C375231Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major"',
              'New heading',
              '"C375231Beethoven, Ludwig Jr, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major"',
              'Identifier',
              'n83130007',
              'Original 1XX',
              '100',
              'New 1XX',
              '100',
              'Authority source file name',
              'LC Name Authority file (LCNAF)',
              'Number of bibliographic records linked',
              '2',
              'Updater',
              `"${testData.userProperties.username}, testPermFirst"`,
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        },
      );
    });
  });
});
