import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EDIT_RESOURCE_HEADINGS,
} from '../../../support/constants';
import Work from '../../../support/fragments/linked-data/work';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Marigold from '../../../support/fragments/linked-data/marigold';
import EditResource from '../../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

let user;

describe('Citation: notes about the instance', () => {
  const testData = {
    marcFilePath: 'C423954.mrc',
    marcFileName: 'C423954 marcFile.mrc',
    uniqueMarcTitle: `Notes about the Instance. Test ${getRandomPostfix()}`,
    workTitle: `Notes about the Instance ${getRandomPostfix()}`,
    instanceTitle: `Notes about the Instance Instance ${getRandomPostfix()}`,
    workId: null,
    instanceId: null,
    marcInventoryId: null,
    note1:
      'The author is a contemporary visual artist known for interdisciplinary work combining traditional painting with digital media, with exhibitions held internationally since 2010.',
    note2: "Description based on publisher's website and accompanying documentation.",
    note3: "Description based on title page, table of contents, and publisher's catalog.",
    marcNote1: 'Issued in multiple volumes over a period of five years',
    marcNote1Type: 'issuance information (issuance)',
    marcNote2:
      'Funded by the National Endowment for the Humanities under grant number NEH-2021-12345.',
    marcNote2Type: 'funding information (fundinfo)',
  };

  const noteTypeOptions = [
    'biographical data (biogdata)',
    'description source (descsource)',
    'exhibition (exhibit)',
    'funding information (fundinfo)',
    'issuance information (issuance)',
    'numbering (number)',
    'issuing body (issuing)',
  ];

  before('Create test data via API', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.marcFileName,
      ['Notes about the Instance. Test'],
      [testData.uniqueMarcTitle],
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
    DataImport.uploadFilesViaApi({
      marc: testData.marcFileName,
      fileName: testData.marcFileName,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    }).then(({ createdInstanceIDs }) => {
      testData.marcInventoryId = createdInstanceIDs[0];
    });
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.marcFileName}`);
    cy.getAdminToken();
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Work.deleteByTitle(testData.uniqueMarcTitle);
    if (testData.marcInventoryId) InventoryInstance.deleteInstanceViaApi(testData.marcInventoryId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach('Login', () => {
    cy.login(user.username, user.password, {
      path: TopMenu.linkedDataEditor,
      waiter: Marigold.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C423954 [UILD-162, UILD-94, UILD-569, UILD-606] Notes about the Instance create/edit/Duplicate fields + View MARC (citation)',
    { tags: ['criticalPath', 'citation', 'C423954', 'marigold'] },
    () => {
      // Create new work and instance in Marigold
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.workTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditing();
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.setValueForTheField(testData.instanceTitle, 'Main Title');
      EditResource.saveAndClose();

      // Step 1: search for LD work, edit instance, verify Notes section + Note type dropdown options
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(testData.workTitle);
      Marigold.editInstanceFromSearchTable(1, 1);
      EditResource.checkSimpleFieldDropdownContainsOptions('Note type', noteTypeOptions);

      // Step 2: add note with biogdata type, save & close, click instance title to open preview,
      // verify note in Notes about the Instance section
      EditResource.setNoteValueAtPosition(testData.note1, 1);
      EditResource.setNoteTypeAtPosition('biographical data (biogdata)', 1);
      EditResource.saveAndClose();
      Marigold.clickInstanceTitleInSearchTable(1, 1);
      EditResource.checkPreviewSectionContainsText('Notes about the Instance', testData.note1);
      EditResource.checkPreviewSectionContainsText('Notes about the Instance', 'biographical data');

      // Step 3: click Edit Instance in preview panel, duplicate Notes section,
      // add 2nd note (descsource), save & keep editing, click Edit Work, verify both notes in instance preview
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickRepeatGroup('Notes about the Instance');
      EditResource.setNoteValueAtPosition(testData.note2, 2);
      EditResource.setNoteTypeAtPosition('description source (descsource)', 2);
      EditResource.saveAndKeepEditing();
      EditResource.clickEditWork();
      EditResource.checkPreviewSectionContainsText('Notes about the Instance', testData.note1);
      EditResource.checkPreviewSectionContainsText('Notes about the Instance', testData.note2);

      // Step 4: open instance edit via Actions, view MARC,
      // verify 545 0_ for biogdata and 588 __ for descsource
      EditResource.editInstanceFormViaActions();
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldIndicators('545', '0  ');
      ViewMarc.checkMarcFieldContainsData('545', testData.note1);
      ViewMarc.checkMarcFieldIndicators('588', '   ');
      ViewMarc.checkMarcFieldContainsData('588', testData.note2);

      // Step 5: add 3rd note (descsource), verify 588 has repeatable $a with both notes
      ViewMarc.closeMarcView();
      EditResource.clickRepeatGroup('Notes about the Instance');
      EditResource.setNoteValueAtPosition(testData.note3, 3);
      EditResource.setNoteTypeAtPosition('description source (descsource)', 3);
      EditResource.saveAndKeepEditing();
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('588', testData.note2);
      ViewMarc.checkMarcFieldContainsData('588', testData.note3);

      // Step 6: add 'exhibition' type to 3rd note, verify note3 appears in both 585 and 588
      ViewMarc.closeMarcView();
      EditResource.setNoteTypeByNoteValue('exhibition (exhibit)', testData.note3);
      EditResource.saveAndKeepEditing();
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('585', testData.note3);
      ViewMarc.checkMarcFieldContainsData('588', testData.note3);

      // Step 7: remove both Note types from 3rd note, verify note3 saved under 500 __
      ViewMarc.closeMarcView();
      EditResource.clearNoteTypeByNoteValue(testData.note3);
      EditResource.saveAndKeepEditing();
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('500', testData.note3);

      // Step 8: convert MARC instance to LDE via Inventory, then search in Marigold,
      // edit instance from search results, verify 2 Notes from MARC 536 + 515
      ViewMarc.closeMarcView();
      EditResource.clickCloseResourceButton();
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventorySearchAndFilter.waitLoading();
      InventoryInstances.searchByTitle(testData.uniqueMarcTitle);
      InventoryInstances.selectInstance(0);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkNotesAboutInstanceSectionCount(2);
      EditResource.checkNoteHasType(testData.marcNote1, testData.marcNote1Type);
      EditResource.checkNoteHasType(testData.marcNote2, testData.marcNote2Type);

      // Step 9: click info tooltip for Notes about the Instance, verify MARC equivalents
      EditResource.toggleSectionMarcTooltip('Notes about the Instance');
      EditResource.checkMarcTooltipContains('Note', '3XX, 5XX');
    },
  );
});
