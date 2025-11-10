import { HTML, Pane } from '../../../../../interactors';

const credentialsPane = Pane('Edit knowledge base credentials');
const eHoldingsPane = Pane('eHoldings');

export default {
  getCredentialsViaApi() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'eholdings/kb-credentials',
        contentTypeHeader: 'application/vnd.api+json',
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.data;
      });
  },

  checkKnowledgeBaseExists(knowledgeBaseName, isExist = true) {
    const targetEl = eHoldingsPane.find(HTML(knowledgeBaseName));
    if (isExist) cy.expect(targetEl.exists());
    else cy.expect(targetEl.absent());
  },

  openCredentialsPane(knowledgeBaseName) {
    const targetEl = eHoldingsPane.find(HTML(knowledgeBaseName));
    cy.do(targetEl.click());
    cy.expect(credentialsPane.exists());
  },
};
