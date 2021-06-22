describe('ui-inventory: Derive MARC', () => {
  before('logs in and navigates to Inventory', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/inventory');
  });

  describe('deriving a MARC record', () => {
    before('searching for MARC inventory items', () => {
      cy.searchMARC('Robert C. Klove papers.');
    });

    it('should find MARC source records', () => {
      cy.get('#list-inventory [class*="mclRowContainer--"]').find('[class*="mclRowFormatterContainer--"]').should(rows => expect(rows).to.not.have.length(0));
    });

    describe('opening Derive MARC record page', () => {
      before(() => {
        cy.get('#list-inventory [class*="mclRowContainer--"] [class*="mclRowFormatterContainer--"]:first-child').click();

        // wait for actions button and click it
        cy.get('#pane-instancedetails [class*="actionMenuToggle--"]', { timeout: 10000 }).click();
        cy.get('#duplicate-instance-marc', { timeout: 10000 }).click();
      });

      it('should open Derive MARC record page', () => {
        cy.location().should((loc) => {
          expect(loc.href).to.match(/\/inventory\/quick-marc\/duplicate/);
        });
      });

      describe('saving the form', () => {
        before(() => {
          cy.wait(2000);
          cy.get('#quick-marc-record-save').click();
        });

        it('should redirect to empty inventory item page', () => {
          cy.location().should((loc) => {
            expect(loc.href).to.match(/\/inventory\/view\/(id|.+)/);
          });
        });
      });
    });
  });
});

describe('ui-inventory: MARC default subfield', () => {
  before('logs in and navigates to Inventory', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/inventory');
  });

  describe('editing a MARC record', () => {
    before('searching for MARC inventory items and editing', () => {
      cy.searchMARC('Robert C. Klove papers.');
      cy.get('#list-inventory [class*="mclRowContainer--"] [class*="mclRowFormatterContainer--"]:first-child').click();

      // wait for actions button and click it
      cy.get('#pane-instancedetails [class*="actionMenuToggle--"]', { timeout: 10000 }).click();
      cy.get('#edit-instance-marc', { timeout: 10000 }).click();
    });

    it('should open Edit MARC record page', () => {
      cy.location().should((loc) => {
        expect(loc.href).to.match(/\/inventory\/quick-marc\/edit/);
      });
    });

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

          cy.wait(2000);
          cy.get('#quick-marc-record-save').click();

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
    cy.login('diku_admin', 'admin');
    cy.visit('/inventory');
  });

  describe('editing a MARC record', () => {
    const codes = ['a', 't', 'm', 's', 'e', 'f', 'p', 'c', 'd', 'i', 'j', 'g', 'k', 'r', 'o'];
    const codeBoxesMapping = {
      a: ['Ills', 'Audn', 'Form', 'Cont', 'GPub', 'Conf', 'Fest', 'Indx', 'LitF', 'Biog'],
      t: ['Ills', 'Audn', 'Form', 'Cont', 'GPub', 'Conf', 'Fest', 'Indx', 'LitF', 'Biog'],
      m: ['Audn', 'Form', 'File', 'GPub'],
      s: ['Freq', 'Regl', 'Orig', 'Form', 'EntW', 'Cont', 'SrTp', 'GPub', 'Conf', 'Alph', 'S/L'],
      e: ['Relf', 'Proj', 'CrTp', 'GPub', 'Form', 'Indx', 'SpFm'],
      f: ['Relf', 'Proj', 'CrTp', 'GPub', 'Form', 'Indx', 'SpFm'],
      p: ['Form'],
      c: ['Comp', 'FMus', 'Part', 'Audn', 'Form', 'AccM', 'LTxt', 'TrAr'],
      d: ['Comp', 'FMus', 'Part', 'Audn', 'Form', 'AccM', 'LTxt', 'TrAr'],
      i: ['Comp', 'FMus', 'Part', 'Audn', 'Form', 'AccM', 'LTxt', 'TrAr'],
      j: ['Comp', 'FMus', 'Part', 'Audn', 'Form', 'AccM', 'LTxt', 'TrAr'],
      g: ['Time', 'Audn', 'GPub', 'Form', 'TMat', 'Tech'],
      k: ['Time', 'Audn', 'GPub', 'Form', 'TMat', 'Tech'],
      r: ['Time', 'Audn', 'GPub', 'Form', 'TMat', 'Tech'],
      o: ['Time', 'Audn', 'GPub', 'Form', 'TMat', 'Tech'],
    };

    before('and adding a 006/00 field', () => {
      cy.searchMARC('Robert C. Klove papers.');
      cy.get('#list-inventory [class*="mclRowContainer--"] [class*="mclRowFormatterContainer--"]:first-child').click();

      // wait for actions button and click it
      cy.get('#pane-instancedetails [class*="actionMenuToggle--"]', { timeout: 10000 }).click();
      cy.get('#edit-instance-marc', { timeout: 10000 }).click();

      cy.get('.quickMarcEditorAddField:last').click();

      cy.get('[class*="quickMarcEditorRow--"]:last-child').find('input')
        .then(([tag]) => {
          cy.wrap(tag).type('006');
        });
    });

    it('should show type select', () => {
      cy.get('[class*="quickMarcEditorRow--"]:last-child').contains('Type');
    });

    describe('when selecting different codes', () => {
      it('should show correct boxes', () => {
        codes.forEach(code => {
          cy.get('[class*="quickMarcEditorRow--"]:last-child select').select(code);
          codeBoxesMapping[code].forEach(box => cy.get('[class*="quickMarcEditorRow--"]:last-child').contains(box));
          cy.wait(100);
        });
      });
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

        cy.wait(2000);
        cy.get('#quick-marc-record-save').click();

        cy.get('#pane-instancedetails [class*="actionMenuToggle--"]', { timeout: 10000 }).click();
        cy.get('#clickable-view-source', { timeout: 10000 }).click();
      });

      it('should show updated data in View MARC record', () => {
        cy.contains('cjzadgs');
      });
    });
  });
});
