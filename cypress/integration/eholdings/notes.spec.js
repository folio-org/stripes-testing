import { Accordion, Button, Checkbox, HTML, including, Link, matching, Modal, MultiColumnList, MultiColumnListCell, not, Page, RichEditor, TextField } from '../../../interactors';

describe('ui-eholdings: Notes', () => {
  beforeEach('navigates to EBSCO eHolding provider', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit('/eholdings');
    cy.search('EBSCO');
    cy.do(Link(including('EBSCO\n')).click());
  });

  describe('creating a Note', () => {
    beforeEach(() => {
      cy.do(Accordion('Notes').find(Button('New')).click());
    });

    it('should open Note create page (spitfire)', () => {
      cy.expect(Page.has({ url: including('eholdings/notes/new') }));
    });

    describe('filling in data', () => {
      const noteTitle = `[e2e] Note created at ${Date.now()}`;

      beforeEach(() => {
        cy.do([
          TextField(including('Note title')).fillIn(noteTitle),
          RichEditor('Details').fillIn('Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.'),
          Button('Save & close').click()
        ]);
      });

      it('should redirect to Provider show page (spitfire)', () => {
        cy.expect(Page.has({ url: matching(/\/eholdings\/providers\/\d+/) }));
      });

      it('should display newly created note', () => {
        cy.expect(MultiColumnListCell(including(noteTitle)));
      });
    });
  });

  describe('editing a note', () => {
    beforeEach(() => {
      cy.do([
        MultiColumnList().click({ row: 0 }),
        Button('Actions').click(),
        Button('Edit').click()
      ]);
    });

    it('should redirect to note edit page (spitfire)', () => {
      cy.expect(Page.has({ url: matching(/\/eholdings\/notes\/[0-9a-z-]+\/edit/) }));
    });

    describe('making changes to note details', () => {
      const noteEdit = `edited at ${Date.now()}`;

      beforeEach(() => {
        cy.do([
          RichEditor('Details').fillIn(noteEdit),
          Button('Save & close').click()
        ]);
      });

      it('should redirect to note view page with edited details (spitfire)', () => {
        cy.expect(Page.has({ url: matching(/\/eholdings\/notes\/[0-9a-z-]+/) }));
        cy.expect(HTML(noteEdit).exists());
      });
    });
  });

  describe('assigning a note', () => {
    beforeEach(() => {
      cy.do(Button('Assign / Unassign').click());
    });

    it('should open note modal (spitfire)', () => {
      cy.expect(Modal('Assign / Unassign note').exists());
    });

    describe('searching for notes by name', () => {
      beforeEach(() => {
        cy.do([
          TextField('Note search').fillIn('e2e'),
          Button('Search').click()
        ]);
      });

      it('should show not empty result list (spitfire)', () => {
        cy.expect(Modal().find(MultiColumnList()).has({ rowCount: not(0) }));
      });
    });

    // FIXME: The search results contain notes with only one assign
    // Every note should have at least one assign and can't be completely unassigned
    // Because test creates a note and that note has only one assign to EBSCO provider
    // And the results don't have any other notes those are returned from the backend API
    // These tests below are broken
    describe('searching unassigned notes', () => {
      beforeEach(() => {
        cy.do([
          Checkbox('Assigned').click(),
          // FIXME: Notes with only one assign can't be unassigned, so that checkbox is disabled
          Checkbox('Assign / Unassign all notes').click(),
          Button('Save').click(),
          Button('Assign / Unassign').click(),
          Checkbox('Unassigned').click()
        ]);
      });

      it('should show not empty result list (spitfire)', () => {
        cy.expect(Modal().find(MultiColumnList()).has({ rowCount: not(0) }));
      });

      describe('assigning a note', () => {
        let noteTitle;

        beforeEach(() => {
          cy.do([
            Modal()
              .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
              .find(Checkbox('Assign / Unassign note'))
              .click(),
            Modal()
              .find(MultiColumnListCell({ row: 0, columnIndex: 1 }))
              .perform(element => { noteTitle = element.innerText; }),
            Button('Save').click(),
          ]);
        });

        it('should show assigned note (spitfire)', () => {
          cy.expect(MultiColumnListCell(including(noteTitle)));
        });
      });
    });
  });
});
