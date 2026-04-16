import TopMenu from '../../support/fragments/topMenu';
import Marigold from '../../support/fragments/linked-data/marigold';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import Work from '../../support/fragments/linked-data/work';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import {
  APPLICATION_NAMES,
  LDE_ROLES,
  DEFAULT_JOB_PROFILE_NAMES,
  EDIT_RESOURCE_HEADINGS,
} from '../../support/constants';
import EditResource from '../../support/fragments/linked-data/editResource';
import WorkProfileModal from '../../support/fragments/linked-data/workProfileModal';
import Users from '../../support/fragments/users/users';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('Citation: check navigation', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C451572 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C451572 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    roleIds: [],
    workId: null,
    instanceId: null,
    inventoryId: null,
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
    // delete LDE instance first, then work
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    if (testData.inventoryId) Work.deleteInventoryInstanceViaApi(testData.inventoryId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach('Apply test data manually', () => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
      authRefresh: true,
    });
    // create test data based on uploaded marc file and capture IDs for cleanup
    Marigold.createTestWorkDataWithIds(resourceData.title).then(
      ({ workId, instanceId, inventoryId }) => {
        testData.workId = workId;
        testData.instanceId = instanceId;
        testData.inventoryId = inventoryId;
      },
    );
  });

  it(
    'C491276 Marigold: Verify user is navigated to Marigold home page when Application header icon is clicked (citation)',
    { tags: ['smoke', 'citation', 'C491276', 'marigold', 'shiftLeft'] },
    () => {
      // check search is displayed with lccn option
      Marigold.checkSearchOptionIsDisplayed('lccn');
      // open new resource form
      Marigold.openNewResourceForm();
      // check that modal is displayed
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      // navigate back to the main module
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARIGOLD);
      Marigold.waitLoading();
      // search by any title
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      // open work
      Marigold.selectFromSearchTable(1);
      // navigate back to the main module
      Marigold.selectModuleMainHeading();
      Marigold.waitLoading();
      Marigold.checkSearchOptionIsDisplayed('title');
    },
  );
});
