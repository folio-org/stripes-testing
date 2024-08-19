import { DEFAULT_JOB_PROFILE_NAMES } from '../../support/constants';
import DataImport from '../../support/fragments/data_import/dataImport';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix, { getRandomLetters } from '../../support/utils/stringTools';

describe('Citation: Search Linked data resources', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC451572.mrc',
    modifiedMarcFile: `C451572 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C451572 marcFile${getRandomPostfix()}.mrc`,
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueIsbn: `ISBN${getRandomLetters(8)}`,
    uniqueCreator: `Creator-${getRandomLetters(10)}`,
  };

  const resourceData = {
    creator: testData.uniqueCreator,
    language: 'spa',
    classificationNumber: 'PC4112',
    title: `${testData.uniqueTitle} TT test35 cultural approach to intermediate Spanish tk1 /`,
    isbnIdentifier: testData.uniqueIsbn,
    lccnIdentifier: '80021016',
    publisher: 'Scott, Foresman, test',
    publicationDate: '2024',
  };

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

    cy.loginAsAdmin();
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
  });

  describe('Linked-data Search', () => {
    it(
      'C451572 Linked-data Search: Basic search by title (citation)',
      { tags: ['draft', 'citation'] },
      () => {
        cy.visit(TopMenu.marvaEditorPath);
        SearchAndFilter.waitLoading();
        SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
        SearchAndFilter.verifySearchResult(resourceData);
      },
    );

    it(
      'C451572 Linked-data Search: Basic search by ISBN (citation)',
      { tags: ['draft', 'citation'] },
      () => {
        cy.visit(TopMenu.marvaEditorPath);
        SearchAndFilter.waitLoading();
        SearchAndFilter.searchResourceByIsbn(testData.uniqueIsbn);
        SearchAndFilter.verifySearchResult(resourceData);
      },
    );

    it(
      'C451572 Linked-data Search: Basic search by Contributor (citation)',
      { tags: ['draft', 'citation'] },
      () => {
        cy.visit(TopMenu.marvaEditorPath);
        SearchAndFilter.waitLoading();
        SearchAndFilter.searchResourceByContributor(testData.uniqueCreator);
        SearchAndFilter.verifySearchResult(resourceData);
      },
    );
  });
});
