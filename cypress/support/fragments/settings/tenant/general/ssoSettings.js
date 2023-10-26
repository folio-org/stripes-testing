import { including, TextField } from '@interactors/html';

import { Pane, Select } from '../../../../../../interactors';

const providerUrl = (disabled) => TextField(including('Identity Provider URL'), { disabled });
const samlBinding = (disabled) => Select(including('SAML binding'), { disabled });
const samlAttribute = (disabled) => TextField(including('SAML attribute'), { disabled });
const userProperty = (disabled) => Select(including('User property'), { disabled });

export default {
  waitLoading() {
    cy.expect(Pane('SSO settings').exists());
  },
  checkPaneContent(disabled = false) {
    cy.expect([
      providerUrl(disabled).exists(),
      samlBinding(disabled).exists(),
      samlAttribute(disabled).exists(),
      userProperty(disabled).exists(),
    ]);
  },
};
