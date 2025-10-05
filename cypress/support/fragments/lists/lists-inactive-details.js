import {
  Accordion,
  Button,
  HTML,
  including,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  Checkbox,
} from '../../../../interactors';

// Additional methods for inactive lists details page test
export const ListsInactiveDetails = {
  // Navigation and basic verification
  verifyListsPageDisplayed() {
    cy.expect(Pane('Lists').exists());
    cy.expect(HTML(including('records found')).exists());
  },

  verifyInactiveFilterIsChecked() {
    const inactiveCheckbox = Checkbox({ id: 'clickable-filter-status-inactive' });
    cy.expect(inactiveCheckbox.has({ checked: true }));
  },

  // List selection
  selectFirstInactiveList() {
    cy.do(
      MultiColumnListRow({ index: 0 })
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .find(Link())
        .click()
    );
    cy.wait(1000);
  },

  // List details page verification
  verifyListDetailsPageOpened() {
    cy.expect(HTML(including('dialog')).exists());
    cy.expect(HTML(including('records found')).exists());
  },

  verifyListTitle() {
    cy.expect(HTML(including('heading')).exists());
  },

  verifyRecordsFoundText() {
    cy.expect(HTML(including('records found')).exists());
  },

  verifyCloseButtonExists() {
    cy.expect(Button({ ariaLabel: including('Close') }).exists());
  },

  verifyActionsButtonExists() {
    const actions = Button('Actions');
    cy.expect(actions.exists());
  },

  // Actions dropdown functionality
  openActionsDropdown() {
    const actions = Button('Actions');
    cy.do(actions.click());
    cy.wait(500);
  },

  verifyActionsDropdownOptions() {
    const refreshList = Button('Refresh list');
    const editList = Button('Edit list');
    const duplicateList = Button('Duplicate list');
    const deleteList = Button('Delete list');
    const exportListVisibleColumns = Button('Export selected columns (CSV)');
    const exportList = Button('Export all columns (CSV)');
    
    cy.expect([
      refreshList.exists(),
      editList.exists(),
      duplicateList.exists(),
      deleteList.exists(),
      exportListVisibleColumns.exists(),
      exportList.exists(),
    ]);
  },

  verifyRefreshListButtonIsDisabled() {
    const refreshList = Button('Refresh list');
    cy.expect(refreshList.has({ disabled: true }));
  },

  verifyExportVisibleColumnsButtonIsDisabled() {
    const exportListVisibleColumns = Button('Export selected columns (CSV)');
    cy.expect(exportListVisibleColumns.has({ disabled: true }));
  },

  verifyExportAllColumnsButtonIsDisabled() {
    const exportList = Button('Export all columns (CSV)');
    cy.expect(exportList.has({ disabled: true }));
  },

  verifyEditListButtonIsEnabled() {
    const editList = Button('Edit list');
    cy.expect(editList.has({ disabled: false }));
  },

  verifyDuplicateListButtonIsEnabled() {
    const duplicateList = Button('Duplicate list');
    cy.expect(duplicateList.has({ disabled: false }));
  },

  verifyDeleteListButtonIsEnabled() {
    const deleteList = Button('Delete list');
    cy.expect(deleteList.has({ disabled: false }));
  },

  closeActionsDropdown() {
    cy.do(HTML().click());
  },

  // Accordion functionality
  verifyListInformationAccordionExists() {
    const listInformationAccording = Accordion('List information');
    cy.expect(listInformationAccording.exists());
  },

  verifyQueryAccordionExists() {
    const queryAccordion = Accordion({ id: 'results-viewer-accordion' });
    cy.expect(queryAccordion.exists());
  },

  collapseListInformationAccordion() {
    const listInformationAccording = Accordion('List information');
    cy.do(listInformationAccording.clickHeader());
    cy.wait(500);
  },

  expandListInformationAccordion() {
    const listInformationAccording = Accordion('List information');
    cy.do(listInformationAccording.clickHeader());
    cy.wait(500);
  },

  verifyListInformationAccordionCollapsed() {
    const listInformationAccording = Accordion('List information');
    cy.expect(listInformationAccording.has({ open: false }));
  },

  verifyListInformationAccordionExpanded() {
    const listInformationAccording = Accordion('List information');
    cy.expect(listInformationAccording.has({ open: true }));
  },

  verifyListInformationContent() {
    const listInformationAccording = Accordion('List information');
    cy.expect([
      listInformationAccording.find(HTML(including('Record last updated'))).exists(),
      listInformationAccording.find(HTML(including('Source'))).exists(),
      listInformationAccording.find(HTML(including('Record created'))).exists(),
      listInformationAccording.find(HTML(including('Description'))).exists(),
      listInformationAccording.find(HTML(including('Visibility'))).exists(),
      listInformationAccording.find(HTML(including('Status'))).exists(),
      listInformationAccording.find(HTML(including('Inactive'))).exists(),
      listInformationAccording.find(HTML(including('System'))).exists(),
    ]);
  },

  collapseQueryAccordion() {
    const queryAccordion = Accordion({ id: 'results-viewer-accordion' });
    cy.do(queryAccordion.clickHeader());
    cy.wait(500);
  },

  expandQueryAccordion() {
    const queryAccordion = Accordion({ id: 'results-viewer-accordion' });
    cy.do(queryAccordion.clickHeader());
    cy.wait(500);
  },

  verifyQueryAccordionCollapsed() {
    const queryAccordion = Accordion({ id: 'results-viewer-accordion' });
    cy.expect(queryAccordion.has({ open: false }));
  },

  verifyQueryAccordionExpanded() {
    const queryAccordion = Accordion({ id: 'results-viewer-accordion' });
    cy.expect(queryAccordion.has({ open: true }));
  },

  verifyQueryContent() {
    const queryAccordion = Accordion({ id: 'results-viewer-accordion' });
    cy.expect([
      queryAccordion.find(HTML(including('0 records found'))).exists(),
      queryAccordion.find(HTML(including('The list contains no items'))).exists(),
    ]);
  },

  // Close functionality
  closeListDetailsPage() {
    cy.do(Button({ ariaLabel: including('Close') }).click());
    cy.wait(1000);
  },

  verifyListDetailsPageClosed() {
    cy.expect(HTML(including('dialog')).absent());
  },

  verifyBackOnListsLandingPage() {
    cy.expect(Pane('Lists').exists());
  },
};