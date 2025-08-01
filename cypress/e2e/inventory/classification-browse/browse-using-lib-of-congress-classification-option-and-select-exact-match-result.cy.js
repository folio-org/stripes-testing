import {
  DEFAULT_JOB_PROFILE_NAMES,
  CLASSIFICATION_IDENTIFIER_TYPES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Library of Congress classification',
      searchQuery: 'N332.G33 B443913 2018',
      instanceTitle:
        'C468140 The spirit of the Bauhaus / texts, Raphaèle Billé, Monique Blanc, Marie-Sophie Carron de la Carrière, Louise Curtis, Nicholas Fox Weber, Olivier Gabet, Jean-Louis Gaillemin, Anne Monier, Béatrice Quette ; translated from the French by Ruth Sharman.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468140.mrc',
      fileName: `testMarcFileC468140.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(testData.searchQuery);
      BrowseClassifications.verifyResultAndItsRow(5, testData.searchQuery);
      BrowseClassifications.verifyValueInResultTableIsHighlighted(testData.searchQuery);
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '1');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468140*');

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        cy.getUserToken(userProperties.username, userProperties.password);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });
      });

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
          testData.classificationBrowseId,
        ).then((types) => {
          testData.originalTypes = types;
        });
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [CLASSIFICATION_IDENTIFIER_TYPES.LC],
        );

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.searchQuery,
          testData.classificationBrowseId,
        );
      });
    });

    after(() => {
      cy.getAdminToken();
      // restore the original identifier types for target classification browse
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        testData.originalTypes,
      );
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.preconditionUserId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C794533 Select exact match result in Classification browse result list by "Library of Congress classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794533'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        InventorySearchAndFilter.browseSearch(testData.searchQuery);
        verifySearchResult();
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          'classifications.classificationNumber=="N332.G33 B443913 2018"',
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });
});
