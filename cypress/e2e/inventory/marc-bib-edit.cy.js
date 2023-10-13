import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../support/constants';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    tag001: '001',
    tag245: '245',
    tag504: '504',
    tag555: '555',
    tag504FirstUpdatedTag: '45',
    tag504SecondUpdatedTag: '45e',
    instanceNotesAccordion: 'Instance notes',
    instanceTitle: 'C360098 Narysy z historyi belaruskaha mastatstva / Mikola Shchakatsikhin.',
    instanceBibliographyNote: 'Includes bibliographical references and index',
  };
  const marcFile = {
    marc: 'marcBibFileC360098.mrc',
    fileName: `testMarcFileC360098.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  const createdInstanceIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      });
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      }).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdInstanceIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
      });
    });
  });

  after('Deleting created users, Instances', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[0]);
  });

  it(
    'C360098 MARC Bib | MARC tag validation checks when clicks on the "Save & keep editing" button (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      QuickMarcEditor.updateExistingTagValue(20, '');
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyAndDismissWrongTagLengthCallout();
      QuickMarcEditor.verifyTagValue(20, '');
      QuickMarcEditor.updateExistingTagValue(20, testData.tag504FirstUpdatedTag);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyAndDismissWrongTagLengthCallout();
      QuickMarcEditor.verifyTagValue(20, testData.tag504FirstUpdatedTag);
      QuickMarcEditor.updateExistingTagValue(20, testData.tag504SecondUpdatedTag);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyInvalidTagCallout();
      QuickMarcEditor.verifyTagValue(20, testData.tag504SecondUpdatedTag);
      QuickMarcEditor.updateExistingTagValue(20, testData.tag245);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyMultiple245TagCallout();
      QuickMarcEditor.verifyTagValue(20, testData.tag245);
      QuickMarcEditor.updateExistingTagValue(20, testData.tag504);
      QuickMarcEditor.updateExistingTagValue(14, testData.tag555);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyNo245TagCallout();
      QuickMarcEditor.verifyTagValue(14, testData.tag555);
      QuickMarcEditor.updateExistingTagValue(14, testData.tag245);
      QuickMarcEditor.updateExistingTagValue(16, '');
      QuickMarcEditor.updateTagNameToLockedTag(16, testData.tag001);
      QuickMarcEditor.checkFourthBoxDisabled(16);
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.verifyMultiple001TagCallout();
      QuickMarcEditor.verifyTagValue(16, testData.tag001);
      QuickMarcEditor.checkFourthBoxDisabled(16);
      QuickMarcEditor.closeWithoutSavingAfterChange();
      InventoryInstance.waitLoading();
      InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      InventoryInstance.checkDetailViewOfInstance(
        testData.instanceNotesAccordion,
        testData.instanceBibliographyNote,
      );
    },
  );

  it(
    'C356842 [quickMARC] Verify that the "Save & close" button enabled when user make changes in the record. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.visit(TopMenu.inventoryPath, {
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstances.searchBySource('MARC');
      InventoryInstance.searchByTitle(createdInstanceIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.waitLoading();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.addEmptyFields(20);
      // here and below - wait until new field is shown
      cy.wait(500);
      QuickMarcEditor.updateExistingFieldContent(21, '1');
      QuickMarcEditor.checkEmptyFieldAdded(21, '1');
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.addEmptyFields(20);
      // here and below - wait until new field is shown
      cy.wait(500);
      QuickMarcEditor.updateExistingFieldContent(22, '2');
      QuickMarcEditor.checkEmptyFieldAdded(22, '2');
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.addEmptyFields(20);
      // here and below - wait until new field is shown
      cy.wait(500);
      QuickMarcEditor.updateExistingFieldContent(23, '3');
      QuickMarcEditor.checkEmptyFieldAdded(23, '3');
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.deleteField(20);
      // here and below - wait until deleted empty field is not shown
      cy.wait(1000);
      QuickMarcEditor.checkButtonSaveAndCloseEnable();

      QuickMarcEditor.deleteField(21);
      // here and below - wait until deleted empty field is not shown
      cy.wait(1000);
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.deleteField(21);
      // here and below - wait until deleted empty field is not shown
      cy.wait(1000);
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.deleteField(21);
      // here and below - wait until deleted empty field is not shown
      cy.wait(1000);
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.checkTagAbsent('');
      QuickMarcEditor.clickSaveAndCloseThenCheck(1);
      QuickMarcEditor.confirmDelete();
      QuickMarcEditor.checkAfterSaveAndClose();
    },
  );
});
