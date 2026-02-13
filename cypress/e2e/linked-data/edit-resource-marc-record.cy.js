import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import {
  INSTANCE_SOURCE_NAMES,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  LDE_ROLES,
} from '../../support/constants';
import EditResource from '../../support/fragments/linked-data/editResource';
import ViewMarc from '../../support/fragments/linked-data/viewMarc';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Work from '../../support/fragments/linked-data/work';
import FileManager from '../../support/utils/fileManager';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('Citation: MARC Authority integration', () => {
  const source = INSTANCE_SOURCE_NAMES.LDE;

  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C627245 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C627245 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    callNumber: '331.2',
    edition: 'test edition',
    roleIds: [],
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
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueInstanceTitle);
    Users.deleteViaApi(user.userId);
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
    'C627245 [User journey] LDE - Edit existing resource | create MARC derived record (citation)',
    { tags: ['criticalPath', 'citation', 'C627245', 'linked-data-editor', 'shiftLeft'] },
    () => {
      // search by title for work created in precondition
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      EditResource.duplicateResource();
      EditResource.setValueForTheField(testData.uniqueInstanceTitle, 'Main Title');
      EditResource.clearField('Other Title Information');
      // generate random valid lccn in order to prevent unique validation error later
      EditResource.setValueForTheField(LinkedDataEditor.generateValidLccn(), 'LCCN');
      EditResource.saveAndClose();
      LinkedDataEditor.waitLoading();
      // navigate to the inventory module
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      // search by LDE source and unique title
      InventoryInstances.searchBySource(source);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      InventoryInstance.editInstanceInLde();
      // edit edition
      EditResource.waitLoading();
      cy.wait(6000);
      EditResource.setEdition(testData.edition);
      EditResource.saveAndKeepEditing();
      EditResource.viewMarc();
      // check changes in MARC
      ViewMarc.waitLoading();
      ViewMarc.checkMarcContainsData(testData.edition);
      ViewMarc.closeMarcView();
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueInstanceTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueInstanceTitle);
      // double check inventory
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      // search by LDE source AND title
      InventoryInstances.searchBySource(source);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
    },
  );
});
