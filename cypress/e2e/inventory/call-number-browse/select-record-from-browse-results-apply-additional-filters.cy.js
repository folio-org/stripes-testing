import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import {
  BROWSE_CALL_NUMBER_OPTIONS,
  INSTANCE_SOURCE_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C396374_FolioInstance_${randomPostfix}`;
    const instance1Title = `${instanceTitlePrefix}_1_English`;
    const instance2Title = `${instanceTitlePrefix}_2_English`;
    const instance3Title = `${instanceTitlePrefix}_3_German`;
    // All 3 instances share this exact Contributor/Subject/Call number text, so the "Number of
    // titles" counters below are deterministic regardless of whatever else exists on the tenant.
    // Instances 1 & 2 are English - instance 3 is German, so selecting the "English" language
    // filter (plus "FOLIO" source, which matches all 3 anyway) deterministically narrows the
    // result count from 3 to 2 at every one of the 3 browse facets below
    const contributorValue = `C396374_Contributor_${randomPostfix}`;
    const subjectValue = `C396374_Subject_${randomPostfix}`;
    const callNumberValue = `AT_C396374_CN_${getRandomLetters(6)}`;
    const contributorSearchOption = searchInstancesOptions[1]; // Contributor
    const subjectSearchOption = searchInstancesOptions[12]; // Subject
    const callNumberSearchQuery = `itemFullCallNumbers="${callNumberValue}"`;
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C396374_');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          testData.contributorNameTypeId = contributorNameTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.location = location;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });
      }).then(() => {
        const createInstance = (title, language) => {
          return InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title,
              instanceTypeId: testData.instanceTypeId,
              languages: [language],
              contributors: [
                {
                  name: contributorValue,
                  contributorNameTypeId: testData.contributorNameTypeId,
                  contributorTypeText: '',
                  primary: false,
                },
              ],
              subjects: [{ value: subjectValue }],
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.location.id,
              },
            ],
            items: [
              {
                itemLevelCallNumber: callNumberValue,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
        };

        createInstance(instance1Title, 'eng');
        createInstance(instance2Title, 'eng');
        createInstance(instance3Title, 'ger');

        cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUser) => {
          testData.user = createdUser;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
    });

    it(
      'C396374 "Browse" - select any record in results list - apply additional filters to "Search" results (promin)',
      { tags: ['extendedPath', 'promin', 'C396374'] },
      () => {
        // Step 1: select "Contributors" in the Browse dropdown
        InventorySearchAndFilter.selectBrowseContributors();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();

        // Step 2: search the Browse list by the shared Contributor value
        BrowseContributors.waitForContributorToAppear(contributorValue, true, false, 1, 3);
        InventorySearchAndFilter.fillInBrowseSearch(contributorValue);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(contributorValue);
        InventorySearchAndFilter.clickSearch();
        BrowseContributors.checkSearchResultRecord(contributorValue);
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(contributorValue, 3);

        // Step 3: click the Contributor row - redirects to Search with that query, 3 records
        BrowseSubjects.selectRecordByTitle(contributorValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          contributorSearchOption,
          contributorValue,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(3);
        InventoryInstances.checkSearchResultCount(/3 records found/);

        // Step 4: applying Language=English + Source=FOLIO narrows 3 -> 2 (instance 3 is German)
        InventorySearchAndFilter.byLanguage();
        InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
        InventorySearchAndFilter.verifyNumberOfSearchResults(2);
        InventoryInstances.checkSearchResultCount(/2 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);

        // Step 5: back to Browse - select "Subjects"
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();

        // Step 6: search the Browse list by the shared Subject value
        BrowseSubjects.waitForSubjectToAppear(subjectValue, true, false, { numberOfTitles: 3 });
        InventorySearchAndFilter.fillInBrowseSearch(subjectValue);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(subjectValue);
        InventorySearchAndFilter.clickSearch();
        BrowseSubjects.checkValueIsBold(subjectValue);
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(subjectValue, 3);

        // Step 7: click the Subject row - redirects to Search with that query, 3 records
        BrowseSubjects.selectRecordByTitle(subjectValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchOptionAndQuery(subjectSearchOption, subjectValue);
        InventorySearchAndFilter.verifyNumberOfSearchResults(3);
        InventoryInstances.checkSearchResultCount(/3 records found/);

        // Step 8: applying Language=English + Source=FOLIO narrows 3 -> 2
        InventorySearchAndFilter.byLanguage();
        InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
        InventorySearchAndFilter.verifyNumberOfSearchResults(2);
        InventoryInstances.checkSearchResultCount(/2 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);

        // Step 9: back to Browse - select "Call numbers (all)"
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        InventorySearchAndFilter.validateBrowseToggleIsSelected();

        // Step 10: search the Browse list by the shared Call number value
        BrowseCallNumber.waitForCallNumberToAppear(callNumberValue, true, undefined, 3);
        InventorySearchAndFilter.browseSearch(callNumberValue);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, '3');

        // Step 11: click the Call number row - redirects to Search with that query, 3 records
        BrowseCallNumber.clickOnResult(callNumberValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchOptionAndQuery('Query search', callNumberSearchQuery);
        InventorySearchAndFilter.verifyNumberOfSearchResults(3);
        InventoryInstances.checkSearchResultCount(/3 records found/);

        // Step 12: applying Language=English + Source=FOLIO narrows 3 -> 2
        InventorySearchAndFilter.byLanguage();
        InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
        InventorySearchAndFilter.verifyNumberOfSearchResults(2);
        InventoryInstances.checkSearchResultCount(/2 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);
      },
    );
  });
});
