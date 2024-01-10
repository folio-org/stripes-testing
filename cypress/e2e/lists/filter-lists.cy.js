import Permissions from '../../support/dictionary/permissions';
import Lists from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('lists', () => {
  describe('Filter lists', () => {
    const userData = {};
    const createdLists = [
      {
        name: `C411804-${getTestEntityValue('test_list')}-1`,
        recordType: 'Loans',
        status: 'Active',
        visibility: 'Private',
      },
      {
        name: `C411804-${getTestEntityValue('test_list')}-2`,
        recordType: 'Loans',
        status: 'Inactive',
        visibility: 'Private',
      },
      {
        name: `C411805-${getTestEntityValue('test_list')}-1`,
        recordType: 'Loans',
        status: 'Active',
        visibility: 'Shared',
      },
      {
        name: `C411805-${getTestEntityValue('test_list')}-2`,
        recordType: 'Loans',
        status: 'Active',
        visibility: 'Private',
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-1`,
        recordType: 'Users',
        status: 'Active',
        visibility: 'Private',
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-2`,
        recordType: 'Loans',
        status: 'Active',
        visibility: 'Private',
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-3`,
        recordType: 'Items',
        status: 'Active',
        visibility: 'Private',
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-3`,
        recordType: 'Purchase order Lines',
        status: 'Active',
        visibility: 'Private',
      },
    ];

    const statusFilters = {
      accordionName: 'Status',
      filters: ['Active', 'Inactive'],
    };
    const visibilityFilter = {
      accordionName: 'Visibility',
      filters: ['Private', 'Shared'],
    };
    const recordTypesFilters = {
      accordionName: 'Record types',
      filters: ['Loans', 'Items', 'Users', 'Purchase order Lines'],
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });

      createdLists.forEach((list) => {
        Lists.openNewListPane();
        Lists.setName(list.name);
        Lists.setDescription(list.name);
        Lists.selectRecordType(list.recordType);
        Lists.selectStatus(list.status);
        Lists.selectVisibility(list.visibility);
        Lists.saveList();
        Lists.verifyCalloutMessage(`List ${list.name} saved.`);
        Lists.closeListDetailsPane();
      });
    });

    beforeEach('Reset all filters', () => {
    // #1 Click on "Lists" in app navigation bar
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.resetAll();
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      createdLists.forEach((list) => {
        Lists.getViaApi().then((response) => {
          const filteredItem = response.body.content.find((item) => item.name === list.name);
          Lists.deleteViaApi(filteredItem.id);
        });
      });
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411804 Filter section: Statuses (corsair) (TaaS)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
      // #2 Click on "Status" accordion on the "Filter" pane
        Lists.clickOnAccordionInFilter(statusFilters.accordionName);
        Lists.verifyAccordionCollapsedInFilter(statusFilters.accordionName);
        // #3 Click on "Statuses" accordion again
        Lists.clickOnAccordionInFilter(statusFilters.accordionName);
        Lists.verifyAccordionExpandedInFilter(statusFilters.accordionName);
        Lists.verifyStatusAccordionDefaultContent();
        // #4 Click on "Active" status to uncheck it
        Lists.clickOnCheckbox('Active');
        Lists.verifyCheckboxUnchecked('Active');
        Lists.verifyClearFilterButtonAbsent(statusFilters.accordionName);
        Lists.verifyResetAllButtonEnabled();
        // #5 Click on "Reset all"
        Lists.resetAll();
        Lists.verifyListsFileredByStatus(['Active']);
      },
    );

    it(
      'C411805 Filter section: Visibility (corsair) (TaaS)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
      // #2 Click on "Visibility" accordion on the "Filter" pane
        Lists.clickOnAccordionInFilter(visibilityFilter.accordionName);
        Lists.verifyAccordionCollapsedInFilter(visibilityFilter.accordionName);
        // #3 Click on "Visibility" accordion again
        Lists.clickOnAccordionInFilter(visibilityFilter.accordionName);
        Lists.verifyAccordionExpandedInFilter(visibilityFilter.accordionName);
        Lists.verifyVisibilityAccordionDefaultContent();
        // #4 Select all options by marking the checkboxes as active
        visibilityFilter.filters.forEach((filter) => {
          Lists.clickOnCheckbox(filter);
        });
        Lists.verifyClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFileredByVisiblity(visibilityFilter.filters);
        // #5 Click on "x"
        Lists.clickOnClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyVisibilityAccordionDefaultContent();
        Lists.verifyResetAllButtonDisabled();
        // #6 Click on "Private" checkbox
        Lists.clickOnCheckbox('Private');
        Lists.verifyCheckboxChecked('Private');
        Lists.verifyClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFileredByVisiblity(['Private']);
        // #7 Uncheck the "Private" visibility and click on "Shared" checkbox
        Lists.clickOnCheckbox('Private');
        Lists.verifyCheckboxUnchecked('Private');
        Lists.clickOnCheckbox('Shared');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFileredByVisiblity(['Shared']);
      },
    );

    it(
      'C411806 Filter section: Record types (corsair) (TaaS)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
      // #2 Click on "Record types" accordion on the 'Filter' pane
        Lists.clickOnAccordionInFilter(recordTypesFilters.accordionName);
        Lists.verifyAccordionCollapsedInFilter(recordTypesFilters.accordionName);
        // #3 Click on "Record types" accordion again
        Lists.clickOnAccordionInFilter(recordTypesFilters.accordionName);
        Lists.verifyAccordionCollapsedInFilter(recordTypesFilters.accordionName);
        // #4 Check the list of record types
        Lists.verifyRecordTypesAccordionDefaultContent();
        // #5 Select all record types by marking the checkboxes as active
        recordTypesFilters.filters.forEach((filter) => {
          Lists.clickOnCheckbox(filter);
        });
        Lists.verifyClearFilterButton(recordTypesFilters.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFileredByRecordType(recordTypesFilters.filters);
        // #6 Click on "x"
        Lists.clickOnClearFilterButton(recordTypesFilters.accordionName);
        Lists.verifyRecordTypesAccordionDefaultContent();
        Lists.verifyListsFileredByRecordType(recordTypesFilters.filters);
        // #7 Click on "Loans" checkbox
        Lists.clickOnCheckbox('Loans');
        Lists.verifyClearFilterButton(recordTypesFilters.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFileredByRecordType(['Loans']);
        // #8 Click on "Items" checkbox
        Lists.clickOnCheckbox('Loans');
        Lists.verifyCheckboxUnchecked('Loans');
        Lists.clickOnCheckbox('Items');
        Lists.verifyClearFilterButton(recordTypesFilters.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFileredByRecordType(['Items']);
        // #9 Click on "Users" checkbox
        Lists.clickOnCheckbox('Items');
        Lists.verifyCheckboxUnchecked('Items');
        Lists.clickOnCheckbox('Users');
        Lists.verifyClearFilterButton(recordTypesFilters.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFileredByRecordType(['Users']);
        // #10 Click on "Reset all"
        Lists.resetAll();
        Lists.verifyRecordTypesAccordionDefaultContent();
        Lists.verifyClearFilterButtonAbsent(recordTypesFilters.accordionName);
      },
    );
  });
});
