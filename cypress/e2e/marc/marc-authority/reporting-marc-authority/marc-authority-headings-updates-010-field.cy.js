import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import topMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        tag010: '010',
        tag100: '100',
        tag240: '240',
        tag700: '700',
        marcValue: 'C375225 Beethoven, Ludwig van,',
        searchOption: 'Keyword',
        authorityHeading:
          'C375225 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
        authority010FieldValue: 'n83130832',
        updatedTag100Value:
          '$a C375225 Beethoven, Ludwig the Greatest, $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
        title:
          'C375225 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      };
      const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const todayWithoutPaddingZero = DateTools.clearPaddingZero(today);
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();
      const expectedJobValues = {
        status: 'Successful',
        jobType: 'MARC authority headings updates',
        description: 'List of updated MARC authority (1XX) headings',
        outputType: 'MARC authority headings updates (CSV)',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC375225.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC375225.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];
      const createdAuthorityID = [];
      const dataForC375225 = [
        {
          recordTitle: createdAuthorityID[0],
          index: 17,
          tagValue: '240',
          marcValue:
            'C375225 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
        },
        {
          recordTitle: createdAuthorityID[0],
          tagValue: '700',
          index: 49,
          marcValue:
            'C375225 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375225');

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

          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdAuthorityID[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            dataForC375225.forEach((field) => {
              QuickMarcEditor.clickLinkIconInTagField(field.index);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(testData.marcValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(field.tagValue, field.index);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
        MarcAuthority.deleteViaAPI(createdAuthorityID[1]);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C375225 "MARC authority headings updates (CSV)" report is generated for controlling record with updated heading ("$0"="010") (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375225'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.title);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);

          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();

          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            const jobID = item.response.body.name;
            const expectedJobData = [
              jobID,
              expectedJobValues.status,
              expectedJobValues.jobType,
              expectedJobValues.description,
              testData.userProperties.username,
              todayWithoutPaddingZero,
            ];
            const expectedJobDetails = {
              jobID,
              status: expectedJobValues.status,
              jobType: expectedJobValues.jobType,
              outputType: expectedJobValues.outputType,
              description: expectedJobValues.description,
              source: testData.userProperties.username,
              startDate: todayWithoutPaddingZero,
              endDate: todayWithoutPaddingZero,
            };
            MarcAuthorities.checkCalloutAfterExport(jobID);
            topMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.waitLoading();
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.verifyJobDataInResults(expectedJobData);
            ExportManagerSearchPane.verifyResultAndClick(jobID);
            ExportManagerSearchPane.verifyJobDataInDetailView(expectedJobDetails);
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
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
              testData.authorityHeading,
              'New heading',
              'C375225 Beethoven, Ludwig the Greatest, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
              'Identifier',
              testData.authority010FieldValue,
              'Original 1XX',
              '100',
              'New 1XX',
              '100',
              'Authority source file name',
              'LC Name Authority file (LCNAF)',
              'Number of bibliographic records linked',
              '1',
              'Updater',
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        },
      );
    });
  });
});
