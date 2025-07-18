import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import { BROWSE_CLASSIFICATION_OPTIONS } from '../../../support/constants';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

const allBrowseId = defaultClassificationBrowseIdsAlgorithms[0].id;
const allBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[0].algorithm;
const nonExistingNumber = `000.${randomFourDigitNumber()}${randomFourDigitNumber()}C468246`;
let user;
let existingNumber;

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    before('Create user, reset types', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((createdUser) => {
        user = createdUser;
        // Set browse option to default (no types)
        ClassificationBrowse.updateIdentifierTypesAPI(allBrowseId, allBrowseAlgorithm, []);
      });
      BrowseClassifications.getClassificationNumbersViaApi(allBrowseId, nonExistingNumber).then(
        (response) => {
          existingNumber = response.body.items[0].classificationNumber;
        },
      );
    });

    after('Delete user and instances, reset types', () => {
      cy.getAdminToken();
      ClassificationBrowse.updateIdentifierTypesAPI(allBrowseId, allBrowseAlgorithm, []);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468247 Check alphabetical sorting during browsing for Classification using "Classification (all)" option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C468247'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
        );
        InventorySearchAndFilter.checkBrowseOptionSelected(
          BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
        );
        InventorySearchAndFilter.browseSearch(nonExistingNumber);
        BrowseClassifications.verifySearchResultsTable();
        BrowseCallNumber.checkNonExactSearchResult(nonExistingNumber);
        InventorySearchAndFilter.checkAllValuesInColumnSorted(0);
        BrowseClassifications.checkPaginationButtonsShown();
        BrowseClassifications.getNextPaginationButtonState().then((isEnabled) => {
          if (isEnabled) {
            BrowseClassifications.clickNextPaginationButton();
            BrowseClassifications.verifySearchResultsTable();
            InventorySearchAndFilter.checkAllValuesInColumnSorted(0);
          }
          InventorySearchAndFilter.browseSearch(existingNumber);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(existingNumber);
          InventorySearchAndFilter.checkAllValuesInColumnSorted(0);
        });
      },
    );
  });
});
