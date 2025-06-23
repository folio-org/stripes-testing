import uuid from 'uuid';
import { Button, Pane, RadioButton } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect([
      Pane('Loan anonymization').exists(),
    ]);
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
      const value = JSON.parse(response.body.configs[0].value);
      Object.keys(params).forEach((key) => {
        expect(value.closingType[key]).to.contain(params[key]);
      });
    });
  },

  getLoanAnonymizationsViaApi() {
    return cy.okapiRequest({
      method: 'GET',
      path: 'configurations/entries?query=(module==LOAN_HISTORY%20and%20configName==loan_history)',
      isDefaultSearchParamsRequired: false,
    }).then((response) => {
      return response;
    });
  },

  setLoanAnonymizationsViaApi(params) {
    return this.getLoanAnonymizationsViaApi()
      .then((loanAnonymizationsResp) => {
        let config = loanAnonymizationsResp.body.configs[0];

        if (loanAnonymizationsResp.body.configs.length === 0) {
          config = {
            value:
              '{"closingType":{"loan":"never","feeFine":null,"loanExceptions":[]},"loan":{},"feeFine":{},"loanExceptions":[],"treatEnabled":false}',
            module: 'LOAN_HISTORY',
            configName: 'loan_history',
            id: uuid(),
          };

          const newValue = { ...JSON.parse(config.value), ...params };
          config.value = JSON.stringify(newValue);

          cy.okapiRequest({
            method: 'POST',
            path: 'configurations/entries',
            isDefaultSearchParamsRequired: false,
            failOnStatusCode: false,
            body: config,
          });
        } else {
          const newValue = { ...JSON.parse(config.value), ...params };
          config.value = JSON.stringify(newValue);

          cy.okapiRequest({
            method: 'PUT',
            path: `configurations/entries/${config.id}`,
            body: {
              id: config.id,
              module: config.module,
              configName: config.configName,
              enabled: config.enabled,
              value: config.value,
            },
            isDefaultSearchParamsRequired: false,
          });
        }
      });
  },
};
