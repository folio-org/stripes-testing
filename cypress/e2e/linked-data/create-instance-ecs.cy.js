import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES, LDE_ROLES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Permissions from '../../support/dictionary/permissions';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import NewInstance from '../../support/fragments/linked-data/newInstance';
import InstanceProfileModal from '../../support/fragments/linked-data/instanceProfileModal';
import Users from '../../support/fragments/users/users';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('Citation: create instance in central tenant + holdings in member', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C736677 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C736677 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    callNumber: '331.2',
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

    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      user = userProperties;
    });

    cy.then(() => {
      if (testData.roleIds.length > 0) {
        cy.updateRolesForUserApi(user.userId, testData.roleIds);
      }

      // Assign affiliation to member tenant and set permissions
      cy.assignAffiliationToUser(Affiliations.College, user.userId);
      cy.setTenant(Affiliations.College);
      cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
      cy.resetTenant();
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
    // ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
    // create test data based on uploaded marc file
    LinkedDataEditor.createTestWorkDataManuallyBasedOnMarcUpload(resourceData.title);
  });

  it(
    'C736677 [User journey] LDE - Create new instance in central tenant (citation)',
    { tags: ['criticalPathECS', 'citation', 'linked-data-editor', 'C736677'] },
    () => {
      // search by title for work created in precondition
      SearchAndFilter.searchResourceByTitle(resourceData.title);
      // open work for editing
      LinkedDataEditor.selectFromSearchTable(1);
      LinkedDataEditor.editWork();
      EditResource.waitLoading();
      // add new instance
      EditResource.openNewInstanceFormViaActions();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      NewInstance.addInstanceIdentifiers(testData);
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // switch to member tenant
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      // search for newly added instance
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle, false);
      InventorySearchAndFilter.verifyNoRecordsFound();
    },
  );
});
