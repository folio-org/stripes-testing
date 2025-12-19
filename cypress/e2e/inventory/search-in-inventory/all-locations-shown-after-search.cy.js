import { ITEM_STATUS_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const randomPostfix = getRandomPostfix();
const testData = {
  instanceTitlePrefix: `AT_C196762_FolioInstance_${randomPostfix}`,
  effectiveLocationFacet: 'Effective location (item)',
};
const instanceTitles = [testData.instanceTitlePrefix + '_1', testData.instanceTitlePrefix + '_2'];
let userId;

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      before('Create data, user', () => {
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          userId = userProperties.userId;

          cy.getAdminToken()
            .then(() => {
              InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitlePrefix);
              cy.getMaterialTypes({ limit: 1, query: 'source="folio"' }).then((res) => {
                testData.materialType = res.id;
              });
              cy.getLocations({ limit: 2, query: 'name<>"AT_*"' })
                .then(() => {
                  testData.locations = [Cypress.env('locations')[0], Cypress.env('locations')[1]];
                })
                .then(() => {
                  const locationNameForTypeAhead = testData.locations[0];

                  testData.locationNameForTypeAhead = {
                    notFullValue: locationNameForTypeAhead.name.slice(3),
                    fullValue: `${locationNameForTypeAhead.name}`,
                  };
                });
              cy.getHoldingTypes({ limit: 1 }).then((res) => {
                testData.holdingType = res[0].id;
              });
              InventoryHoldings.getHoldingsFolioSource().then((res) => {
                testData.holdingSource = res.id;
              });
              cy.getInstanceTypes({ limit: 1, query: 'source="rdacontent"' }).then((res) => {
                testData.instanceType = res[0].id;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
                testData.loanType = res[0].id;
              });
              cy.getSubjectTypesViaApi({ limit: 1, query: 'source="folio"' }).then((res) => {
                testData.subjectType = res[0].id;
              });
            })
            .then(() => {
              instanceTitles.forEach((title, index) => {
                cy.createInstance({
                  instance: {
                    instanceTypeId: testData.instanceType,
                    title,
                  },
                  holdings: [
                    {
                      holdingsTypeId: testData.holdingType,
                      permanentLocationId: testData.locations[index].id,
                      sourceId: testData.holdingSource,
                    },
                  ],
                  items: [
                    [
                      {
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        permanentLoanType: { id: testData.loanType },
                        materialType: { id: testData.materialType },
                      },
                    ],
                  ],
                });
              });

              cy.login(userProperties.username, userProperties.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            });
        });
      });

      after('Delete all data', () => {
        cy.getAdminToken();
        instanceTitles.forEach((title) => {
          InventoryInstances.deleteFullInstancesByTitleViaApi(title);
        });
        Users.deleteViaApi(userId);
      });

      it(
        'C196762 All Locations for a given search result are displayed in "Effective location (item)" facet when some Location is selected (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C196762'] },
        () => {
          function searchAndVerifyLocations() {
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(testData.instanceTitlePrefix);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
            InventorySearchAndFilter.clickAccordionByName(testData.effectiveLocationFacet);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(
              testData.effectiveLocationFacet,
              true,
            );
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              testData.effectiveLocationFacet,
            );
            testData.locations.forEach((location) => {
              InventorySearchAndFilter.verifyOptionAvailableMultiselect(
                testData.effectiveLocationFacet,
                location.name,
              );
            });
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.effectiveLocationFacet,
              testData.locations[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.effectiveLocationFacet,
              testData.locations[0].name,
            );
            testData.locations.forEach((location) => {
              InventorySearchAndFilter.verifyOptionAvailableMultiselect(
                testData.effectiveLocationFacet,
                location.name,
              );
            });
            InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[1], false);
            InventorySearchAndFilter.clickAccordionByName(testData.effectiveLocationFacet);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(
              testData.effectiveLocationFacet,
              false,
            );
            InventorySearchAndFilter.clickAccordionByName(testData.effectiveLocationFacet);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(
              testData.effectiveLocationFacet,
              true,
            );
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              testData.effectiveLocationFacet,
            );
            testData.locations.forEach((location) => {
              InventorySearchAndFilter.verifyOptionAvailableMultiselect(
                testData.effectiveLocationFacet,
                location.name,
              );
            });
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.effectiveLocationFacet,
              testData.locations[0].name,
            );
            InventorySearchAndFilter.resetAll();
            InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              testData.effectiveLocationFacet,
              testData.locationNameForTypeAhead.notFullValue,
              testData.locationNameForTypeAhead.fullValue,
            );
          }

          searchAndVerifyLocations();

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          searchAndVerifyLocations();

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          searchAndVerifyLocations();
        },
      );
    });
  });
});
