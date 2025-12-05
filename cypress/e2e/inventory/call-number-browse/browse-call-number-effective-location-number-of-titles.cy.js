import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C651497_FolioInstance_${randomPostfix}`,
      callNumber: `AT_C651497_CallNumber_${randomPostfix}`,
      contributor: `AT_C651497_Contributor_${randomPostfix}`,
      contributorsOption: 'Contributors',
    };
    const instanceTitles = [
      `${testData.instanceTitlePrefix}_1`,
      `${testData.instanceTitlePrefix}_2`,
    ];
    const locations = [];
    let instanceTypeId;
    let holdingTypeId;
    let loanTypeId;
    let materialTypeId;
    let contributorNameTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C651497');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({ limit: 2, query: '(isActive=true and name<>"AT_*")' }).then(() => {
          locations.push(...Cypress.env('locations'));
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
          materialTypeId = matType.id;
        });
        BrowseContributors.getContributorNameTypes().then((nameTypes) => {
          contributorNameTypeId = nameTypes[0].id;
        });
      })
        .then(() => {
          instanceTitles.forEach((instanceTitle, index) => {
            const recordData = {
              instance: {
                instanceTypeId,
                title: instanceTitle,
                contributors: [
                  {
                    name: testData.contributor,
                    contributorNameTypeId,
                  },
                ],
              },
              holdings: [
                {
                  holdingsTypeId: holdingTypeId,
                  permanentLocationId: locations[index].id,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                  itemLevelCallNumber: testData.callNumber,
                },
              ],
            };
            InventoryInstances.createFolioInstanceViaApi(recordData).then(() => {
              cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
                user = userProperties;
              });
            });
          });
        })
        .then(() => {
          // Making sure the default settings are set
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            callNumberTypes: [],
          });

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.verifyKeywordsAsDefault();

          InventorySearchAndFilter.selectBrowseCallNumbers();
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitlePrefix);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C651497 Apply “Effective location (item)” to browse result list and check "Number of titles" count (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C651497'] },
      () => {
        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumber, undefined, undefined, 2);
        BrowseContributors.waitForContributorToAppear(testData.contributor);

        BrowseContributors.browse(testData.callNumber);
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumber);
        BrowseCallNumber.checkNumberOfTitlesForRow(testData.callNumber, 2);
        BrowseCallNumber.checkValuePresentForRow(testData.callNumber, 1, '');

        cy.intercept('GET', '**/browse/call-numbers/**').as('getRecords');
        InventorySearchAndFilter.byEffectiveLocation(locations[0].name);
        cy.wait('@getRecords');
        // wait for results list to rebuild after applying filter
        cy.wait(2000);
        BrowseCallNumber.valueInResultTableIsHighlighted(testData.callNumber);
        BrowseCallNumber.checkNumberOfTitlesForRow(testData.callNumber, 1);
        BrowseCallNumber.checkValuePresentForRow(testData.callNumber, 1, instanceTitles[0]);

        BrowseContributors.select();
        BrowseContributors.browse(testData.contributor);
        BrowseContributors.checkSearchResultsTable();
        BrowseContributors.checkSearchResultRecord(testData.contributor);

        BrowseContributors.openInstance({ name: testData.contributor });
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

        InventorySearchAndFilter.switchToBrowseTab();
        BrowseContributors.checkSearchResultsTable();
        BrowseContributors.checkSearchResultRecord(testData.contributor);
        InventorySearchAndFilter.checkBrowseOptionSelected(testData.contributorsOption);
      },
    );
  });
});
