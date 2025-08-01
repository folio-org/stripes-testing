import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
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
      classificationOption: 'Classification (all)',
      querySearchOption: 'Query search',
      negativeSearchQuery: 'N332.G33 B3 2055',
      positiveSearchQuery: 'N332.G33 B443913 2018',
      instanceTitle:
        'C468142 The spirit of the Bauhaus / texts, Raphaèle Billé, Monique Blanc, Marie-Sophie Carron de la Carrière, Louise Curtis, Nicholas Fox Weber, Olivier Gabet, Jean-Louis Gaillemin, Anne Monier, Béatrice Quette ; translated from the French by Ruth Sharman.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC468142.mrc',
      fileName: `testMarcFileC468142.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };

    const createdRecordIDs = [];

    const verifySearchResult = () => {
      BrowseClassifications.verifySearchResultsTable();
      InventorySearchAndFilter.verifySearchResultIncludingValue(
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyResultAndItsRow(
        5,
        `${testData.negativeSearchQuery}would be here`,
      );
      BrowseClassifications.verifyNumberOfTitlesInRow(5, '');
      BrowseClassifications.verifyRowExists(4);
      BrowseClassifications.verifyRowExists(6);
    };

    before(() => {
      cy.getAdminToken();
      // make sure there are no duplicate records in the system
      InventoryInstances.deleteInstanceByTitleViaApi('C468142*');

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

        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
          InventoryInstances.waitContentLoading();
        }, 20_000);
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
        InventorySearchAndFilter.verifyCallNumberBrowsePane();
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.positiveSearchQuery,
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
      'C794534 Select non-exact match result in Classification browse result list by "Classification (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C794534'] },
      () => {
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        InventorySearchAndFilter.browseSearch(testData.negativeSearchQuery);
        verifySearchResult();
        BrowseClassifications.clickOnSearchResult(`${testData.negativeSearchQuery}would be here`);
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.positiveSearchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          testData.querySearchOption,
          `classifications.classificationNumber=="${testData.positiveSearchQuery}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstances.checkSearchResultCount(/1 record found/);
        InventorySearchAndFilter.switchToBrowseTab();
        verifySearchResult();
      },
    );
  });
});
