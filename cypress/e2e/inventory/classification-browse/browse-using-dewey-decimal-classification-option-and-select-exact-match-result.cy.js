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
      classificationOption: 'Dewey Decimal classification',
      querySearchOption: 'Query search',
      searchQuery: '974.7004975542468141',
      instanceTitle:
        'C468141 Stories of Oka : land, film, and literature / Isabelle St-Amand ; translated by S.E. Stewart.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[1].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[1].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468141.mrc',
      fileName: `testMarcFileC468141.${getRandomPostfix()}.mrc`,
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
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('C468141');

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
        })
        .then(() => {
          cy.getAdminToken();
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties2) => {
            testData.user = userProperties2;
          });
          ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
            testData.classificationBrowseId,
          ).then((types) => {
            testData.originalTypes = types;
          });

          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY],
          );
        })
        .then(() => {
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
      'C794532 Select exact match result in Classification browse result list by "Dewey Decimal classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794532'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          testData.classificationOption,
        );
        InventorySearchAndFilter.browseSearch(testData.searchQuery);
        verifySearchResult();
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.searchQuery}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });
});
