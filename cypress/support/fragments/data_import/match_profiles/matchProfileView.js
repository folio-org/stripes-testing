/* eslint-disable cypress/no-unnecessary-waiting */
import moment from 'moment';
import { HTML, including } from '@interactors/html';
import { Button, Pane, Accordion } from '../../../../../interactors';

const viewPane = Pane({ id: 'view-match-profile-pane' });
const actionsButton = Button('Actions');
const accordionProfileDetails = Accordion({ id: 'view-match-profile-details' });

export default {
  edit: () => {
    // wait is needed to avoid so fast robot clicks
    cy.wait(1500);
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Edit').click());
    // need to wait until the page will be laoded
    cy.wait(1000);
    cy.expect(Accordion('Match criterion').exists());
  },

  duplicate() {
    cy.wait(2000);
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Duplicate').click());
  },

  delete() {
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Delete').click());
  },

  closeViewMode: () => cy.do(viewPane.find(Button({ icon: 'times' })).click()),

  verifyExistingInstanceRecordField: () => {
    cy.expect(viewPane.find(HTML(including('Admin data: Instance UUID'))).exists());
  },
  verifyMatchProfileOpened: () => {
    cy.expect(Pane({ id: 'pane-results' }).exists());
    cy.expect(viewPane.exists());
  },

  verifyActionMenuAbsent: () => cy.expect(viewPane.find(actionsButton).absent()),
  verifyMatchProfileTitleName: (profileName) => cy.get('#view-match-profile-pane-content h2').should('have.text', profileName),
  verifyMatchProfileWithIncomingAndExistingValue(
    { profileName, incomingRecordFields, existingRecordFields, existingRecordType },
    recordType,
  ) {
    this.verifyMatchProfileTitleName(profileName);
    cy.get(`[data-id="${existingRecordType}"]`).should('contain', recordType);
    cy.contains(`Incoming ${recordType} record`)
      .parent()
      .should('include.text', incomingRecordFields.field);
    cy.contains(`Incoming ${recordType} record`)
      .parent()
      .should('include.text', incomingRecordFields.in1);
    cy.contains(`Incoming ${recordType} record`)
      .parent()
      .should('include.text', incomingRecordFields.in2);
    cy.contains(`Incoming ${recordType} record`)
      .parent()
      .should('include.text', incomingRecordFields.subfield);
    cy.contains(`Existing ${recordType} record`)
      .parent()
      .should('include.text', existingRecordFields.field);
    cy.contains(`Existing ${recordType} record`)
      .parent()
      .should('include.text', existingRecordFields.in1);
    cy.contains(`Existing ${recordType} record`)
      .parent()
      .should('include.text', existingRecordFields.in2);
    cy.contains(`Existing ${recordType} record`)
      .parent()
      .should('include.text', existingRecordFields.subfield);
  },
  verifyMatchProfileWithFolioRecordValue(
    { profileName, incomingRecordFields, instanceOption },
    recordType,
  ) {
    this.verifyMatchProfileTitleName(profileName);
    cy.contains(`Incoming ${recordType} record`)
      .parent()
      .should('include.text', incomingRecordFields.field);
    cy.contains('Existing Instance record field').parent().should('include.text', instanceOption);
  },

  verifyMatchProfileWithStaticValueAndFolioRecordValue({
    profileName,
    incomingStaticValue,
    incomingStaticRecordValue,
    existingRecordOption,
  }) {
    this.verifyMatchProfileTitleName(profileName);
    cy.contains('Incoming Static value (submatch only) record')
      .parent()
      .should('include.text', incomingStaticRecordValue);
    if (incomingStaticRecordValue === 'Date') {
      cy.contains('Incoming Static value (submatch only) record')
        .parent()
        .should('include.text', moment(new Date()).format('MM/D/YYYY'));
    }
    if (incomingStaticRecordValue === 'Date range') {
      cy.contains('Incoming Static value (submatch only) record')
        .parent()
        .invoke('text')
        .then((text) => {
          const startDate = moment(new Date()).format('MM/D/YYYY');
          const endDate = moment(new Date()).format('MM/D/YYYY');
          const expectedText = `From${startDate}To${endDate}`;

          cy.wrap(text).should('include', expectedText);
        });
    }
    if (incomingStaticRecordValue === 'Text' || incomingStaticRecordValue === 'Number') {
      cy.contains('Incoming Static value (submatch only) record')
        .parent()
        .should('include.text', incomingStaticValue);
    }
    cy.contains('Existing Holdings record field')
      .parent()
      .should('include.text', existingRecordOption);
  },

  verifyExistingDetails: (recordItem) => {
    cy.expect(accordionProfileDetails.find(Button({ dataId: recordItem })).exists());
  },
};
