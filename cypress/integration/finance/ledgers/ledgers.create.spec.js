import uuid from 'uuid';
import Ledgers from '../../../support/fragments/finance/ledgers/Ledgers';

import {
  Accordion,
  Checkbox,
  MultiColumnList,
  SearchField,
  Selection,
  Button,
  SelectionList,
} from '../../../../interactors';

describe('ui-finance: Ledger list search and filters', () => {

  before(() => {
    cy.login('diku_admin', 'admin')
    .then(() => {
        cy.visit('/finance/ledger');
      });
  });

  it('should create new ledger if mandatory fields are filled', function () {
    cy.do(Ledgers.createDefaultLedger());
  });
});
