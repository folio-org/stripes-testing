import { DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import DataImport from '../../support/fragments/data_import/dataImport';
import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('Citation: Search Linked data resources', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C451572 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C451572 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
  };

  //   const resourceData = {
  //     creator: testData.uniqueCreator,
  //     language: 'spa',
  //     classificationNumber: 'PC4112',
  //     title: `${testData.uniqueTitle} TT test35 cultural approach to intermediate Spanish tk1 /`,
  //     isbnIdentifier: testData.uniqueIsbn,
  //     lccnIdentifier: 'aa1994901234',
  //     publisher: 'Scott, Foresman, test',
  //     publicationDate: '2024',
  //   };

  before('Create test data', () => {
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
      query: `title="${testData.uniqueInstanceTitle}"`,
    }).then((id) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
    });
    Work.getInstancesByTitle(testData.uniqueInstanceTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === testData.uniqueInstanceTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
  });

  beforeEach(() => {
    cy.loginAsAdmin({
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitLoading,
    });
  });

  it(
    'Cxxxx [User journey] LDE - Edit existing resource | create MARC derived record',
    { tags: ['draft', 'citation', 'linked-data-editor'] },
    () => {
      InventoryInstances.searchByTitle(testData.uniqueTitle);
    },
  );
});
