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
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';

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
  const marcFileC359239 = {
    marc: 'marcBibFileC359239.mrc',
    fileName: `testMarcFileC359239.${getRandomPostfix()}.mrc`,
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
        cy.visit(TopMenu.dataImportPath);
        DataImport.waitLoading();
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, `${marcFile.fileName}_copy`);
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(`${marcFile.fileName}_copy`);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(`${marcFile.fileName}_copy`);
        Logs.getCreatedItemsID().then((link) => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
        cy.visit(TopMenu.dataImportPath);
        DataImport.waitLoading();
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFileC359239.marc, marcFileC359239.fileName);
        JobProfiles.search(marcFileC359239.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileC359239.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileC359239.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      });
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[0]);
      InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[1]);
    });
  });

  it(
    'C360098 MARC Bib | MARC tag validation checks when clicks on the "Save & keep editing" button (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstances.waitContentLoading();
      InventoryInstance.searchByTitle(createdInstanceIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
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
      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstances.searchBySource('MARC');
      InventoryInstance.searchByTitle(createdInstanceIDs[1]);
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

  it(
    'C359239 Edit MARC Bib | Displaying of placeholder message when user deletes a row (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      const fieldData = {
        firstFieldForAdding: { tag: '', content: '' },
        secondFieldForAdding: { tag: '151', content: '' },
        thirdFieldForAdding: { tag: '', content: 'Filled' },
        forthFieldForAdding: { tag: '400', content: 'value' },
        fieldForDeleting: { tag: '222', content: '$a The Journal of ecclesiastical history' },

        field902: { tag: '903', content: '$a pfnd $b Lintz', ind1: '\\', ind2: '\\' },
        field905: { tag: '905', content: '$a 19890510120000.0 test', ind1: '\\', ind2: '\\' },
        field948: {
          tag: '948',
          content: '$a 20141106 $b m $d batch $e lts $x addfast test1',
          ind1: '2',
          ind2: '\\',
        },
        emptyField: {
          tag: '',
          content: '$l OLIN $a BR140 $b .J86 $h 01/01/01 N',
          ind1: '\\',
          ind2: '\\',
        },
        field010: { tag: '010', content: '$a    58020553 ' },
      };

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });

      InventoryInstance.searchByTitle(createdInstanceIDs[2]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.addNewField(
        fieldData.firstFieldForAdding.tag,
        fieldData.firstFieldForAdding.content,
        13,
      );
      QuickMarcEditor.checkContent(fieldData.firstFieldForAdding.content, 14);
      QuickMarcEditor.addNewField(
        fieldData.secondFieldForAdding.tag,
        fieldData.secondFieldForAdding.content,
        14,
      );
      QuickMarcEditor.checkContent(fieldData.secondFieldForAdding.content, 15);
      QuickMarcEditor.addNewField(
        fieldData.thirdFieldForAdding.tag,
        fieldData.thirdFieldForAdding.content,
        15,
      );
      QuickMarcEditor.checkContent(fieldData.thirdFieldForAdding.content, 16);
      QuickMarcEditor.addNewField(
        fieldData.forthFieldForAdding.tag,
        fieldData.forthFieldForAdding.content,
        16,
      );
      QuickMarcEditor.checkContent(fieldData.forthFieldForAdding.content, 17);
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.deleteField(14);
      cy.wait(1000);
      QuickMarcEditor.checkButtonsDisabled();
      QuickMarcEditor.deleteField(13);
      QuickMarcEditor.afterDeleteNotification(fieldData.fieldForDeleting.tag);
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(13, fieldData.fieldForDeleting.tag);

      QuickMarcEditor.addValuesToExistingField(
        27,
        fieldData.field902.tag,
        fieldData.field902.content,
        fieldData.field902.ind1,
        fieldData.field902.ind2,
      );
      QuickMarcEditor.addValuesToExistingField(
        28,
        fieldData.field905.tag,
        fieldData.field905.content,
        fieldData.field905.ind1,
        fieldData.field905.ind2,
      );
      QuickMarcEditor.addValuesToExistingField(
        29,
        fieldData.field948.tag,
        fieldData.field948.content,
        fieldData.field948.ind1,
        fieldData.field948.ind2,
      );
      QuickMarcEditor.addValuesToExistingField(
        30,
        fieldData.emptyField.tag,
        fieldData.emptyField.content,
        fieldData.emptyField.ind1,
        fieldData.emptyField.ind2,
      );

      QuickMarcEditor.deleteField(28);
      QuickMarcEditor.afterDeleteNotification(fieldData.field902.tag);
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(28, fieldData.field902.tag);
      QuickMarcEditor.deleteField(29);
      QuickMarcEditor.afterDeleteNotification(fieldData.field905.tag);
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(29, fieldData.field905.tag);
      QuickMarcEditor.deleteField(30);
      QuickMarcEditor.afterDeleteNotification(fieldData.field948.tag);
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(30, fieldData.field948.tag);
      QuickMarcEditor.deleteField(31);
      QuickMarcEditor.afterDeleteNotification(fieldData.emptyField.tag);
      QuickMarcEditor.undoDelete();
      QuickMarcEditor.verifyTagValue(31, fieldData.emptyField.tag);
      QuickMarcEditor.deleteField(4);
      cy.wait(1000);
      QuickMarcEditor.deleteField(31);
      cy.wait(1000);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkDeletingFieldsModal();
      QuickMarcEditor.restoreDeletedFields();
      QuickMarcEditor.verifyTagValue(4, fieldData.field010.tag);
      QuickMarcEditor.checkContent(fieldData.field010.content, 4);
      QuickMarcEditor.verifyTagValue(31, fieldData.emptyField.tag);
      QuickMarcEditor.checkContent(fieldData.emptyField.content, 31);
      QuickMarcEditor.deleteField(4);
      cy.wait(1000);
      QuickMarcEditor.afterDeleteNotification(fieldData.field010.tag);
      QuickMarcEditor.deleteField(31);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.clickSaveAndCloseThenCheck('2');
      QuickMarcEditor.confirmDeletingFields();
      InstanceRecordView.viewSource();
      InventoryViewSource.notContains(`${fieldData.field010.tag}\t`);
      InventoryViewSource.notContains(fieldData.emptyField.content);
    },
  );
});
