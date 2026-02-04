import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const { user, memberTenant } = parseSanityParameters();
      const testData = {
        searchOption: 'Keyword',
        title:
          'C375231Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC375231_1.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcBibFileForC375231_2.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC375231_1.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityID = [];

      before('Setup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375231');
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityID.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
        cy.allure().logCommandSteps();
      });

      after('Cleanup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password);
        if (createdAuthorityID[0]) {
          InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
        }
        if (createdAuthorityID[1]) {
          InventoryInstance.deleteInstanceViaApi(createdAuthorityID[1]);
        }
        if (createdAuthorityID[2]) {
          MarcAuthority.deleteViaAPI(createdAuthorityID[2], true);
        }
      });

      it(
        'C375231 "MARC authority headings updates (CSV)" report includes correct number of linked "MARC bib" records (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C375231'] },
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
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.searchByTitle(value.recordTitle);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(value.tagValue);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(value.marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.pressSaveAndClose();
          });

          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.searchBy(testData.searchOption, testData.title);
          MarcAuthorities.selectTitle(testData.title);
          MarcAuthority.edit();
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
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
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
              `${user.username}`,
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        },
      );
    });
  });
});
