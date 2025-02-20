import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import AdvancedSearch from '../../support/fragments/linked-data/advancedSearch';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  LDE_ADVANCED_SEARCH_OPTIONS,
  LDE_SEARCH_OPTIONS,
  LDE_ADVANCED_SEARCH_CONDITIONS,
} from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import EditResource from '../../support/fragments/linked-data/editResource';

describe('Citation: cancel without saving', () => {
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

  const instanceMainTitleField = 'Main Title';

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
    InventoryInstances.getInstanceIdApi({
      limit: 1,
      query: `title="${resourceData.title}"`,
    }).then((id) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
    });
    Work.getInstancesByTitle(testData.uniqueDuplicateTitle).then((instances) => {
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
    'C656342 [User journey] LDE - Cancel without saving (Yes/No) (citation)',
    { tags: ['draft', 'citation', 'linked-data-editor'] },
    () => {
      // select advanced search option
      SearchAndFilter.selectAdvancedSearch();
      AdvancedSearch.waitLoading();
      // advanced search by title AND publisher
      // TBD: add search by OR/'Starts with' once bug MODLD-664 will be fixed and story UILD-170 implemented
      AdvancedSearch.setCondition(
        1,
        '',
        'Cypress test',
        LDE_ADVANCED_SEARCH_OPTIONS.CONTAINS_ALL,
        LDE_SEARCH_OPTIONS.TITLE,
      );
      AdvancedSearch.setCondition(
        2,
        LDE_ADVANCED_SEARCH_CONDITIONS.AND,
        'Nicholas',
        LDE_ADVANCED_SEARCH_OPTIONS.CONTAINS_ALL,
        LDE_SEARCH_OPTIONS.CONTRIBUTOR,
      );
      AdvancedSearch.clickSearch();
      // open instance for editing
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      // edit instance
      EditResource.setValueForTheField(testData.uniqueDuplicateTitle, instanceMainTitleField);
      // click on Cancel - YES
      EditResource.clickCancelWithOption('yes');
      // TODO: as for now this part failed due to UILD-493
      LinkedDataEditor.waitLoading();
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      // verify value was not changed
      EditResource.checkTextValueOnField(testData.uniqueTitle, instanceMainTitleField);
      // edit instance again
      EditResource.setValueForTheField(testData.uniqueDuplicateTitle, instanceMainTitleField);
      // click on Cancel - NO
      EditResource.clickCancelWithOption('no');
      // save changes
      EditResource.saveAndClose();
      LinkedDataEditor.waitLoading();
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      EditResource.checkTextValueOnField(testData.uniqueDuplicateTitle, instanceMainTitleField);
    },
  );
});
