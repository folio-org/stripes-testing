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
      instanceTitle: `AT_C466213_Instance_${randomPostfix}`,
    };
    const callNumbers = [
      'N4662.R13 G46 2213',
      '621.3',
      'WA 466.2 B1346 2213',
      'Y4.F66/2:Af1/33/rev.',
      'GROUP Autotest',
    ];
    const queriesC477647 = [
      'N4662.R13 G46 2212',
      '621.29999',
      'WA 466.2 B1346 2212',
      'Y4.F66/2:Af1/32/rev.',
      'GROUP Autotest A.',
    ];
    let instanceTypeId;
    let locationId;
    let holdingTypeId;
    let loanTypeId;
    let materialTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C466213');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationId = res.id;
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
      }).then(() => {
        const recordData = {
          instance: {
            instanceTypeId,
            title: testData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: holdingTypeId,
              permanentLocationId: locationId,
            },
          ],
          items: [],
        };
        callNumbers.forEach((callNumber) => {
          recordData.items.push({
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: loanTypeId },
            materialType: { id: materialTypeId },
            itemLevelCallNumber: callNumber,
          });
        });
        InventoryInstances.createFolioInstanceViaApi(recordData).then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;

            // Making sure the default settings are set
            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
              callNumberTypes: [],
            });
          });
        });
      });
    });

    beforeEach('Login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
        authRefresh: true,
      });
      InventorySearchAndFilter.switchToBrowseTab();
      InventorySearchAndFilter.verifyKeywordsAsDefault();

      InventorySearchAndFilter.selectBrowseCallNumbers();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C466213 Browse for call numbers which are in format which matches to some CN but without call number type specified using exact match query and "Call numbers (all)" browse option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C466213'] },
      () => {
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber);

          BrowseContributors.browse(callNumber);
          BrowseCallNumber.checkSearchResultsTable();
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumber);
        });
      },
    );

    it(
      'C477647 Browse for call numbers which are in format which matches to some CN but without call number type specified using non-exact match query and "Call numbers (all)" browse option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C477647'] },
      () => {
        queriesC477647.forEach((query, index) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumbers[index]);

          BrowseContributors.browse(query);
          BrowseCallNumber.checkSearchResultsTable();
          BrowseCallNumber.checkNotExistingCallNumber(query);
          BrowseCallNumber.checkValuePresentInResults(callNumbers[index]);
        });
      },
    );
  });
});
