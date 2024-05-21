import { DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import DataImport from '../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import SearchAndFilter from '../../support/fragments/marvaEditor/searchAndFilter';
import TopMenu from '../../support/fragments/topMenu';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Citation', () => {
  describe('Marva Search', () => {
    const testData = {
      marcFilePath: 'marcBibFileForC451572.mrc',
      modifiedMarcFile: `C451572 editedMarcFile${getRandomPostfix()}.mrc`,
      marcFileName: `C451572 marcFile${getRandomPostfix()}.mrc`,
      uniqueTitle: `!A Alice's Adventures in Wonderland${getRandomPostfix()}`,
    };
    const resourceData = {
      creator: 'Neale-Silva, Eduardo',
      language: 'spa',
      classificationNumber: '468.2/421 class_number',
      title: `${testData.uniqueTitle} tt 9 TT test35 cultural approach to intermediate Spanish tk1 /`,
      isbnIdentifier: '123456789123456',
      lccnIdentifier: '80021016',
      publisher: 'Publisher Name',
      publicationDate: '2024',
    };

    before('Create test data', () => {
      // need to change title to unique for searching
      DataImport.editMarcFile(
        testData.marcFilePath,
        testData.modifiedMarcFile,
        ["!A Alice's Adventures in Wonderland"],
        [testData.uniqueTitle],
      );
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.modifiedMarcFile,
        testData.marcFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      );

      cy.loginAsAdmin();
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        // query: `title="!A Alice's Adventures in Wonderland783.6502416094969857 TT test35 cultural approach to intermediate Spanish tk1 / Eduardo Neale-Silva and Robert L. Nicholas SOR"`
        // ${testData.uniqueTitle} TT test35 cultural approach to intermediate Spanish tk1 / Eduardo Neale-Silva and Robert L. Nicholas SOR"`
      }).then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C451572 Marva Search: Basic search and search results (citation)',
      { tags: ['draft', 'citation'] },
      () => {
        cy.visit(TopMenu.marvaEditorPath);
        SearchAndFilter.waitLoading();
        SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
        SearchAndFilter.verifySearchResult(resourceData);
      },
    );
  });
});
