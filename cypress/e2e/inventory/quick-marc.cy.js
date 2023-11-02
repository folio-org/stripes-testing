import {
  Button,
  including,
  matching,
  MultiColumnList,
  not,
  Page,
  Pane,
} from '../../../interactors';
import getLongDelay from '../../support/utils/cypressTools';

describe('ui-inventory: MARC', () => {
  beforeEach('navigates to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit('/inventory');
    cy.searchMARC('Robert C. Klove papers.');
  });

  describe('deriving a MARC record', () => {
    // FIXME: Test expects at least one MARC record with `Robert C. Klove papers.` query, but API returns nothing
    it('should find MARC source records', () => {
      cy.expect(MultiColumnList().has({ rowCount: not(0) }));
    });

    describe('opening Derive MARC record page', () => {
      beforeEach(() => {
        cy.do([
          MultiColumnList().click({ row: 0, content: 'Robert C. Klove papers.' }),
          Pane(including('Instance')).find(Button('Actions')).click(),
          // FIXME: This button is disabled for unknown reason
          Button('Derive new MARC bibliographic record').click(),
        ]);
      });

      it('should open Derive MARC record page', () => {
        cy.expect(Page.has({ url: matching(/\/inventory\/quick-marc\/duplicate/) }));
      });

      it('should redirect to empty inventory item page', () => {
        cy.do(Button('Save & close').click());

        cy.expect(Page.has({ url: matching(/\/inventory\/view\/(id|.+)/) }));
      });
    });
  });

  describe('editing a MARC record', () => {
    beforeEach('searching for MARC inventory items and editing', () => {
      cy.do([
        MultiColumnList().click({ row: 0, content: 'Robert C. Klove papers.' }),
        Pane(including('Instance')).find(Button('Actions')).click(),
        // FIXME: This button is disabled for unknown reason
        Button('Edit in quickMARC').click(),
      ]);
    });

    describe('editing the default subfield', () => {
      it('should open Edit MARC record page', () => {
        cy.expect(Page.has({ url: matching(/\/inventory\/quick-marc\/edit/) }));
      });

      describe('adding a new field', () => {
        let newField;

        beforeEach(() => {
          cy.get('.quickMarcEditorAddField:last').click();
          newField = cy.get('[class*="quickMarcEditorRow--"]:last-child');
        });

        it('should add default $a subfield', () => {
          newField.find('textarea').should((textArea) => expect(textArea.value).to.eq('$a '));
        });

        describe('adding some data to new field and saving', () => {
          beforeEach(() => {
            cy.get('[class*="quickMarcEditorRow--"]:last-child')
              .find('textarea')
              .type('Some test data');
            cy.get('[class*="quickMarcEditorRow--"]:last-child')
              .find('input')
              .then(([tag, indicator1, indicator2]) => {
                cy.wrap(tag).type('650');
                cy.wrap(indicator1).type('\\');
                cy.wrap(indicator2).type('\\');
              });

            cy.do(Button('Save & close').click());

            cy.get('#pane-instancedetails [class*="actionMenuToggle--"]', getLongDelay()).click();
            cy.get('#clickable-view-source', getLongDelay()).click();
          });

          it('should show updated data in View MARC record', () => {
            cy.contains('650 ‡a Some test data');
          });
        });
      });
    });

    describe('editing the 006/00 field', () => {
      beforeEach('and adding a 006/00 field', () => {
        cy.get('.quickMarcEditorAddField:last').click();

        cy.get('[class*="quickMarcEditorRow--"]:last-child')
          .find('input')
          .then(([tag]) => {
            cy.wrap(tag).type('006');
          });
      });

      it('should show type select', () => {
        cy.get('[class*="quickMarcEditorRow--"]:last-child').contains('Type');
      });

      describe('adding some data to new 006 field and saving', () => {
        beforeEach(() => {
          cy.get('[class*="quickMarcEditorRow--"]:last-child select').select('c');

          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="Comp"]').type('jz');
          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="FMus"]').type('a');
          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="Part"]').type('d');
          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="Audn"]').type('g');
          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="Form"]').type('s');
          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="AccM[0]"]').type('|');
          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="LTxt[0]"]').type('|');
          cy.get('[class*="quickMarcEditorRow--"]:last-child input[name*="TrAr"]').type('|');

          cy.do([
            Button('Save & close').click(),
            Pane(including('Instance')).find(Button('Actions')).click(),
            Button('View source').click(),
          ]);
        });

        it('should show updated data in View MARC record', () => {
          cy.contains('cjzadgs');
        });
      });
    });
  });
});
