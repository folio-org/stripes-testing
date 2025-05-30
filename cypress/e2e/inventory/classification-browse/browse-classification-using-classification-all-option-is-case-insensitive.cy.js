import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const testData = {
      classificationOption: 'Classification (all)',
      searchQueries: ['HD1691 .I5 1967', 'hd1691 .i5 1967'],
      searchResults: ['hd1691 .i5 1967', 'HD1691 .I5 1967'],
      instanceTitles: [
        'C468255 Search by Classification (case insensitive check) Instance 3 - LC UPPER case',
        'C468255 Search by Classification (case insensitive check) Instance 4 - LC lower case',
      ],
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468255.mrc',
      fileName: `testMarcFileC468255.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468255*');

      // remove all identifier types from target classification browse, if any
      ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
        testData.classificationBrowseId,
      ).then((types) => {
        testData.originalTypes = types;
      });
      ClassificationBrowse.updateIdentifierTypesAPI(
        testData.classificationBrowseId,
        testData.classificationBrowseAlgorithm,
        [],
      );

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

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
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
      'C468255 Browse for classification using "Classification (all)" option is case-insensitive (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468255'] },
      () => {
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.searchResults[0],
          testData.classificationBrowseId,
        );
        testData.searchQueries.forEach((query) => {
          InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
          InventorySearchAndFilter.browseSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResultIncludingValue(expectedResult);
          });
        });
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchResults[0]);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
          'classifications.classificationNumber=="hd1691 .i5 1967"',
        );
        testData.instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifyInstanceDisplayed(title);
        });
      },
    );
  });
});
