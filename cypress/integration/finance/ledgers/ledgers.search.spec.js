import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';

import {
  Accordion,
  Button,
  Checkbox,
  MultiColumnList,
  SearchField,
  Selection,
  SelectionList,
} from '../../../../interactors';
import { testType } from '../../../support/utils/tagTools';

describe('ui-finance: Ledger list search and filters', () => {
  let aUnits;
  let fiscalYears;

  const ledger = {
    id: uuid(),
    name: `E2E ledger ${getRandomPostfix()}`,
    code: `E2ELC${getRandomPostfix()}`,
    description: `E2E ledger description ${getRandomPostfix()}`,
    ledgerStatus: 'Frozen',
    currency: 'USD',
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy
      .okapiRequest({
        path: 'acquisitions-units/units',
        limit: 1,
      })
      .then(({ body }) => {
        aUnits = body.acquisitionsUnits;
      });

    cy
      .okapiRequest({
        path: 'finance/fiscal-years',
        limit: 1,
      })
      .then(({ body }) => {
        fiscalYears = body.fiscalYears;
      });
  });

  beforeEach(() => {
    cy.createLedgerApi({
      ...ledger,
      acqUnitIds: [aUnits[0].id],
      fiscalYearOneId: fiscalYears[0].id,
    });
  });

  afterEach(() => {
    cy.deleteLedgerApi(ledger.id);
  });

<<<<<<< HEAD
  it('C4061 should return ledgers according to ledgers filters and search by different indexes', function () {
=======
  it('C4061 should return ledgers according to ledgers filters and search by all indexes', { tags: [testType.smoke] }, function () {
>>>>>>> origin/master
    cy.do([
      Accordion({ id: 'ledgerStatus' }).clickHeader(),
      Checkbox({ id: 'clickable-filter-ledgerStatus-frozen' }).click(),

      Accordion({ id: 'acqUnitIds' }).clickHeader(),
      Selection({ id: 'acqUnitIds-selection' }).open(),
      SelectionList({ id: 'sl-container-acqUnitIds-selection' }).select(aUnits[0].name),

      SearchField({ id: 'input-record-search' }).fillIn(ledger.name),
      Button('Search').click(),
    ]);

    cy.expect(MultiColumnList({ id: 'ledgers-list' }).has({ rowCount: 1 }));
<<<<<<< HEAD
=======
  });

  it('C4061 should return ledgers according to search by name', { tags: [testType.smoke] }, () => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Name'),
      SearchField({ id: 'input-record-search' }).fillIn(ledger.name),
      Button('Search').click(),
    ]);
>>>>>>> origin/master

    // search by name
    Ledgers.searchByName(ledger.name);
    cy.expect(MultiColumnList({ id: 'ledgers-list' }).has({ rowCount: 1 }));
<<<<<<< HEAD
=======
  });

  it('C4061 should return ledgers according to search by code', { tags: [testType.smoke] }, () => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Code'),
      SearchField({ id: 'input-record-search' }).fillIn(ledger.code),
      Button('Search').click(),
    ]);
>>>>>>> origin/master

    // search by code
    Ledgers.searchByCode(ledger.code);
    cy.expect(MultiColumnList({ id: 'ledgers-list' }).has({ rowCount: 1 }));
  });
});
