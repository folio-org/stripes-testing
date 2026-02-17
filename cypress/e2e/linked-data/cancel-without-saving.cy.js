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
  LDE_ROLES,
} from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import EditResource from '../../support/fragments/linked-data/editResource';
import Users from '../../support/fragments/users/users';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

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
    roleIds: [],
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

    roleNames.forEach((roleName) => {
      cy.getUserRoleIdByNameApi(roleName).then((roleId) => {
        if (roleId) {
          testData.roleIds.push(roleId);
        }
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
    });

    cy.then(() => {
      if (testData.roleIds.length > 0) {
        cy.updateRolesForUserApi(user.userId, testData.roleIds);
      }
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
    Users.deleteViaApi(user.userId);
    // delete inventory instance both from inventory and LDE modules
    // this might change later once corresponding instance will automatically get deleted in linked-data
    InventoryInstances.deleteFullInstancesByTitleViaApi(resourceData.title);
    Work.getInstancesByTitle(testData.uniqueDuplicateTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === testData.uniqueDuplicateTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    Work.getIdByTitle(testData.uniqueDuplicateTitle).then((id) => Work.deleteById(id));
  });

  beforeEach('Apply test data manually', () => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
      authRefresh: true,
    });
    // create test data based on uploaded marc file
    LinkedDataEditor.createTestWorkDataManuallyBasedOnMarcUpload(resourceData.title);
  });

  it(
    'C656342 [User journey] LDE - Cancel without saving (Yes/No) (citation)',
    { tags: ['criticalPath', 'citation', 'C656342', 'linked-data-editor'] },
    () => {
      // select advanced search option
      SearchAndFilter.selectAdvancedSearch();
      AdvancedSearch.waitLoading();
      // advanced search by title AND publisher
      AdvancedSearch.setCondition(
        1,
        '',
        resourceData.title,
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
      LinkedDataEditor.waitLoading();

      // TODO: uncomment once UILD-170 implemented
      // SearchAndFilter.selectAdvancedSearch();
      // AdvancedSearch.waitLoading();
      // // advanced search by title OR publisher
      // AdvancedSearch.setCondition(
      //   1,
      //   '',
      //   'Cypress test',
      //   LDE_ADVANCED_SEARCH_OPTIONS.CONTAINS_ALL,
      //   LDE_SEARCH_OPTIONS.TITLE,
      // );
      // AdvancedSearch.setCondition(
      //   2,
      //   LDE_ADVANCED_SEARCH_CONDITIONS.OR,
      //   'Nicholas',
      //   LDE_ADVANCED_SEARCH_OPTIONS.CONTAINS_ALL,
      //   LDE_SEARCH_OPTIONS.CONTRIBUTOR,
      // );
      // AdvancedSearch.clickSearch();

      // as for now - search by title
      SearchAndFilter.searchResourceByTitle(resourceData.title);
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

      // check that value was changed
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      EditResource.checkTextValueOnField(testData.uniqueDuplicateTitle, instanceMainTitleField);
    },
  );
});
