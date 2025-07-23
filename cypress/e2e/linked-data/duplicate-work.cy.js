import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import NewInstance from '../../support/fragments/linked-data/newInstance';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import UncontrolledAuthModal from '../../support/fragments/linked-data/uncontrolledAuthModal';

describe('Citation: duplicate resource', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C624234 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C624234 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    uniqueDuplicateTitle: `Cypress test duplicate ${getRandomPostfix()}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    resourceIdentifiers: [
      { type: 'ISBN', value: '1587657090' },
      { type: 'ISBN', value: '9781587657092' },
    ],
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
    // set preffered profile in order to avoid additional pop-up to be displayed during instance adding
    cy.setPrefferedProfileForUser();
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
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
    // delete duplicate work data
    Work.getIdByTitle(testData.uniqueDuplicateTitle).then((id) => Work.deleteById(id));
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueInstanceTitle);
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
    'C624234 [User journey] LDE - Duplicate existing work (citation)',
    { tags: ['smoke', 'citation', 'linked-data-editor', 'shiftLeft'] },
    () => {
      // search by title for work created in precondition
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      // open work for editing
      LinkedDataEditor.selectFromSearchTable(1);
      LinkedDataEditor.editWork();
      // duplicate work
      EditResource.duplicateResource();
      EditResource.setValueForTheField(testData.uniqueDuplicateTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditing();
      // close uncontrolled authority modal
      UncontrolledAuthModal.closeIfDisplayed();
      // add instance
      // click on new instance button since resource was duplicated without instances
      EditResource.openNewInstanceFormViaNewInstanceButton();
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      NewInstance.addInstanceIdentifiers(testData);
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueDuplicateTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueDuplicateTitle);
      // check that newly created instance is displayed in the inventory
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      // check source
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
      InventorySearchAndFilter.closeInstanceDetailPane();
      InventorySearchAndFilter.selectResultCheckboxes(1);
      InventorySearchAndFilter.verifySelectedRecords(1);
    },
  );
});
