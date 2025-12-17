import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Work from '../../support/fragments/linked-data/work';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import EditResource from '../../support/fragments/linked-data/editResource';
import WorkProfileModal from '../../support/fragments/linked-data/workProfileModal';

describe('Citation: check navigation', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C451572 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C451572 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
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
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
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
    'C491276 Linked Data Editor: Verify user is navigated to Linked data editor home page when Application header icon is clicked (citation)',
    { tags: ['smoke', 'citation', 'linked-data-editor', 'shiftLeft'] },
    () => {
      // check search is displayed with lccn option
      LinkedDataEditor.checkSearchOptionIsDisplayed('lccn');
      // open new resource form
      LinkedDataEditor.openNewResourceForm();
      // check that modal is displayed
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading();
      // navigate back to the main module
      TopMenuNavigation.openAppFromDropdown('Linked Data Editor');
      LinkedDataEditor.waitLoading();
      // search by any title
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      // open work
      LinkedDataEditor.selectFromSearchTable(1);
      // navigate back to the main module
      LinkedDataEditor.selectModuleMainHeading();
      LinkedDataEditor.waitLoading();
      LinkedDataEditor.checkSearchOptionIsDisplayed('title');
    },
  );
});
