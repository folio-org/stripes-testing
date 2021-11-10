/// <reference types="cypress" />

import Agreements from '../../support/fragments/agreements/agreements';
import AgreementDetails from '../../support/fragments/agreements/agreementsDetails';
import TopMenu from '../../support/fragments/topMenu';



describe('Note creation', () => {
  it('C1296 Create into Agreement', () => {
    // TODO: add support of special permissions in special account
    cy.login('diku_admin', 'admin');
    // TODO: move agreement creation into api requests
    TopMenu.openAgreements();
    Agreements.create();
    Agreements.selectRecord();
    AgreementDetails.openNotesSection();
    AgreementDetails.createNote();
    Agreements.selectRecord();
    AgreementDetails.checkNotesCount(1);
    AgreementDetails.openNotesSection();
    AgreementDetails.specialNotePresented();
    // TODO: add support of delete through api
    AgreementDetails.remove();
  });
});
