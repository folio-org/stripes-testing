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

describe('Citation: check place of work MARC codes', () => {
  const testData = {
    workId: null,
    instanceId: null,
    marcFilePath: 'marcFileForC466293.mrc',
    modifiedMarcFile: `C466293 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C466293 marcFile${getRandomPostfix()}.mrc`,
    uniqueInventoryTitle: `Inventory place of origin of the work ${getRandomPostfix()}`,
    uniqueMarigoldWorkTitle: `Marigold work place of origin of the work ${getRandomPostfix()}`,
    uniqueMarigoldInstanceTitle: `Marigold pinstance lace of origin of the work ${getRandomPostfix()}`,
    marigoldPlaceFirst: 'Nauru (nu)',
    marigoldPlaceSecond: 'Yukon Territory (ykc)',
  };

  const resourceData = {
    inventoryTitle: testData.uniqueInventoryTitle,
    inventoryPlace: 'Arizona (azu)',
    inventoryPlacePreview: 'Arizona',
    inventoryMarc257: '$a Arizona',
    marigoldWorkTitle: testData.uniqueMarigoldWorkTitle,
    marigoldInstanceTitle: testData.uniqueMarigoldInstanceTitle,
    marigoldPlaceFirst: testData.marigoldPlaceFirst,
    marigoldPlaceSecond: testData.marigoldPlaceSecond,
    marigoldPlaceSecondPreview: 'Yukon Territory',
    marigoldMarc257: '$a Yukon Territory',
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Placeholder Title'],
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
    'C466293 Marigold - Adding "Place of origin of the work" to the new work through Marigold / Inventory. View MARC.',
    { tags: ['criticalPath', 'citation', 'C466293', 'marigold'] },
    () => {
      // Find and import precondition inventory instance
      InventoryInstances.searchByTitle(testData.uniqueInventoryTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();

      // Create Marigold work and instance
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueMarigoldWorkTitle, 'Preferred Title for Work');
      EditResource.setValueForSimpleField(testData.marigoldPlaceFirst, 'Place of Origin of the Work');
      EditResource.saveAndKeepEditingWithId(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(testData.uniqueMarigoldInstanceTitle);
      EditResource.saveAndKeepEditingWithId(({ resourceId }) => {
        testData.instanceId = resourceId;
      });
      EditResource.clickCloseResourceButton();

      // Find Marigold work
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.marigoldWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.marigoldWorkTitle);
      Marigold.clickEditWorkFromSearch();

      // Verify place of work, change
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkLabelOnSimpleSectionField(resourceData.marigoldPlaceFirst, 'Place of Origin of the Work');
      EditResource.clearSimpleField('Place of Origin of the Work');
      EditResource.setValueForSimpleField(testData.marigoldPlaceSecond, 'Place of Origin of the Work');
      EditResource.saveAndClose();

      // Re-open and verify change in place of work
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.marigoldWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.marigoldWorkTitle);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkLabelOnSectionSimpleField(resourceData.marigoldPlaceSecond, 'Place of Origin of the Work');

      // Edit instance, verify change in work preview
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewOpen();
      EditResource.checkPreviewSectionContains('Place of Origin of the Work', resourceData.marigoldPlaceSecondPreview);

      // Review MARC
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('257', resourceData.marigoldMarc257);
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();

      // Find Inventory work
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.inventoryTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.inventoryTitle);
      Marigold.clickEditWorkFromSearch();

      // Verify place of work
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkLabelOnSectionSimpleField(resourceData.inventoryPlace, 'Place of Origin of the Work');

      // Edit instance, verify place of work in work preview
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewOpen();
      EditResource.checkPreviewSectionContains('Place of Origin of the Work', resourceData.inventoryPlacePreview);

      // Review MARC
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('257', resourceData.inventoryMarc257);
    },
  );
});
