import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        createdRecordIDs: [],
        marcValue: 'C380532 Beethoven, Ludwig van,',
        tag100: '100',
        tag240: '240',
        marcValue2: 'C380532 Kerouac, Jack',
        searchOption: 'Keyword',
        authority001FieldValue: 'n831308323805321',
        authorityHeading1:
          'C380532 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
        authorityHeading2: 'C380532 Kerouac, Jack, 1922-1969',
        updatedTag100Value1:
          '$a C380532 Beethoven, Ludwig the Greatest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
        updatedTag100Value2: '$a C380532 Kerouac, Jackson, $d 1922-1969',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC380532.mrc',
          fileName: `C380532 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC380532_1.mrc',
          fileName: `C380532 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileForC380532_2.mrc',
          fileName: `C380532 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      const expectedJobValues = {
        status: 'Successful',
        jobType: 'MARC authority headings updates',
        description: 'List of updated MARC authority (1XX) headings',
        outputType: 'MARC authority headings updates (CSV)',
      };

      const dataForC380532 = [
        {
          index: 17,
          tagValue: '240',
          marcValue: 'C380532 Beethoven, Ludwig van,',
        },
        {
          tagValue: '100',
          index: 16,
          marcValue: 'C380532 Kerouac, Jack, 1922-1969',
        },
      ];

      const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const todayWithoutPaddingZero = DateTools.clearPaddingZero(today);
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

      before('Creating user and uploading files', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;

            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: 'keyword="C380532"',
            }).then((records) => {
              records.forEach((record) => {
                if (record.authRefType === 'Authorized') {
                  MarcAuthority.deleteViaAPI(record.id);
                }
              });
            });
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  testData.createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
              cy.wait(2000);
            });
          })
          .then(() => {
            cy.loginAsAdmin();
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            dataForC380532.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.index);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linking.marcValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tagValue, linking.index);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              Permissions.exportManagerAll.gui,
            ]).then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
      });
      it(
        'C380532 Data for "MARC authority headings updates (CSV)" report does NOT include data on deleted "MARC authority" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380532'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading1);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value1);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);

          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading2);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value2);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);
          MarcAuthority.delete();
          MarcAuthoritiesDelete.checkDeleteModal();
          QuickMarcEditor.confirmDeletingRecord();
          MarcAuthoritiesDelete.checkEmptySearchResults(testData.authorityHeading2);

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
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.waitLoading();
            ExportManagerSearchPane.searchByAuthorityControl();
            cy.wait(2000);
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
              testData.authorityHeading1,
              'New heading',
              testData.authorityHeading1,
              'Identifier',
              testData.authority001FieldValue,
            ],
          );
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        },
      );
    });
  });
});
