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
    'C436879 Marigold - Notes about the Work create/edit / Fields duplication / View MARC',
    { tags: ['criticalPath', 'citation', 'C436879', 'marigold'] },
    () => {
      InventoryInstances.searchByTitle(testData.uniqueInventoryTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);

      // Check inventory work in Marigold
      EditResource.checkTextValueOnField('French', 'Note');
      EditResource.checkLabelOnSimpleField('language (lang)', 'Note type');
      EditResource.checkTextValueOnField('Includes bibliographical references (p. 245–260) and index, Bibliography: pages 180–195', 'Note');
      EditResource.checkLabelOnSimpleField('bibliography (biblio)', 'Note type');
      EditResource.clickCloseResourceButton();

      // Create work
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueWorkTitle, 'Preferred Title for Work');
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
      EditResource.checkTextValueOnField('', 'Note');
      EditResource.checkSimpleFieldDropdownContainsOptions('Note type', [
        'award (award)',
        'bibliography (biblio)',
        'language (lang)',
      ]);
      // @@@ new fn set for section - Note is also in Dissertation section; pick up here
      EditResource.setValueForTheField('Winner of the International Literary Prize for Contemporary Fiction, 2022.', 'Note');
      EditResource.setValueForSimpleField('award (award)', 'Note type');
      EditResource.saveAndClose();
      
      Marigold.waitLoading();
      SearchAndFilter.openSearchResultPreviewByTitle(resourceData.workTitle);
      SearchAndFilter.waitPreviewLoading();
      SearchAndFilter.checkPreviewContains('Note', 'Winner of the International Literary Prize for Contemporary Fiction, 2022.');
      SearchAndFilter.checkPreviewContains('Note type', 'award');
      Marigold.clickEditWorkFromSearch();

      // Add notes to work
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.clickRepeatGroup('Notes about the Work');
      EditResource.clickRepeatGroup('Notes about the Work');
      EditResource.setValueForTheField('Contains references and suggested further reading at the end of each chapter.', 'Note', 2);
      EditResource.setValueForSectionSimpleField('bibliograph (biblio)', 'Note type', 2);
      EditResource.setValueForTheField('Text in English with summaries in French and Spanish.', 'Note', 3);
      EditResource.setValueForSectionSimpleField('language (lang)', 'Note type', 3);
      EditResource.saveAndKeepEditing();
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewOpen();
      // @@@ verify work preview contents, 3 notes; may need new fn

      // Verify MARC
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      // @@@ verify in marc

      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      // @@@ remove award note type; may need new fn
      EditResource.saveAndKeepEditing();
      // skip verifying save request contents, this is what the next section is for

      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      // @@@ verify marc, different field

      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      // @@@ add note types to empty type note group
      EditResource.saveAndKeepEditing();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      // @@@ verify marc sections
    },
  );
});
