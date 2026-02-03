import permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const item = {
      instanceName: `AT_C414511_FolioInstance_${randomPostfix}`,
      itemBarcode: randomPostfix,
      itemCallNumber: `AT_C414511_CallNumber_${randomPostfix}`,
    };
    const queries = ['r', 's'];

    let instanceId;
    let user;

    before('Creating user, test data', () => {
      cy.getAdminToken();
      queries.forEach((query) => {
        InventoryInstances.deleteFullInstancesWithCallNumber({ type: 'all', value: query });
      });

      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
          undefined,
          undefined,
          item.itemCallNumber,
        );

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
          authRefresh: true,
        });
        BrowseCallNumber.clickBrowseBtn();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
      });
    });

    after('Deleting user, test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C414511 Browse for Call number with browse query which contain only 1 letter (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C414511'] },
      () => {
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.checkBrowseOptionSelected(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(item.itemCallNumber);
        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.toggleAccordionByName('Shared');
          InventorySearchAndFilter.selectOptionInExpandedFilter('Shared', 'No');
        });

        queries.forEach((query) => {
          InventorySearchAndFilter.fillInBrowseSearch(query);
          InventorySearchAndFilter.checkSearchButtonEnabled();

          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.checkNonExactSearchResult(query);
          BrowseCallNumber.checkSearchResultsTable();
        });
      },
    );
  });
});
