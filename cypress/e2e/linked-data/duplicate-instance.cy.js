import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import Marigold from '../../support/fragments/linked-data/marigold';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import {
  APPLICATION_NAMES,
  LOCATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  LDE_ROLES,
} from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('Citation: duplicate resource', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C624280 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C624280 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    callNumber: '331.2',
    roleIds: [],
    workId: null,
    instanceId: null,
    duplicateInstanceId: null,
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
    if (testData.duplicateInstanceId) Work.deleteInstanceViaApi(testData.duplicateInstanceId);
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach('Apply test data manually', () => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
      authRefresh: true,
    });
    // create test data based on uploaded marc file and capture IDs for cleanup
    Marigold.createTestWorkDataWithIds(resourceData.title).then(({ workId, instanceId }) => {
      testData.workId = workId;
      testData.instanceId = instanceId;
    });
  });

  it(
    'C624280 [User journey] Marigold - Create new instance by duplicating existing Instance plus holdings (citation)',
    { tags: ['criticalPath', 'citation', 'C624280', 'marigold', 'shiftLeft'] },
    () => {
      // search by title for work created in precondition
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      // open instance for editing
      Marigold.editInstanceFromSearchTable(1, 1);
      // duplicate instance
      EditResource.duplicateInstance();
      // check duplicated instance has 'Monographs' profile same as original instance
      EditResource.checkHeadingProfile('Monographs');
      EditResource.setValueForTheField(testData.uniqueInstanceTitle, 'Main Title');
      EditResource.clearField('Other Title Information');
      EditResource.setValueForTheField(Marigold.generateValidLccn(), 'LCCN');
      EditResource.saveAndCloseNewInstanceWithId().then((duplicateInstanceId) => {
        testData.duplicateInstanceId = duplicateInstanceId;
      });
      // wait for LDE page to be displayed
      Marigold.waitLoading();
      // search work by instance title
      SearchAndFilter.searchResourceByTitle(testData.uniqueInstanceTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueInstanceTitle);
      // navigate to the inventory module
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
      // Add holdings
      cy.wait(3000);
      const HoldingsRecordEdit = InventoryInstance.pressAddHoldingsButton();
      cy.wait(2000);
      HoldingsRecordEdit.fillHoldingFields({
        permanentLocation: LOCATION_NAMES.ANNEX,
        callNumber: testData.callNumber,
      });
      HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
      cy.reload(true);
      InventoryInstance.checkHoldingsTableContent({
        name: LOCATION_NAMES.ANNEX_UI,
      });
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
    },
  );
});
