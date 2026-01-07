import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import ComparisonForm from '../../support/fragments/linked-data/comparisonForm';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';

describe('Citation: edit existing instance', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C624280 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C624280 marcFile${getRandomPostfix()}.mrc`,
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
    title: `${testData.uniqueTitle} TT test35 cultural approach to intermediate Spanish tk1`,
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
    // delete duplicate instance data
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
    'C692195 [User journey] LDE - Edit existing instance using comparison mode (citation)',
    { tags: ['criticalPath', 'citation', 'C692195', 'linked-data-editor'] },
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
      // select both inventory instances
      LinkedDataEditor.selectInventoryInstance(1);
      LinkedDataEditor.selectInventoryInstance(2);
      // comparison mode
      LinkedDataEditor.openComparisonForm();
      ComparisonForm.verifyComparisonSectionDisplayed();
      // edit first instance
      ComparisonForm.editInstance(testData.uniqueInstanceTitle);
      EditResource.setValueForTheField(testData.uniqueInstanceTitleUpdated, 'Main Title');
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // check that changes are reflected on inventory
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitleUpdated);
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
    },
  );
});
