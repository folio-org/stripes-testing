describe('making CRUD', () => {
  before(() => {
    cy.visit('/');

    cy.login('diku_admin', 'admin');

    // We rely here on Settings routing,
    // but navigate inside our own module-under-test using UI
    cy.visit('/settings/remote-storage');
    cy.findByRole('link', { name: /configurations/i }).click();
  });

  it('should provide happy path', function () {
    const NAME = 'Test name 1';
    const NAME_EDITED = 'Test name 2 - edited';

    const PROVIDER = 'Dematic EMS';

    // Create
    cy.findByRole('button', { name: /new/i }).click();

    cy.findByRole('dialog', { name: /create configuration/i }).within(() => {
      cy.findByRole('textbox', { name: /remote storage name/i }).should('be.empty').and('have.focus');
      cy.findByRole('combobox', { name: /provider name/i }).should('not.have.value');
      cy.findByRole('button', { name: /cancel/i }).should('be.visible');
      cy.findByRole('button', { name: /save/i }).should('be.visible');
    });

    cy.findByRole('textbox', { name: /remote storage name/i }).type(NAME);
    cy.findByRole('combobox', { name: /provider name/i }).select(PROVIDER);
    cy.findByRole('button', { name: /save/i }).click();

    cy.findAllByRole('dialog').find(':contains(Are you sure)').within(() => {
      cy.findByRole('button', { name: /cancel/i }).should('be.enabled');
      cy.findByRole('button', { name: /save/i })
        .should('be.enabled')
        .click();
    });

    cy.findAllByRole('dialog').should('not.exist');
    cy.findByRole('grid')
      .findByRole('gridcell', { name: NAME })
      .scrollIntoView()
      .click();

    // Read
    cy.findByRole('heading', { name: NAME }).should('be.visible');
    cy.findByRole('button', { name: /actions/i }).should('be.visible').as('actions');
    cy.findByRole('region', { name: /general information/i }).within(() => {
      cy.findByText(NAME).should('be.visible');
      cy.findByText(PROVIDER).should('be.visible');
    });

    // Update
    cy.get('@actions').click();
    cy.findByRole('button', { name: /edit/i }).click();

    cy.findByRole('dialog', { name: `Edit ${NAME}` })
      .as('editor')
      .within(() => {
        cy.findByRole('textbox', { name: /remote storage name/i })
          .as('name')
          .should('have.value', NAME)
          .and('have.focus');
        cy.findByRole('combobox', { name: /provider name/i })
          .findByRole('option', { name: PROVIDER })
          .should('be.selected');
        cy.findByRole('button', { name: /cancel/i }).should('be.visible');
        cy.findByRole('button', { name: /save/i }).should('be.visible').as('save');
      });

    cy.get('@name').clear().type(NAME_EDITED);
    cy.get('@save').click();

    cy.findAllByRole('dialog').find(':contains(Are you sure)').within(() => {
      cy.findByRole('button', { name: /cancel/i }).should('be.enabled');
      cy.findByRole('button', { name: /save/i })
        .should('be.enabled')
        .click();
    });

    cy.findAllByRole('dialog').should('not.exist');
    cy.findByRole('gridcell', { name: NAME }).should('not.exist');
    cy.findByRole('gridcell', { name: NAME_EDITED }).scrollIntoView().click();

    cy.findByRole('heading', { name: NAME_EDITED }).should('be.visible');
    cy.findByRole('region', { name: /general information/i })
      .findByText(NAME_EDITED)
      .should('be.visible');

    // Delete
    cy.get('@actions').click();
    cy.findByRole('button', { name: /delete/i }).click();

    cy.findAllByRole('dialog').find(':contains(Are you sure)').within(() => {
      cy.findByRole('button', { name: /cancel/i }).should('be.enabled');
      cy.findByRole('button', { name: /delete/i })
        .should('be.enabled')
        .click();
    });

    cy.findByRole('dialog').should('not.exist');
    cy.findByRole('gridcell', { name: NAME_EDITED }).should('not.exist');
  });
});
