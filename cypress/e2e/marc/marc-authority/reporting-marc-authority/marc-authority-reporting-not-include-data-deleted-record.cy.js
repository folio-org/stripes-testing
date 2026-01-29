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
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';

const testData = {
  createdAuthorityID: [],
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
  updatedTitle:
    'C375230 Beethoven, Ludwig the Greatest 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
};

const marcFiles = [
  {
    marc: 'marcBibFileForC375230.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numOfRecords: 1,
    propertyName: 'instance',
  },
  {
    marc: 'marcAuthFileForC375230_1.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    numOfRecords: 1,
    propertyName: 'authority',
  },
  {
    marc: 'marcAuthFileForC375230_2.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
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

const dataForC375230 = [
  {
    index: 17,
    tagValue: '240',
    marcValue: 'C375230 Beethoven, Ludwig van',
  },
  {
    tagValue: '100',
    index: 16,
    marcValue: 'C375230 Kerouac, Jack',
  },
];
const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
const todayWithoutPaddingZero = DateTools.clearPaddingZero(today);
const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      before('Creating user and uploading files', () => {
        cy.getAdminToken();
        ['C375230', 'C380532'].forEach((title) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(title);
        });
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
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.createdAuthorityID.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(testData.createdAuthorityID[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            dataForC375230.forEach((field) => {
              QuickMarcEditor.clickLinkIconInTagField(field.index);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(field.marcValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(field.tagValue, field.index);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(testData.createdAuthorityID[0]);
        MarcAuthority.deleteViaAPI(testData.createdAuthorityID[1]);
      });

      it(
        'C375230 "MARC authority headings updates (CSV)" report does NOT include data on deleted "MARC authority" record (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C375230'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading1);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value1);
          QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });
          QuickMarcEditor.closeAllCallouts();

          MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading2);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value2);
          QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });
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
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
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
              testData.updatedTitle,
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
