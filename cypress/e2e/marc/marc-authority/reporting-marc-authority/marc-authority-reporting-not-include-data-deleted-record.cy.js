import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
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
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

const testData = {
  marcValue: 'C375230 Beethoven, Ludwig van,',
  tag100: '100',
  tag240: '240',
  marcValue2: 'C375230 Kerouac, Jack',
  searchOption: 'Keyword',
  authority001FieldValue: 'n831300073752301',
  authorityHeading1:
    'C375230 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
  authorityHeading2: 'C375230 Kerouac, Jack, 1922-1969',
  updatedTag100Value1:
    '$a C375230 Beethoven, Ludwig the Greatest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
  updatedTag100Value2: '$a C375230 Kerouac, Jackson, $d 1922-1969',
  title: 'Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
};

const marcFiles = [
  {
    marc: 'marcBibFileForC375230.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  },
  {
    marc: 'marcAuthFileForC375230_1.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create SRS MARC Authority',
  },
  {
    marc: 'marcAuthFileForC375230_2.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create SRS MARC Authority',
  },
];

const expectedJobValues = {
  status: 'Successful',
  jobType: 'MARC authority headings updates',
  description: 'List of updated MARC authority (1XX) headings',
  outputType: 'MARC authority headings updates (CSV)',
};
const createdAuthorityID = [];

const dataForC375230 = [
  {
    recordTitle: createdAuthorityID[0],
    index: 18,
    tagValue: '240',
    marcValue:
      'C375230 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
  },
  {
    recordTitle: createdAuthorityID[1],
    tagValue: '100',
    index: 17,
    marcValue: 'C375230 Kerouac, Jack',
  },
];
const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const todayWithoutPaddingZero = DateTools.clearPaddingZero(today);
const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

describe('marc', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      before('Creating user and uploading files', () => {
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

          marcFiles.forEach((marcFile) => {
            cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
              () => {
                DataImport.verifyUploadState();
                DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFile.jobProfileToRun);
                JobProfiles.runImportFile();
                JobProfiles.waitFileIsImported(marcFile.fileName);
                Logs.checkStatusOfJobProfile('Completed');
                Logs.openFileDetails(marcFile.fileName);
                Logs.getCreatedItemsID().then((link) => {
                  createdAuthorityID.push(link.split('/')[5]);
                });
              },
            );
          });

          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstances.searchByTitle(createdAuthorityID[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            dataForC375230.forEach((field) => {
              QuickMarcEditor.clickLinkIconInTagField(field.index);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(field.marcValue);
              MarcAuthoritiesSearch.selectAuthorityByIndex(0);
              InventoryInstance.clickLinkButton();
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
        MarcAuthority.deleteViaAPI(createdAuthorityID[1]);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C375230 "MARC authority headings updates (CSV)" report does NOT include data on deleted "MARC authority" record (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire'] },
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
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.delete();
          QuickMarcEditor.confirmDeletingRecord();

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
            cy.visit(TopMenu.exportManagerPath);
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
