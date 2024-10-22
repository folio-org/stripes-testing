import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data-editor/linkedDataEditor';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

describe('ui-data-linked-editor - check view and search', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
  });

  it(
    'C491276 Linked Data Editor: Verify user is navigated to Linked data editor home page when Application header icon is clicked',
    { tags: ['citation', 'linked-data-editor', 'sanity'] },
    () => {
      cy.visit(TopMenu.linkedDataEditor);
      LinkedDataEditor.waitLoading();
      // check search is displayed with lccn option
      LinkedDataEditor.checkSearchOptionIsDisplayed('lccn');
      // open new resource form
      LinkedDataEditor.openNewResourceForm();
      // navigate back to the main module
      TopMenuNavigation.navigateToApp('Linked data editor');
      LinkedDataEditor.waitLoading();
      // search by any title
      LinkedDataEditor.searchByOption('title', '*');
      // open work
      LinkedDataEditor.selectFromSearchTable(1);
      // navigate back to the main module
      TopMenuNavigation.navigateToApp('Linked data editor');
      LinkedDataEditor.waitLoading();
      LinkedDataEditor.checkSearchOptionIsDisplayed('lccn');
    },
  );
});
