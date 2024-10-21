import TopMenu from '../../support/fragments/topMenu';
import LinkedDataEditor from '../../support/fragments/linked-data-editor/linkedDataEditor';

describe('ui-data-linked-editor - check view and search', () => {
  before(() => {});

  beforeEach(() => {});

  afterEach(() => {});

  it(
    'C491276 Linked Data Editor: Verify user is navigated to Linked data editor home page when Application header icon is clicked',
    { tags: [] },
    () => {
      cy.visit(TopMenu.linkedDataEditor);
      LinkedDataEditor.waitLoading();
    },
  );
});
