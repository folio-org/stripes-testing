describe('ui-eholdings: Notes', () => {
  before('logs in and navigates to eHoldings', () => {
    cy.login('diku_admin', 'admin');
    cy.visit('/eholdings');
  });

  describe('creating a Note', () => {
    before('searching and opening provider', () => {
      cy.search('EBSCO');
      cy.get('#search-results-content li:first-child').click();
    });

    describe('clicking on note create button', () => {
      before(() => {
        cy.get('#providerShowNotes #note-create').click();
      });

      it('should open Note create page', () => {
        cy.location().should((loc) => {
          expect(loc.href).to.match(/\/eholdings\/notes\/new/);
        });
      });

      describe('filling in data', () => {
        const noteTitle = `[e2e] Note created at ${Date.now()}`;

        before(() => {
          cy.get('input[name="title"]').type(noteTitle);
          cy.get('.ql-editor')
            .type('Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.');

          cy.get('button[type="submit"]').click();
        });

        it('should redirect to Provider show page', () => {
          cy.location().should((loc) => {
            expect(loc.href).to.match(/\/eholdings\/providers\/\d+/);
          });
        });

        it('should display newly created note', () => {
          cy.contains(noteTitle);
        });
      });
    });

    describe('editing a note', () => {
      before(() => {
        cy.get('#providerShowNotes [class*="mclRowFormatterContainer--"]:first-child').click();
        cy.get('[class*="actionMenuToggle--"]').click();
        cy.get('#note-edit-button').click();
      });

      it('should redirect to note edit page', () => {
        cy.location().should((loc) => {
          expect(loc.href).to.match(/\/eholdings\/notes\/[0-9a-z-]+\/edit/);
        });
      });

      describe('making changes to note details', () => {
        const noteEdit = `edited at ${Date.now()}`;

        before(() => {
          cy.get('.ql-editor')
            .type(noteEdit);

          cy.get('button[type="submit"]').click();
        });

        it('should redirect to note view page', () => {
          cy.location().should((loc) => {
            expect(loc.href).to.match(/\/eholdings\/notes\/[0-9a-z-]+/);
          });
        });

        it('should have edited details', () => {
          cy.contains(noteEdit);
        });
      });
    });

    describe('assigning a note', () => {
      before(() => {
        cy.visit('/eholdings');
        cy.search('EBSCO');
        cy.get('#search-results-content li:first-child').click();
        cy.get('#note-assign').click();
      });

      it('should open note modal', () => {
        cy.get('#notes-modal').then(div => expect(div).not.to.be.undefined);
      });

      describe('searching for notes by name', () => {
        before(() => {
          cy.get('input[name="query"]').type('e2e');
          cy.get('#notes-modal button[type="submit"]').click();
        });

        it('should show not empty result list', () => {
          cy.get('#notes-modal-notes-list [class*="mclRowFormatterContainer--"]')
            .then(rows => expect(rows).to.not.have.length(0));
        });
      });

      describe('searching unassigned notes', () => {
        before(() => {
          cy.get('#clickable-filter-notesStatus-assigned').click();

          cy.get('#notes-select-all-checkbox').click();
          cy.get('#notes-modal-save').click();
          cy.get('#note-assign').click();

          cy.get('#clickable-filter-notesStatus-unassigned').click();
        });

        it('should show not empty result list', () => {
          cy.get('#notes-modal-notes-list [class*="mclRowFormatterContainer--"]')
            .then(rows => expect(rows).to.not.have.length(0));
        });

        describe('assigning a note', () => {
          let noteTitle;

          before(() => {
            cy.get('.notes-assign-checkbox').then(checkboxes => {
              cy.wrap(checkboxes[0]).click();
            });
            noteTitle = cy.get('#notes-modal-notes-list .note-title')
              .then(titles => noteTitle = titles[0].innerText);

            cy.get('#notes-modal-save').click();
          });

          it('should show assigned note', () => {
            cy.contains(noteTitle);
          });
        });
      });
    });
  });
});
