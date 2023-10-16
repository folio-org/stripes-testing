import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import DateTools from '../../../support/utils/dateTools';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import Parallelization from '../../../support/dictionary/parallelization';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('MARC Authority -> Reporting | MARC authority', () => {
  const testData = {
    tag001: '001',
    tag100: '100',
    tag240: '240',
    tag700: '700',
    updatedTag100Value:
      '$a C357996 Beethoven, Ludwig the Greatest, $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
    searchOption: 'Keyword',
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
      marc: 'marcBibFileC357996.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC375996.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading:
        'C357996 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      authority001FieldValue: 'n83130007357996',
    },
  ];

  const createdRecordIDs = [];

  before('Creating user and uploading files', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
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
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        // wait for detail view to be fully loaded
        cy.wait(1500);
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(marcFiles[1].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(
          testData.tag001,
          marcFiles[1].authority001FieldValue,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
        InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(marcFiles[1].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(
          testData.tag001,
          marcFiles[1].authority001FieldValue,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
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
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C375996 Correct data for "MARC authority headings updates (CSV)" report shown in "Export manager" (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.waitLoading();
      // Waiter needed for the whole page to be loaded.
      cy.wait(2000);
      QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value);
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      QuickMarcEditor.confirmUpdateLinkedBibs(1);

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
      });
    },
  );
});
