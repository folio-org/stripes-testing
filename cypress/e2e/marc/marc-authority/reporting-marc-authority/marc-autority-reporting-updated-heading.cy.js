import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import FileManager from '../../../../support/utils/fileManager';

describe('MARC -> MARC Authority -> Reporting MARC authority', () => {
  const testData = {
    tag001: '001',
    tag100: '100',
    tag240: '240',
    tag700: '700',
    marcValue: 'Beethoven, Ludwig van,',
    searchOption: 'Keyword',
    authorityHeading:
      'C375220 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
    authority001FieldValue: 'n83130007375220',
    updatedTag100Value:
      '$a C357220 Beethoven, Ludwig the Greatest, $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
    title: 'Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
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
      marc: 'marcBibFileForC375220_1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC375220_2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
    },
  ];
  const createdAuthorityID = [];
  const dataForC375220 = [
    {
      recordTitle: createdAuthorityID[0],
      index: 18,
      tagValue: '240',
      marcValue:
        'C375220 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
    },
    {
      recordTitle: createdAuthorityID[0],
      tagValue: '700',
      index: 50,
      marcValue:
        'C375220 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
    },
  ];

  before('Create test data', () => {
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
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            // Logs.checkStatusOfJobProfile('Completed');
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
        dataForC375220.forEach((field) => {
          QuickMarcEditor.clickLinkIconInTagField(field.index);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(testData.marcValue);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(field.tagValue, field.index);
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

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(createdAuthorityID[0]);
    MarcAuthority.deleteViaAPI(createdAuthorityID[1]);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375220 "MARC authority headings updates (CSV)" report is generated for controlling record with updated heading ("$0"="001") (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.searchOption, testData.title);
      MarcAuthoritiesSearch.selectAuthorityByIndex(0);
      MarcAuthority.edit();
      QuickMarcEditor.waitLoading();

      // Waiter needed for the whole page to be loaded.
      cy.wait(2000);
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
          testData.authorityHeading,
          'New heading',
          testData.authorityHeading,
          'Identifier',
          testData.authority001FieldValue,
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
