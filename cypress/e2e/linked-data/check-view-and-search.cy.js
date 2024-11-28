import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';

describe('ui-data-linked-editor - check view and search', () => {
  beforeEach(() => {
    cy.loginAsAdmin({
      path: TopMenu.linkedDataEditor,
      waiter: LinkedDataEditor.waitLoading,
    });
  });

  it(
    'C491276 Linked Data Editor: Verify user is navigated to Linked data editor home page when Application header icon is clicked',
    { tags: ['citation', 'linked-data-editor', 'sanity'] },
    () => {
      // check search is displayed with lccn option
      LinkedDataEditor.checkSearchOptionIsDisplayed('lccn');
      // open new resource form
      LinkedDataEditor.openNewResourceForm();
      // navigate back to the main module
      TopMenuNavigation.openAppFromDropdown('Linked data editor');
      LinkedDataEditor.waitLoading();
      // search by any title
      SearchAndFilter.searchResourceByTitle('*');
      // open work
      LinkedDataEditor.selectFromSearchTable(1);
      // navigate back to the main module
      TopMenuNavigation.openAppFromDropdown('Linked data editor');
      LinkedDataEditor.waitLoading();
      LinkedDataEditor.checkSearchOptionIsDisplayed('lccn');
    },
  );
});
