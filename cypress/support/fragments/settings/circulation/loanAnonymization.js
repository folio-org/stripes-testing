import uuid from 'uuid';
import { Button, Pane, RadioButton } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect([Pane('Loan anonymization').exists()]);
    cy.wait(2000);
  },

  selectImmediatelyAfterLoanClosesRadioButton() {
    cy.do(RadioButton({ id: 'immediately-loan-radio-button' }).click());
  },

  saveLoanAnonymizations() {
    cy.do(Button('Save').click());
  },

  verifyLoanAnonymizationsContainsParams(params) {
    this.getLoanAnonymizationsViaApi().then((response) => {
      const value = response.body.circulationSettings[0].value;
      Object.keys(params).forEach((key) => {
        expect(value.closingType[key]).to.contain(params[key]);
      });
    });
  },

  getLoanAnonymizationsViaApi() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'circulation/settings?query=(name==loan_history)',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response;
      });
  },

  setLoanAnonymizationsViaApi(params) {
    return this.getLoanAnonymizationsViaApi().then((loanAnonymizationsResp) => {
      let config = loanAnonymizationsResp.body.circulationSettings[0];

      if (loanAnonymizationsResp.body.circulationSettings.length === 0) {
        config = {
          value: {
            closingType: {
              loan: 'never',
              feeFine: null,
              loanExceptions: [],
            },
            loan: {},
            feeFine: {},
            loanExceptions: [],
            treatEnabled: false,
          },
          name: 'loan_history',
          id: uuid(),
        };

        config.value = {
          ...config.value,
          ...params,
        };

        cy.okapiRequest({
          method: 'POST',
          path: 'circulation/settings',
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
          body: config,
        });
      } else {
        config.value = {
          ...config.value,
          ...params,
        };

        cy.okapiRequest({
          method: 'PUT',
          path: `circulation/settings/${config.id}`,
          body: {
            id: config.id,
            name: config.name,
            enabled: config.enabled,
            value: config.value,
          },
          isDefaultSearchParamsRequired: false,
        });
      }
    });
  },
};
