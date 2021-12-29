import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import { MultiColumnList } from '../../../../interactors';
import { testType } from '../../../support/utils/tagTools';

describe('ui-finance: Funds list search and filter', () => {
  let aUnits;
  let tags;
  let ledgers;
  let groups;
  let fundTypes;

  const fund = {
    id: uuid(),
    code: `E2ETFC${getRandomPostfix()}`,
    fundStatus: 'Active',
    name: `E2E fund ${getRandomPostfix()}`,
    description: `E2E fund description ${getRandomPostfix()}`,
    externalAccountNo: `fund external  ${getRandomPostfix()}`,
  };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.getFundTypesApi({ limit: 1 })
      .then(({ body }) => {
        fundTypes = body.fundTypes;
      });
    cy.getTagsApi({ limit: 1 })
      .then(({ body }) => {
        tags = body.tags;
      });
    cy.getAcqUnitsApi({ limit: 1 })
      .then(({ body }) => {
        aUnits = body.acquisitionsUnits;
      });
    cy.getLedgersApi({ limit: 1 })
      .then(({ body }) => {
        ledgers = body.ledgers;
      });
    cy.getGroupsApi({ limit: 1 })
      .then(({ body }) => {
        groups = body.groups;
      });

    cy.visit(TopMenu.fundPath);
  });

  beforeEach(() => {
    cy.createFundApi({
      ...fund,
      acqUnitIds: [aUnits[0].id],
      ledgerId: ledgers[0].id,
      fundTypeId: fundTypes[0].id,
      tags: { tagList: [tags[0].label] },
      groupIds: [groups[0].id]
    });
  });

  afterEach(() => {
    cy.deleteFundApi(fund.id);
  });

  it('C4059 should return funds according to fund filters', { tags: [testType.smoke] }, function () {
    FinanceHelp.checkZeroSearchResultsMessageLabel();

    Funds.checkFundFilters(ledgers[0].name, fundTypes[0].name, 'active', aUnits[0].name,
      tags[0].label, groups[0].name);
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));

    // search by name
    Funds.resetFundFilters();
    FinanceHelp.searchByName(fund.name);
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));

    // search by code
    Funds.resetFundFilters();
    FinanceHelp.searchByCode(fund.code);
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));

    // search by external accounts
    Funds.resetFundFilters();
    FinanceHelp.searchByExternalAccount(fund.externalAccountNo);
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));

    // search by all
    Funds.resetFundFilters();
    FinanceHelp.searchByAll(fund.name);
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
    Funds.resetFundFilters();
    FinanceHelp.searchByAll(fund.code);
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
    Funds.resetFundFilters();
    FinanceHelp.searchByAll(fund.description);
    cy.expect(MultiColumnList({ id: 'funds-list' }).has({ rowCount: 1 }));
  });
});
