/// <reference types="cypress" />


//import bigtestGlobals from '@bigtest/globals';
import Agreements from '../../support/fragments/agreements/Agreements';
import TopMenu from '../../support/fragments/TopMenu';


//bigtestGlobals.defaultInteractorTimeout = 30000;

describe('Note creation', () => {
  before(() => {
    cy.login('diku_admin', 'admin');
  });
  beforeEach(() => {
    cy.getToken('diku_admin', 'admin')
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
        cy.getUsers({ limit: 1, query: '"personal.firstName"="checkin-all" and "active"="true"' });
      });
  });
  it('Create in Agreements', () => {
    TopMenu.openAgreements();
    Agreements.create();   
    //TODO: add notes management
  })

  after(() => {
    cy.logout();
  });
});
