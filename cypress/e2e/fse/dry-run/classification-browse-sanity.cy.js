import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    const { user, memberTenant } = parseSanityParameters();
    const testData = {
      classificationOption: 'Classification (all)',
      searchQuery: 'ML466.P323 A3 2018',
      instanceTitle:
        'C466323 My artistic memoirs / Giovanni Pacini ; edited and translated by Stephen Thompson Moore.',
      classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[0].id,
      classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[0].algorithm,
    };

    const marcFile = {
      marc: 'marcBibFileForC466323.mrc',
      fileName: `testMarcFileC466323.${getRandomPostfix()}.mrc`,
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
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false })
        .then(() => {
          InventoryInstances.deleteInstanceByTitleViaApi('C466323*');
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        })
        .then(() => {
          ClassificationBrowse.updateIdentifierTypesAPI(
            testData.classificationBrowseId,
            testData.classificationBrowseAlgorithm,
            [],
          );

          cy.allure().logCommandSteps(false);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          cy.allure().logCommandSteps(true);
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.checkBrowseOptionDropdownInFocus();
          InventorySearchAndFilter.verifyCallNumberBrowsePane();
        });
    });

    after(() => {
      cy.getUserToken(user.username, user.password, { log: false });
      createdRecordIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id, true);
      });
    });

    it(
      'C794531 Select exact match result in Classification browse result list by "Classification (all)" browse option (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C794531'] },
      () => {
        cy.getUserToken(user.username, user.password, { log: false });
        BrowseClassifications.waitForClassificationNumberToAppear(
          testData.searchQuery,
          testData.classificationBrowseId,
        );
        InventorySearchAndFilter.selectBrowseOption(testData.classificationOption);
        InventorySearchAndFilter.browseSearch(testData.searchQuery);
        verifySearchResult();
        InventorySearchAndFilter.selectFoundItemFromBrowse(testData.searchQuery);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          'Query search',
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
