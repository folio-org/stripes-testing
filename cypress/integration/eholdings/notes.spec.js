import { Accordion, Button, Checkbox, HTML, including, Link, matching, Modal, MultiColumnList, MultiColumnListCell, not, Page, RichEditor, TextField } from '../../../interactors';

describe('ui-eholdings: Notes', () => {
  beforeEach('navigates to EBSCO eHolding provider', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/eholdings');
    cy.search('EBSCO');
    cy.do(Link(including('EBSCO\n')).click());
  });

  // it('should open Provider show page', () => {
  //   cy.expect(Page.has({ url: matching(/\/eholdings\/providers\/\d+/) }));
  // });

  describe('creating a Note', () => {
    beforeEach(() => {
      cy.do(Accordion('Notes').find(Button('New')).click());
    });

    it('should open Note create page', () => {
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

      it('should redirect to Provider show page', () => {
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

    it('should redirect to note edit page', () => {
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

      it('should redirect to note view page with edited details', () => {
        cy.expect(Page.has({ url: matching(/\/eholdings\/notes\/[0-9a-z-]+/) }));
        cy.expect(HTML(noteEdit).exists());
      });
    });
  });

  describe('assigning a note', () => {
    beforeEach(() => {
      cy.do(Button('Assign / Unassign').click());
    });

    it('should open note modal', () => {
      cy.expect(Modal('Assign / Unassign note').exists());
    });

    describe('searching for notes by name', () => {
      beforeEach(() => {
        cy.do([
          TextField('Note search').fillIn('e2e'),
          Button('Search').click()
        ]);
      });

      it('should show not empty result list', () => {
        cy.expect(Modal().find(MultiColumnList()).has({ rowCount: not(0) }));
      });
    });

    describe('searching unassigned notes', () => {
      beforeEach(() => {
        cy.do([
          Checkbox('Assigned').click(),
          Checkbox('Assign / Unassign all notes').click(), // FIXME: This checkbox is disabled
          Button('Save').click(),
          Button('Assign / Unassign').click(),
          Checkbox('Unassigned').click()
        ]);
      });

      // FIXME: This test should fail because notes can't be unassigned
      it('should show not empty result list', () => {
        cy.expect(Modal().find(MultiColumnList()).has({ rowCount: not(0) }));
      });

      describe('assigning a note', () => {
        let noteTitle;

        beforeEach(() => {
          cy.do([
            Modal()
              .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
              .find(Checkbox('Assign / Unassign note')) // FIXME: This checkbox is disabled
              .click(),
            Modal()
              .find(MultiColumnListCell({ row: 0, columnIndex: 1 }))
              .perform(element => { noteTitle = element.innerText; }),
            Button('Save').click(),
          ]);
        });

        it('should show assigned note', () => {
          cy.expect(MultiColumnListCell(including(noteTitle)));
        });
      });
    });
  });
});
