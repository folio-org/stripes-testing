import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import NewInstance from '../../../support/fragments/linked-data/newInstance';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: check notes MARC codes', () => {
  const testData = {
    workId: null,
    instanceId: null,
    marcFilePath: 'marcFileForC436879.mrc',
    modifiedMarcFile: `C436879 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C436879 marcFile${getRandomPostfix()}.mrc`,
    uniqueInventoryTitle: `Inventory notes about the work ${getRandomPostfix()}`,
    uniqueWorkTitle: `Marigold work notes about the work ${getRandomPostfix()}`,
    uniqueInstanceTitle: `Marigold instance notes about the work ${getRandomPostfix()}`,
  };

  const resourceData = {
    inventoryTitle: testData.uniqueInventoryTitle,
    workTitle: testData.uniqueWorkTitle,
    instanceTitle: testData.uniqueInstanceTitle,
    inventoryLangNote: 'French',
    inventoryBibNote: 'Includes bibliographical references (p. 245–260) and index, Bibliography: pages 180–195',
    note1: 'Winner of the International Literary Prize for Contemporary Fiction, 2022.',
    note2: 'Contains references and suggested further reading at the end of each chapter.',
    note3: 'Text in English with summaries in French and Spanish.',
  };

  const fieldData = {
    booksProfile: 'Books',
    workTitle: 'Preferred Title for Work',
    notesSection: 'Notes about the Work',
    noteField: 'Note',
    noteTypeField: 'Note type',
    noteTypes: [
      'award (award)',
      'bibliography (biblio)',
      'language (lang)',
    ],
    awardTypeValue: 'award (award)',
    awardTypeDisplay: 'award',
    biblioTypeValue: 'bibliography (biblio)',
    biblioTypeDisplay: 'bibliography',
    langTypeValue: 'language (lang)',
    langTypeDisplay: 'language',
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Placeholder Title Notes'],
      [testData.uniqueInventoryTitle],
    );
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });

    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    InventoryInstances.deleteFullInstancesByTitleViaApi(resourceData.inventoryTitle);
    Work.getInstancesByTitle(resourceData.inventoryTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === resourceData.inventoryTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    Work.getIdByTitle(resourceData.inventoryTitle).then((id) => Work.deleteById(id));
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
      authRefresh: true,
    });
  });

  it(
    'C436879 Marigold - Notes about the Work create/edit / Fields duplication / View MARC (citation)',
    { tags: ['criticalPath', 'citation', 'C436879', 'marigold'] },
    () => {
      // Import inventory work into Marigold
      InventoryInstances.searchByTitle(testData.uniqueInventoryTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);

      // Check inventory work in Marigold
      EditResource.checkTextValueOnField(resourceData.inventoryLangNote, fieldData.noteField);
      EditResource.checkLabelOnSimpleField(fieldData.langTypeValue, fieldData.noteTypeField);
      EditResource.checkTextValueOnField(resourceData.inventoryBibNote, fieldData.noteField);
      EditResource.checkLabelOnSimpleField(fieldData.biblioTypeValue, fieldData.noteTypeField);
      EditResource.clickCloseResourceButton();

      // Create work
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected(fieldData.booksProfile);
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueWorkTitle, fieldData.workTitle);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);

      // Create instance
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.instanceId = resourceId;
      });
      EditResource.clickCloseResourceButton();

      // Add note to work
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.workTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.workTitle);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkTextValueOnField('', fieldData.noteField);
      EditResource.checkSimpleFieldDropdownContainsOptions(fieldData.noteTypeField, fieldData.noteTypes);
      EditResource.setValueForSectionField(resourceData.note1, fieldData.noteField, fieldData.notesSection);
      EditResource.setValueForSectionSimpleField(fieldData.awardTypeValue, fieldData.noteTypeField);
      EditResource.saveAndClose();

      // Verify work preview
      Marigold.waitLoading();
      SearchAndFilter.openSearchResultPreviewByTitle(resourceData.workTitle);
      SearchAndFilter.waitPreviewLoading();
      SearchAndFilter.checkPreviewContains(fieldData.noteField, resourceData.note1);
      SearchAndFilter.checkPreviewContains(fieldData.noteTypeField, fieldData.awardTypeDisplay);
      Marigold.clickEditWorkFromSearch();

      // Add more notes to work
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.clickRepeatGroup(fieldData.notesSection);
      EditResource.clickRepeatGroup(fieldData.notesSection);
      EditResource.setValueForSectionField(resourceData.note2, fieldData.noteField, fieldData.notesSection, 2);
      EditResource.setValueForSectionSimpleField(fieldData.biblioTypeValue, fieldData.noteTypeField, 2);
      EditResource.setValueForSectionField(resourceData.note3, fieldData.noteField, fieldData.notesSection, 3);
      EditResource.setValueForSectionSimpleField(fieldData.langTypeValue, fieldData.noteTypeField, 3);
      EditResource.saveAndKeepEditing();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewOpen();
      EditResource.checkPreviewSectionContainsField(fieldData.notesSection, fieldData.noteField, resourceData.note1);
      EditResource.checkPreviewSectionContainsField(fieldData.notesSection, fieldData.noteTypeField, fieldData.awardTypeDisplay);
      EditResource.checkPreviewSectionContainsField(fieldData.notesSection, fieldData.noteField, resourceData.note2);
      EditResource.checkPreviewSectionContainsField(fieldData.notesSection, fieldData.noteTypeField, fieldData.biblioTypeDisplay);
      EditResource.checkPreviewSectionContainsField(fieldData.notesSection, fieldData.noteField, resourceData.note3);
      EditResource.checkPreviewSectionContainsField(fieldData.notesSection, fieldData.noteTypeField, fieldData.langTypeDisplay);

      // Verify MARC
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('504', `$a ${resourceData.note2}`);
      ViewMarc.checkMarcFieldContainsData('546', `$a ${resourceData.note3}`);
      ViewMarc.checkMarcFieldContainsData('586', `$a ${resourceData.note1}`);

      // Remove note type
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.clearSectionSimpleField(fieldData.noteTypeField, 1);
      EditResource.saveAndKeepEditing();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);

      // Verify MARC
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewSectionContainsField(fieldData.notesSection, fieldData.noteField, resourceData.note1);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('500', `$a ${resourceData.note1}`);

      // Add multiple note types
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.setValueForSectionSimpleField(fieldData.awardTypeValue, fieldData.noteTypeField, 1);
      EditResource.setValueForSectionSimpleField(fieldData.biblioTypeValue, fieldData.noteTypeField, 1);
      EditResource.saveAndKeepEditing();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // Verify MARC
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('504', `$a ${resourceData.note1} $a ${resourceData.note2}`);
      ViewMarc.checkMarcFieldContainsData('586', `$a ${resourceData.note1}`);
    },
  );
});
