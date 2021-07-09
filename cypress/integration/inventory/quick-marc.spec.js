import {
  Button, including, Link, matching, MultiColumnList, not, Page, Pane,
} from '../../../interactors';

describe('ui-inventory: Derive MARC', () => {
  before('logs in and navigates to Inventory', () => {
    cy.visit('/');
    cy.login('diku_admin', 'admin');
    cy.do([
      Button('Apps').click(),
      Link('Inventory').click()
    ]);
  });

  after(() => {
    cy.logout();
  });

  describe('deriving a MARC record', () => {
    before('searching for MARC inventory items', () => {
      cy.searchMARC('Robert C. Klove papers.');
    });

    // FIXME: No results
    it('should find MARC source records', () => {
      cy.expect(MultiColumnList().has({ rowCount: not(0) }));
    });

    describe('opening Derive MARC record page', () => {
      before(() => {
        cy.do([
          MultiColumnList().click({ row: 0, column: 'Robert C. Klove papers.' }),
          Pane(including('Instance')).find(Button('Actions')).click(),
          Button('Derive new MARC bibliographic record').click() // FIXME: is disabled for unknown reason
        ]);
      });

      it('should open Derive MARC record page', () => {
        cy.expect(Page.has({ url: matching(/\/inventory\/quick-marc\/duplicate/) }));
      });

      describe('saving the form', () => {
        before(() => {
          cy.do(Button('Save & close').click());
        });

        it('should redirect to empty inventory item page', () => {
          cy.expect(Page.has({ url: matching(/\/inventory\/view\/(id|.+)/) }));
        });
      });
    });
  });
});

describe('ui-inventory: MARC default subfield', () => {
  before('logs in and navigates to Inventory', () => {
    cy.visit('/');
    cy.login('diku_admin', 'admin');
    cy.do([
      Button('Apps').click(),
      Link('Inventory').click()
    ]);
  });

  after(() => {
    cy.logout();
  });

  describe('editing a MARC record', () => {
    before('searching for MARC inventory items and editing', () => {
      cy.searchMARC('Robert C. Klove papers.');
      cy.do([
        MultiColumnList().click({ row: 0, column: 'Robert C. Klove papers.' }),
        Pane(including('Instance')).find(Button('Actions')).click(),
        Button('Edit in quickMARC').click() // FIXME: is disabled for unknown reason
      ]);
    });

    it('should open Edit MARC record page', () => {
      cy.expect(Page.has({ url: matching(/\/inventory\/quick-marc\/edit/) }));
    });

    // FIXME: I can't open edit page because of disabled edit button to rewrite by using interactors
    describe('adding a new field', () => {
      let newField;

      before(() => {
        cy.get('.quickMarcEditorAddField:last').click();
        newField = cy.get('[class*="quickMarcEditorRow--"]:last-child');
      });

      it('should add default $a subfield', () => {
        newField.find('textarea')
          .should(textArea => expect(textArea.value).to.eq('$a '));
      });

      describe('adding some data to new field and saving', () => {
        before(() => {
          cy.get('[class*="quickMarcEditorRow--"]:last-child').find('textarea').type('Some test data');
          cy.get('[class*="quickMarcEditorRow--"]:last-child').find('input')
            .then(([tag, indicator1, indicator2]) => {
              cy.wrap(tag).type('650');
              cy.wrap(indicator1).type('\\');
              cy.wrap(indicator2).type('\\');
            });

          cy.do(Button('Save & close').click());

          cy.get('#pane-instancedetails [class*="actionMenuToggle--"]', { timeout: 10000 }).click();
          cy.get('#clickable-view-source', { timeout: 10000 }).click();
        });

        it('should show updated data in View MARC record', () => {
          cy.contains('650 ‡a Some test data');
        });
      });
    });
  });
});

describe('ui-inventory: MARC 006/00 field', () => {
  before('logs in and navigates to Inventory', () => {
    cy.visit('/');
    cy.login('diku_admin', 'admin');
    cy.do([
      Button('Apps').click(),
      Link('Inventory').click()
    ]);
  });

  after(() => {
    cy.logout();
  });

  describe('editing a MARC record', () => {
    before('and adding a 006/00 field', () => {
      cy.searchMARC('Robert C. Klove papers.');
      cy.do([
        MultiColumnList().click({ row: 0, column: 'Robert C. Klove papers.' }),
        Pane(including('Instance')).find(Button('Actions')).click(),
        Button('Edit in quickMARC').click() // FIXME: is disabled for unknown reason
      ]);

      // FIXME: I can't open edit page because of disabled edit button to rewrite by using interactors
      cy.get('.quickMarcEditorAddField:last').click();

      cy.get('[class*="quickMarcEditorRow--"]:last-child').find('input')
        .then(([tag]) => {
          cy.wrap(tag).type('006');
        });
    });

    it('should show type select', () => {
      cy.get('[class*="quickMarcEditorRow--"]:last-child').contains('Type');
    });

    describe('adding some data to new 006 field and saving', () => {
      before(() => {
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
          Button('View source').click()
        ]);
      });

      it('should show updated data in View MARC record', () => {
        cy.contains('cjzadgs');
      });
    });
  });
});
