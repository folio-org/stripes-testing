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
    tag010: '010',
    tag100: '100',
    tag111: '111',
    tag240: '240',
    // tag700: '700',
    updatedTag100Value1:
      '$a C357996 Beethoven, Ludwig the Greatest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
    updatedTag100Value2:
      '$a C357996 Beethoven, Ludwig the Loudest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
    updatedTag111Value:
      'C380529 Delaware TEST $t Delaware symposia on language studies $f 1985 $j test $1 ert',
    searchOption: 'Keyword',
    sourceFileName: 'LC Name Authority file (LCNAF)',
  };

  const today = DateTools.getCurrentDateForFiscalYear();
  const tomorrow = DateTools.getDayTomorrowDateForFiscalYear();
  // const expectedJobValues = {
  //   status: 'Successful',
  //   jobType: 'MARC authority headings updates',
  //   description: 'List of updated MARC authority (1XX) headings',
  //   outputType: 'MARC authority headings updates (CSV)',
  // };

  const marcFiles = [
    {
      marc: 'marcBibFileC380529.mrc',
      fileName: `testMarcFileC380529.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileC380529_1.mrc',
      fileName: `testMarcFileC380529.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading:
        'C380529 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
      authority010FieldValue: 'n831308323805291',
    },
    {
      marc: 'marcAuthFileC380529_2.mrc',
      fileName: `testMarcFileC380529.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading:
        'C380529 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
      authority010FieldValue: 'n847454253805292',
    },
  ];

  const createdRecordIDs = [];

  before('Creating user and uploading files', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.searchJobProfileForImport(marcFile.jobProfileToRun);
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
          testData.tag010,
          `‡a ${marcFiles[1].authority010FieldValue}`,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
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
    'C380529 Data for "MARC authority headings updates (CSV)" report includes data on several heading updates for the same "MARC authority" record (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const expectedFirstUpdateData = {
        naturalIdOld: marcFiles[1].authority010FieldValue,
        naturalIdNew: marcFiles[1].authority010FieldValue,
        headingNew: testData.updatedTag100Value1,
        headingOld: marcFiles[1].authorityHeading,
        sourceFileNew: testData.sourceFileName,
        sourceFileOld: testData.sourceFileName,
        lbTotal: '1',
        ldUpdated: '1',
        startedAt: today,
        startedByUserFirstName: testData.userProperties.firstName,
        startedByUserLastName: testData.userProperties.lastName,
      };

      MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.waitLoading();
      // Waiter needed for the whole page to be loaded.
      cy.wait(2000);
      QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value1);
      QuickMarcEditor.saveAndKeepEditingUpdatedLinkedBibField();
      QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);
      QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value2);
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      QuickMarcEditor.confirmUpdateLinkedBibs(1);

      MarcAuthorities.searchBy(testData.searchOption, marcFiles[2].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[2].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.waitLoading();
      // Waiter needed for the whole page to be loaded.
      cy.wait(2000);
      QuickMarcEditor.updateExistingField(testData.tag111, testData.updatedTag111Value);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndCloseAuthority();
      MarcAuthorities.verifyHeadingsUpdatesDataViaAPI(today, tomorrow, expectedFirstUpdateData);
      // cy.getAuthorityHeadingsUpdatesViaAPI(today, tomorrow).then(updatesData => {
      //   cy.log(JSON.stringify(updatesData));
      // });
    },
  );
});
