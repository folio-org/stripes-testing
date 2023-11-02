import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { JOB_STATUS_NAMES } from '../../support/constants';
import Parallelization from '../../support/dictionary/parallelization';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag001: '001',
    tag035: '035',
    tag046: '046',
    tag100: '100',
    tag600: '600',
    tag952: '952',
    updated010FieldValue: 'gf20140262973741590',
    updated100FieldValue: '$a Clovio, Giulio, $d 1498-1578 TEST',
    updated046FieldValue: '$f 1498 $g 1578 $2 edtf TEST',
    updatedTagName: '03',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileC375173.mrc',
      fileName: `testMarcFileC375173.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle:
        'C375173 Farnese book of hours : MS M.69 of the Pierpont Morgan Library New York / commentary, William M. Voelkle, Ivan Golub.',
    },
    {
      marc: 'marcAuthFileC375173.mrc',
      fileName: `testMarcFileC375173.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C375173 Clovio, Giulio, 1498-1578',
      authority001FieldValue: 'n83073672375173',
      authority035FieldValue: '(OCoLC)oca00955395',
      authority952FieldValue: '$a RETRO',
    },
  ];

  const createdRecordIDs = [];

  before('Creating user, importing and linking records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
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
        InventoryInstance.verifyAndClickLinkIcon(testData.tag600);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(marcFiles[1].authorityHeading);
        MarcAuthorities.checkFieldAndContentExistence(
          testData.tag001,
          marcFiles[1].authority001FieldValue,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag600);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting user, data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
      else InventoryInstance.deleteInstanceViaApi(id);
    });
  });

  it(
    'C375173 Save linked "MARC authority" record with deleted fields and edited "1XX" field (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingField(testData.tag100, testData.updated100FieldValue);
      QuickMarcEditor.updateExistingTagValue(5, testData.updatedTagName);
      QuickMarcEditor.checkContent(testData.updated100FieldValue, 8);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.deleteFieldAndCheck(5, testData.updatedTagName);
      QuickMarcEditor.afterDeleteNotification(testData.updatedTagName);
      // if clicked too fast, delete modal might not appear
      cy.wait(1000);
      QuickMarcEditor.clickSaveAndCloseThenCheck(1);
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.checkContent('$a ' + marcFiles[1].authority035FieldValue, 5);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.checkUpdateLinkedBibModalAbsent();
      QuickMarcEditor.updateExistingTagValue(5, testData.tag035);
      QuickMarcEditor.updateExistingField(testData.tag046, testData.updated046FieldValue);
      QuickMarcEditor.deleteFieldAndCheck(7, testData.tag046);
      QuickMarcEditor.afterDeleteNotification(testData.tag046);
      QuickMarcEditor.clickSaveAndCloseThenCheck(1);
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.checkContent(testData.updated046FieldValue, 7);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.checkUpdateLinkedBibModalAbsent();
      QuickMarcEditor.deleteFieldAndCheck(18, testData.tag952);
      QuickMarcEditor.afterDeleteNotification(testData.tag952);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.checkDeleteModal(1);
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.checkContent(marcFiles[1].authority952FieldValue, 18);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.checkUpdateLinkedBibModalAbsent();
    },
  );
});
