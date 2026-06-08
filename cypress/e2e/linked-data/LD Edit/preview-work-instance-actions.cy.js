import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import Marigold from '../../../support/fragments/linked-data/marigold';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import Work from '../../../support/fragments/linked-data/work';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: check work / instance preview and actions', () => {
  const testData = {
    marcFilePath: 'marcFileForC423954.mrc',
    modifiedMarcFile: `C423954 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C423954 marcFile${getRandomPostfix()}.mrc`,
    uniqueInventoryWorkTitle: `Test preview, actions dropdown ${getRandomPostfix()}`,
    uniqueInventoryInstanceTitle: `Test instance preview, actions dropdown ${getRandomPostfix()}`,
  };

  const resourceData = {
    inventoryWorkTitle: testData.uniqueInventoryWorkTitle,
    inventoryInstanceTitle: testData.uniqueInventoryInstanceTitle,
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Placeholder Title Previews Actions'],
      [testData.uniqueInventoryWorkTitle],
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
    InventoryInstances.deleteFullInstancesByTitleViaApi(resourceData.inventoryWorkTitle);
    Work.getInstancesByTitle(resourceData.inventoryWorkTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === resourceData.inventoryInstanceTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    Work.getIdByTitle(resourceData.inventoryWorkTitle).then((id) => Work.deleteById(id));
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
    'C523770 Marigold - Preview panel for Work / Instance by clicking title. Actions dropdown for Work / Instance (citation)',
    { tags: ['criticalPath', 'citation', 'C523770', 'marigold'] },
    () => {
      // Import inventory work and instance
      InventoryInstances.searchByTitle(resourceData.inventoryWorkTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.setValueForTheField(testData.uniqueInventoryInstanceTitle, 'Main Title');
      EditResource.saveAndClose();

      // Work search preview
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.inventoryWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.inventoryWorkTitle);
      SearchAndFilter.openSearchResultPreviewByTitle(resourceData.inventoryWorkTitle);
      SearchAndFilter.waitPreviewLoading();
      SearchAndFilter.checkPreviewContains(
        'Preferred Title for Work',
        resourceData.inventoryWorkTitle,
      );
      SearchAndFilter.checkPreviewContains('Part number', '-');
      SearchAndFilter.checkPreviewContains('Hub', '-');
      SearchAndFilter.checkPreviewContains('Note type', '-');
      SearchAndFilter.checkPreviewContains('ISSN', '-');
      SearchAndFilter.checkPreviewContains('Institution', '-');
      SearchAndFilter.verifyPreviewCloseButton();
      SearchAndFilter.verifyPreviewEditButton();
      SearchAndFilter.clickClosePreviewButton();

      // Edit work actions
      SearchAndFilter.openSearchResultPreviewByTitle(resourceData.inventoryWorkTitle);
      SearchAndFilter.waitPreviewLoading();
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.verifyWorkInstanceActionOptions();
      EditResource.verifyWorkWorkActionOptions();
      EditResource.clickCloseResourceButton();

      // Instance search preview
      Marigold.waitLoading();
      SearchAndFilter.openSearchResultPreviewByTitle(resourceData.inventoryInstanceTitle);
      SearchAndFilter.waitPreviewLoading();
      SearchAndFilter.checkPreviewContains('Main Title', resourceData.inventoryInstanceTitle);
      SearchAndFilter.checkPreviewContains('Part name', '-');
      SearchAndFilter.checkPreviewContains('Note type', '-');
      SearchAndFilter.checkPreviewContains('Extent', '-');
      SearchAndFilter.checkPreviewContains('URL', '-');
      SearchAndFilter.checkPreviewContains('Language', '-');
      SearchAndFilter.verifyPreviewCloseButton();
      SearchAndFilter.verifyPreviewEditButton();
      SearchAndFilter.clickClosePreviewButton();

      // Edit instance actions
      SearchAndFilter.openSearchResultPreviewByTitle(resourceData.inventoryInstanceTitle);
      SearchAndFilter.waitPreviewLoading();
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.verifyInstanceInstanceActionOptions();
    },
  );
});
