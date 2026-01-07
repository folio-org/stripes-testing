import TopMenu from '../../support/fragments/topMenu';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';

describe('Citation: LDE permissions', () => {
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
    // delete inventory instance both from inventory and LDE modules
    // this might change later once corresponding instance will automatically get deleted in linked-data
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueTitle);
    Users.deleteViaApi(testData.user.userId);
  });

  beforeEach(() => {
    // create user with inventory permission but without LDE permissions
    cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
      testData.user = userProperties;
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });
  });

  it(
    'C651425 [User journey] LDE - no LDE permissions for the User (citation)',
    { tags: ['criticalPath', 'citation', 'C651425', 'linked-data-editor', 'shiftLeft'] },
    () => {
      // search inventory instance
      InventoryInstances.searchByTitle(testData.uniqueTitle);
      // 'Edit in LDE' not displayed
      InventoryInstance.checkEditInstanceInLdeButtonNotDisplayed();
    },
  );
});
