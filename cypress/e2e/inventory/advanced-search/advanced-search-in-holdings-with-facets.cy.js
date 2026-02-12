import { ITEM_STATUS_NAMES, ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C409422_FolioInstance_${randomPostfix}`;
    const callNumberValue = `AT_C409422_CallNumber_${randomPostfix}`;
    const advSearchOption = 'Advanced search';
    const callNumberAdvSearchOption = 'Call number, normalized';
    const locationAccordionName = 'Effective location (item)';
    const instanceTitles = Array.from({ length: 2 }, (_, i) => `${instanceTitlePrefix}_${i}`);

    let instanceTypeId;
    let holdingsTypeId;
    let materialTypeId;
    const locations = [];
    let loanTypeId;
    let user;

    before('Create users, data', () => {
      cy.getAdminToken();

      cy.then(() => {
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C409422');

        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          holdingsTypeId = res[0].id;
        });
        cy.getLocations({ limit: 2, query: '(isActive=true and name<>"AT_*")' }).then(() => {
          locations.push(...Cypress.env('locations'));
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
          materialTypeId = matType.id;
        });
      })
        .then(() => {
          instanceTitles.forEach((title, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title,
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId: locations[index].id,
                  callNumber: callNumberValue,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                },
              ],
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C409422 Search Holdings using advanced search in combination with search facets (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C409422'] },
      () => {
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          callNumberValue,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          callNumberAdvSearchOption,
        );
        InventoryInstances.checkAdvSearchModalValues(
          0,
          callNumberValue,
          ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
          callNumberAdvSearchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();
        InventoryInstances.verifySelectedSearchOption(advSearchOption);
        instanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });
        InventorySearchAndFilter.checkRowsCount(instanceTitles.length);

        InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
        locations.forEach((location) => {
          InventorySearchAndFilter.verifyOptionAvailableMultiselect(
            locationAccordionName,
            location.name,
          );
        });
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationAccordionName,
          locations[0].name,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);

        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationAccordionName,
          locations[0].name,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationAccordionName,
          locations[1].name,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
      },
    );
  });
});
