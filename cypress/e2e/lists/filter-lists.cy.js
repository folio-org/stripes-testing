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
        description: `C411804-${getTestEntityValue('test_list_description')}-1`,
        recordType: 'Loans',
        fqlQuery: '',
        isActive: true,
        isPrivate: true,
      },
      {
        name: `C411804-${getTestEntityValue('test_list')}-2`,
        description: `C411804-${getTestEntityValue('test_list_description')}-2`,
        recordType: 'Loans',
        fqlQuery: '',
        isActive: false,
        isPrivate: true,
      },
      {
        name: `C411805-${getTestEntityValue('test_list')}-1`,
        description: `C411805-${getTestEntityValue('test_list_description')}-2`,
        recordType: 'Loans',
        fqlQuery: '',
        isActive: true,
        isPrivate: false,
      },
      {
        name: `C411805-${getTestEntityValue('test_list')}-2`,
        description: `C411805-${getTestEntityValue('test_list_description')}-2`,
        recordType: 'Loans',
        fqlQuery: '',
        isActive: true,
        isPrivate: true,
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-1`,
        description: `C411806-${getTestEntityValue('test_list_description')}-2`,
        recordType: 'Users',
        fqlQuery: '',
        isActive: true,
        isPrivate: true,
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-2`,
        description: `C411806-${getTestEntityValue('test_list_description')}-2`,
        recordType: 'Loans',
        fqlQuery: '',
        isActive: true,
        isPrivate: true,
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-3`,
        description: `C411806-${getTestEntityValue('test_list_description')}-3`,
        recordType: 'Items',
        fqlQuery: '',
        isActive: true,
        isPrivate: true,
      },
      {
        name: `C411806-${getTestEntityValue('test_list')}-4`,
        description: `C411806-${getTestEntityValue('test_list_description')}-4`,
        recordType: 'Purchase order lines',
        fqlQuery: '',
        isActive: true,
        isPrivate: true,
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
      filters: ['Loans', 'Items', 'Users', 'Purchase order lines'],
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        createdLists.forEach((list) => {
          Lists.createViaApi(list);
        });
      });
    });

    beforeEach('Reset all filters', () => {
      // #1 Click on "Lists" in app navigation bar
      cy.visit(TopMenu.listsPath);
      Lists.waitLoading();
      Lists.resetAllFilters();
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      cy.getUserToken(userData.username, userData.password);
      createdLists.forEach((list) => {
        Lists.deleteListByNameViaApi(list.name);
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
        Lists.resetAllFilters();
        Lists.verifyListsFilteredByStatus(['Active']);
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
        Lists.verifyListsFilteredByVisibility(visibilityFilter.filters);
        // #5 Click on "x"
        Lists.clickOnClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyVisibilityAccordionDefaultContent();
        Lists.verifyResetAllButtonDisabled();
        // #6 Click on "Private" checkbox
        Lists.clickOnCheckbox('Private');
        Lists.verifyCheckboxChecked('Private');
        Lists.verifyClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFilteredByVisibility(['Private']);
        // #7 Uncheck the "Private" visibility and click on "Shared" checkbox
        Lists.clickOnCheckbox('Private');
        Lists.verifyCheckboxUnchecked('Private');
        Lists.clickOnCheckbox('Shared');
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyClearFilterButton(visibilityFilter.accordionName);
        Lists.verifyResetAllButtonEnabled();
        Lists.verifyListsFilteredByVisibility(['Shared']);
      },
    );

    it(
      'C411806 Filter section: Record types (corsair) (TaaS)',
      { tags: ['criticalPath', 'corsair'] },
      () => {
        Lists.clickOnAccordionInFilter(recordTypesFilters.accordionName);
        Lists.verifyAccordionCollapsedInFilter(recordTypesFilters.accordionName);
        Lists.clickOnAccordionInFilter(recordTypesFilters.accordionName);
        Lists.verifyAccordionCollapsedInFilter(recordTypesFilters.accordionName);
        recordTypesFilters.filters.forEach((filter) => {
          Lists.selectRecordTypeFilter(filter);
          Lists.verifyClearFilterButton(recordTypesFilters.accordionName);
          Lists.verifyResetAllButtonEnabled();
          Lists.verifyListsFilteredByRecordType(filter);
          Lists.resetAllFilters();
          Lists.verifyClearFilterButtonAbsent(recordTypesFilters.accordionName);
        });
      },
    );
  });
});
