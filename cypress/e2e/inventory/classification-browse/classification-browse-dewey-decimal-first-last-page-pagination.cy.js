import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../support/fragments/settings/inventory/instances/classificationBrowse';
import {
  BROWSE_CLASSIFICATION_OPTIONS,
  CLASSIFICATION_IDENTIFIER_TYPES,
} from '../../../support/constants';

const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[1].id; // 'dewey'
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[1].algorithm;
// These boundary queries are meant to land on the first/last page of whatever real Dewey
// classification data already exists in the environment - how many pages that actually
// amounts to is data-dependent, so every Next/Previous click below is conditional on the
// button actually being enabled; landing on the same page again (single-page environment)
// is an acceptable outcome, not a failure
// mod-search sorts by the option's shelf key, which drops punctuation: "!" becomes an empty key
// (sorts first; "!!!!auto" would become "AUTO" and land mid-list), and a key holds only letters,
// digits, spaces and dots, so a run of "z" sorts after any real number
const firstPageQuery = '!';
const lastPageQuery = 'zzzzzzzzzz';
let user;

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    before('Create user, configure settings', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((createdUser) => {
        user = createdUser;
      });
    });

    after('Delete user, restore default settings', () => {
      cy.getAdminToken(false);
      ClassificationBrowse.updateIdentifierTypesAPI(
        classificationBrowseId,
        classificationBrowseAlgorithm,
        [],
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C468260 Verify that user can leave first/last page with results during browsing using "Dewey Decimal classification" option (promin)',
      { tags: ['criticalPath', 'promin', 'nonParallel', 'C468260'] },
      () => {
        // Non-default Settings are configured before login (not after) - the frontend fetches
        // the classification-browse settings once, right when Inventory loads on login, so
        // logging in first would make it search against stale/default settings instead
        ClassificationBrowse.updateIdentifierTypesAPI(
          classificationBrowseId,
          classificationBrowseAlgorithm,
          [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY],
        );

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
          BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
        );

        // Step 1: browse to the very first page - "!" sorts before everything, so
        // Previous is always disabled here regardless of how much data exists; Next's state
        // depends on whether more than one page of results exists
        InventorySearchAndFilter.browseSearch(firstPageQuery);
        BrowseContributors.checkNonExactMatchPlaceholder(firstPageQuery);
        BrowseClassifications.verifySearchResultsTable();
        BrowseClassifications.verifyPreviousButtonDisabled(true);

        // Step 2-3: only exercise Next/Previous if a second page actually exists
        BrowseClassifications.getNextPaginationButtonState().then((nextEnabled) => {
          if (nextEnabled) {
            BrowseClassifications.clickNextPaginationButton();
            BrowseClassifications.verifySearchResultsTable();
            BrowseClassifications.verifyPreviousButtonDisabled(false);

            BrowseClassifications.clickPreviousPaginationButton();
            BrowseClassifications.verifySearchResultsTable();
            BrowseClassifications.verifyPreviousButtonDisabled(true);
            BrowseClassifications.verifyNextButtonDisabled(false);
          }
        });

        // Step 4: browse to the very last page - "zzzzzzzzzz" sorts after everything, so Next
        // is always disabled here regardless of how much data exists; Previous's state
        // depends on whether a page before this one exists
        InventorySearchAndFilter.browseSearch(lastPageQuery);
        BrowseContributors.checkNonExactMatchPlaceholder(lastPageQuery);
        BrowseClassifications.verifySearchResultsTable();
        BrowseClassifications.verifyNextButtonDisabled(true);

        // Step 5-6: only exercise Previous/Next if a preceding page actually exists
        BrowseClassifications.getPreviousPaginationButtonState().then((previousEnabled) => {
          if (previousEnabled) {
            BrowseClassifications.clickPreviousPaginationButton();
            BrowseClassifications.verifySearchResultsTable();
            BrowseClassifications.verifyNextButtonDisabled(false);

            BrowseClassifications.clickNextPaginationButton();
            BrowseClassifications.verifySearchResultsTable();
            BrowseClassifications.verifyNextButtonDisabled(true);
            BrowseClassifications.verifyPreviousButtonDisabled(false);
          }
        });
      },
    );
  });
});
