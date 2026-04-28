import TopMenu from '../../support/fragments/topMenu';
import {
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import Users from '../../support/fragments/users/users';

const INVENTORY_VIEW_CAPABILITY_SETS = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Instance',
    action: CAPABILITY_ACTIONS.VIEW,
  },
];

describe('Citation: No LDE permissions', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C451572 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C451572 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
    resourceIdentifiers: [
      { type: 'ISBN', value: '1587657090' },
      { type: 'ISBN', value: '9781587657092' },
    ],
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
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueTitle);
    Users.deleteViaApi(testData.user.userId);
  });

  beforeEach(() => {
    // create user with inventory permission but without LDE permissions
    cy.getAdminToken();
    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;
      cy.assignCapabilitiesToExistingUser(testData.user.userId, [], INVENTORY_VIEW_CAPABILITY_SETS);
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });
  });

  it(
    'C651425 [User journey] Marigold - no LDE permissions for the User (citation)',
    { tags: ['criticalPath', 'citation', 'C651425', 'marigold', 'shiftLeft'] },
    () => {
      // search inventory instance
      InventoryInstances.searchByTitle(testData.uniqueTitle);
      // 'Edit in MG' not displayed
      InventoryInstance.checkEditInstanceInMGButtonNotDisplayed();
    },
  );
});
