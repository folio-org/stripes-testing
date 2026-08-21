import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';

import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const testData = {
        searchQuery: '*',
        instanceName: 'AT_C594419 testing created date',
        dateCreatedAccordionName: 'Date created',
        invalidDateError: 'Please enter a valid date',
      };

      const marcInstanceFields = [
        {
          tag: '008',
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: '245',
          content: `$a ${testData.instanceName}`,
          indicators: ['1', '0'],
        },
      ];

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const toIsoDate = (day) => {
        return day.toISOString().split('T')[0];
      };

      const dateInputs = [
        ['1923', '1925', testData.invalidDateError, testData.invalidDateError],
        ['13-01-1923', '22-05-1925', testData.invalidDateError, testData.invalidDateError],
        ['2024-01-30', '2021-01-30', InventorySearchAndFilter.dateOrderErrorText, false],
        [toIsoDate(yesterday), toIsoDate(today), false, false],
      ];

      before('Setup login', () => {
        cy.getAdminToken();

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then((instanceId) => {
          testData.createdBibID = instanceId;
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          testData.userId = userProperties.userId;
          cy.waitForAuthRefresh(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
        });
      });

      after('Delete test user', () => {
        cy.getAdminToken();
        if (testData.createdBibID) InventoryInstance.deleteInstanceViaApi(testData.createdBibID);
        Users.deleteViaApi(testData.userId);
      });

      it(
        'C594419 Validation of "From" / "To" boxes in "Date created" filter (promin)',
        { tags: ['criticalPath', 'promin', 'C594419'] },
        () => {
          InventoryInstances.searchByTitle(testData.searchQuery);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.toggleAccordionByName(testData.dateCreatedAccordionName);

          // Try invalid dates - only year
          InventorySearchAndFilter.filterByDateCreated(
            ...dateInputs[0]
          );

          // Try invalid dates - wrong format
          InventorySearchAndFilter.filterByDateCreated(
            ...dateInputs[1]
          );

          // Try invalid dates - from after to
          InventorySearchAndFilter.filterByDateCreated(
            ...dateInputs[2]
          );

          // Reset
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifyDateCreatedAccordionValues('', '');
          InventorySearchAndFilter.verifySearchFieldIsEmpty();

          // Try valid dates
          InventorySearchAndFilter.filterByDateCreated(
            ...dateInputs[3]
          );
          InventorySearchAndFilter.verifyResultListExists();

          // Reload page
          cy.reload();
          InventorySearchAndFilter.toggleAccordionByName(testData.dateCreatedAccordionName);
          InventorySearchAndFilter.verifyDateCreatedAccordionValues(dateInputs[3][0], dateInputs[3][1]);
          InventorySearchAndFilter.verifyResultListExists();

          // Final reset clears search
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        },
      );
    });
  });
});
