import {
  ITEM_STATUS_NAMES,
  MATERIAL_TYPE_NAMES,
  INSTANCE_SOURCE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      instanceTitle: `AT_C2315_FolioInstance_${getRandomPostfix()}`,
      instanceLanguage: 'eng',
      instanceLanguageText: 'English',
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      filterNames: {
        source: 'Source',
        language: 'Language',
        holdingsLocation: 'Holdings permanent location',
        materialType: 'Material type',
      },
      searchRequestPath: '/search/instances?*',
    };
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          // Get required IDs for test data creation
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"*autotest*" and name<>"AT_*")',
          }).then((res) => {
            testData.locationId = res.id;
            testData.locationName = res.name;
          });
          cy.getMaterialTypes({ query: `name="${testData.materialType}"` }).then((res) => {
            testData.materialTypeId = res.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
        })
        .then(() => {
          // Create instance with holdings and item as specified
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
              languages: [testData.instanceLanguage],
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              },
            ],
            items: [
              {
                barcode: testData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((instanceIds) => {
            testData.instanceId = instanceIds.instanceId;
            testData.holdingId = instanceIds.holdings[0].id;
            testData.itemId = instanceIds.items[0].id;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    });

    it(
      'C2315 Search: Verify that the "Reset all button" works (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C2315'] },
      () => {
        // Step 1: Open the Inventory app - Instance segment is selected by default
        InventorySearchAndFilter.instanceTabIsDefault();

        // Step 2: Test filters for several combinations (Instance segment)
        InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
        InventorySearchAndFilter.clickAccordionByName(testData.filterNames.language);
        cy.intercept(testData.searchRequestPath).as('getInstances1');
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          testData.filterNames.language,
          testData.instanceLanguageText,
        );
        cy.wait('@getInstances1');
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.language,
          testData.instanceLanguageText,
        );

        InventorySearchAndFilter.verifyResultListExists();

        // Step 3: Click on "reset all" button
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.language,
          testData.instanceLanguageText,
          false,
        );
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          testData.filterNames.source,
          INSTANCE_SOURCE_NAMES.FOLIO,
          false,
        );

        // Step 4: Try using "reset all" button again when no filters are applied
        InventorySearchAndFilter.verifyResetAllButtonDisabled();

        // Step 5: Select Holdings segment and repeat steps 2-4
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();

        InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
        InventorySearchAndFilter.clickAccordionByName(testData.filterNames.holdingsLocation);
        cy.intercept(testData.searchRequestPath).as('getInstances2');
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          testData.filterNames.holdingsLocation,
          testData.locationName,
        );
        cy.wait('@getInstances2');
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.holdingsLocation,
          testData.locationName,
        );
        InventorySearchAndFilter.verifyResultListExists();

        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.holdingsLocation,
          testData.locationName,
          false,
        );
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          testData.filterNames.source,
          INSTANCE_SOURCE_NAMES.FOLIO,
          false,
        );

        InventorySearchAndFilter.verifyResetAllButtonDisabled();

        // Step 6: Select Item segment and repeat steps 2-4
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();

        InventorySearchAndFilter.clickAccordionByName(testData.filterNames.materialType);
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          testData.filterNames.materialType,
          testData.materialType,
        );
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.materialType,
          testData.materialType,
        );
        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.clickAccordionByName(testData.filterNames.holdingsLocation);
        cy.intercept(testData.searchRequestPath).as('getInstances3');
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          testData.filterNames.holdingsLocation,
          testData.locationName,
        );
        cy.wait('@getInstances3');
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.holdingsLocation,
          testData.locationName,
        );
        InventorySearchAndFilter.verifyResultListExists();

        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.holdingsLocation,
          testData.locationName,
          false,
        );
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          testData.filterNames.materialType,
          testData.materialType,
          false,
        );

        InventorySearchAndFilter.verifyResetAllButtonDisabled();
      },
    );
  });
});
