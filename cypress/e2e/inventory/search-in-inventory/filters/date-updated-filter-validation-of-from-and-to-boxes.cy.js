import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const dateUpdatedAccordion = 'Date updated';
      const invalidDateError = 'Please enter a valid date';
      const oneDay = 24 * 60 * 60 * 1000;
      const validDates = {
        from: DateTools.getFormattedDate({ date: new Date(Date.now() - oneDay) }),
        to: DateTools.getFormattedDate({ date: new Date(Date.now() + oneDay) }),
      };
      const instanceTitle = `AT_C594439_Instance_${randomPostfix}`;
      let instanceId;
      let user;

      before('Create user and a record to search', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C594439_');

        // The own record guarantees that the "*" search has a result
        InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
          instanceId = instanceData.instanceId;
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.instanceTabIsDefault();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C594439 Validation of "From" / "To" boxes in "Date updated" filter (promin)',
        { tags: ['extendedPath', 'promin', 'C594439'] },
        () => {
          // Step 1: search "*" - records are displayed
          InventorySearchAndFilter.executeSearch('*');
          InventorySearchAndFilter.verifySearchResultsNotEmpty();
          InventorySearchAndFilter.toggleAccordionByName(dateUpdatedAccordion);

          // Step 2: year only - both boxes are highlighted, "Please enter a valid date"
          InventorySearchAndFilter.fillDateFilterValues(dateUpdatedAccordion, '1923', '1925');
          InventorySearchAndFilter.checkErrorsForDateFilterFields(
            dateUpdatedAccordion,
            invalidDateError,
            invalidDateError,
          );

          // Step 3: Apply - the same errors
          InventorySearchAndFilter.clickApplyInDateFilter(dateUpdatedAccordion);
          InventorySearchAndFilter.checkErrorsForDateFilterFields(
            dateUpdatedAccordion,
            invalidDateError,
            invalidDateError,
          );

          // Step 4: dd-mm-yyyy - the "From" box is highlighted, the result list is not updated
          InventorySearchAndFilter.fillDateFilterValues(
            dateUpdatedAccordion,
            '13-01-1923',
            '27-02-1925',
          );
          InventorySearchAndFilter.checkErrorsForDateFilterFields(
            dateUpdatedAccordion,
            invalidDateError,
          );
          InventorySearchAndFilter.verifySearchResultsNotEmpty();

          // Step 5: Apply - both boxes are highlighted
          InventorySearchAndFilter.clickApplyInDateFilter(dateUpdatedAccordion);
          InventorySearchAndFilter.checkErrorsForDateFilterFields(
            dateUpdatedAccordion,
            invalidDateError,
            invalidDateError,
          );

          // Step 6: "From" is greater than "To"
          InventorySearchAndFilter.fillDateFilterValues(
            dateUpdatedAccordion,
            '2024-11-29',
            '2024-11-28',
          );

          // Step 7: Apply - "Start date is greater than end date", the result list is not updated
          InventorySearchAndFilter.clickApplyInDateFilter(dateUpdatedAccordion);
          InventorySearchAndFilter.checkDateOrderErrorInDateFilter(dateUpdatedAccordion);
          InventorySearchAndFilter.verifySearchResultsNotEmpty();

          // Step 8: Reset all - the search box and the "Date updated" boxes are cleared, no errors
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventorySearchAndFilter.verifyDateFilterValues(dateUpdatedAccordion, '', '');
          InventorySearchAndFilter.verifyNoErrorsForDateFilterFields(dateUpdatedAccordion);

          // Step 9: valid dates (yesterday and tomorrow), Apply - records are displayed
          InventorySearchAndFilter.fillDateFilterValues(
            dateUpdatedAccordion,
            validDates.from,
            validDates.to,
          );
          InventorySearchAndFilter.clickApplyInDateFilter(dateUpdatedAccordion);
          InventorySearchAndFilter.verifySearchResultsNotEmpty();

          // Step 10: refresh the page - the "Date updated" filter is still applied
          cy.reload();
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifySearchResultsNotEmpty();
          InventorySearchAndFilter.toggleAccordionByName(dateUpdatedAccordion);
          InventorySearchAndFilter.verifyDateFilterValues(
            dateUpdatedAccordion,
            validDates.from,
            validDates.to,
          );
          InventorySearchAndFilter.verifySearchResultsNotEmpty();

          // Step 11: Reset all - the boxes and the result list are cleared
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifyDateFilterValues(dateUpdatedAccordion, '', '');
        },
      );
    });
  });
});
