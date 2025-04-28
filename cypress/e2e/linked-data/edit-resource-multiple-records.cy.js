import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';

describe('Citation: create new instance by duplicating - for a multiple instance work', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C721761 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C721761 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    uniqueInstanceTitleUpdated: `Updated Instance AQA title ${getRandomPostfix()}`,
    callNumber: '331.2',
  };

  const resourceData = {
    creator: testData.uniqueCreator,
    language: 'spa',
    classificationNumber: 'PC4112',
    title: `${testData.uniqueTitle} TT test35 cultural approach to intermediate Spanish tk1 /`,
    isbnIdentifier: testData.uniqueIsbn,
    lccnIdentifier: 'aa1994901234',
    publisher: 'Scott, Foresman, test',
    publicationDate: '2024',
    edition: '3rd ed. test',
  };

  before('Create test data via API', () => {
    // Set unique title, ISBN and Creator for searching
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ["!A Alice's Adventures in Wonderland", '123456789123456', 'Neale-Silva, Eduardo'],
      [testData.uniqueTitle, testData.uniqueIsbn, testData.uniqueCreator],
    );
    cy.getAdminToken();
    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    // delete inventory instance both from inventory and LDE modules
    // this might change later once corresponding instance will automatically get deleted in linked-data
    InventoryInstances.deleteFullInstancesByTitleViaApi(resourceData.title);
    Work.getInstancesByTitle(testData.uniqueTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === testData.uniqueTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    // delete work created in pre-condition
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
    // delete both duplicated instances data
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueInstanceTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueInstanceTitleUpdated);
  });

  beforeEach('Apply test data manually', () => {
    cy.loginAsAdmin({
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
    });
    // create test data based on uploaded marc file
    LinkedDataEditor.createTestWorkDataManuallyBasedOnMarcUpload(resourceData.title);
  });

  it(
    'C721761 [User journey] LDE - Create new instance by duplicating existing Instance for a work with multiple instances (citation)',
    { tags: ['criticalPath', 'citation', 'linked-data-editor'] },
    () => {
      // search by title for work created in precondition
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      // open instance for editing
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      // duplicate instance
      EditResource.duplicateResource();
      EditResource.setValueForTheField(testData.uniqueInstanceTitle, 'Main Title');
      EditResource.clearField('Other Title Information');
      EditResource.setValueForTheField(LinkedDataEditor.generateValidLccn(), 'LCCN');
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search by work title again
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      // duplicate first instane once again
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      EditResource.duplicateResource();
      EditResource.setValueForTheField(testData.uniqueInstanceTitleUpdated, 'Main Title');
      EditResource.clearField('Other Title Information');
      EditResource.setValueForTheField(LinkedDataEditor.generateValidLccn(), 'LCCN');
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search work by instance title
      SearchAndFilter.searchResourceByTitle(testData.uniqueInstanceTitleUpdated);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueInstanceTitleUpdated);
      // navigate to the inventory module
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitleUpdated);
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
    },
  );
});
