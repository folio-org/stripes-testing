import {
  DEFAULT_JOB_PROFILE_NAMES,
  INSTANCE_SOURCE_NAMES,
  LDE_ROLES,
} from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../support/fragments/users/users';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('Citation: LDE permissions', () => {
  const testData = {
    // MARC file with 'integrating resource' mode of issuance
    marcFilePath: 'marcBibFileIntegrationResource.mrc',
    modifiedMarcFile: `C651426 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C651426 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    resourceIdentifiers: [
      { type: 'ISBN', value: '1587657090' },
      { type: 'ISBN', value: '9781587657092' },
    ],
    roleIds: [],
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
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueTitle);
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventorySearchAndFilter.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C651426 [User journey] LDE - non-monograph format (citation)',
    { tags: ['criticalPath', 'citation', 'C651426', 'linked-data-editor', 'shiftLeft'] },
    () => {
      // search inventory instance and limit search to MARC type
      InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.MARC);
      InventoryInstances.searchByTitle(testData.uniqueTitle);
      // 'Edit in LDE' not displayed since format is non-monograph
      InventoryInstance.checkEditInstanceInLdeButtonNotDisplayed();
    },
  );
});
