import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Funds from '../../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import { MultiColumnList } from '../../../../interactors';
import testType from '../../../support/dictionary/testTypes';

describe('ui-finance: Funds list search and filter', () => {
  let aUnit;
  let tag;
  let ledger;
  let group;
  let fundType;

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
    cy.getAdminToken();

    cy.getFundTypesApi({ limit: 1 })
      .then(({ body }) => {
        fundType = body.fundTypes[0];
      });
    cy.getTagsApi({ limit: 1 })
      .then(({ body }) => {
        tag = body.tags[0];
      });
    cy.getAcqUnitsApi({ limit: 1 })
      .then(({ body }) => {
        aUnit = body.acquisitionsUnits[0];
      });
    cy.getLedgersApi({ limit: 1 })
      .then(({ body }) => {
        ledger = body.ledgers[0];
      });
    cy.getGroupsApi({ limit: 1 })
      .then(({ body }) => {
        group = body.groups[0];
      });

    cy.visit(TopMenu.fundPath);
  });

  beforeEach(() => {
    cy.createFundApi({
      ...fund,
      acqUnitIds: [aUnit.id],
      ledgerId: ledger.id,
      fundTypeId: fundType.id,
      tags: { tagList: [tag.label] },
      groupIds: [group.id]
    });
  });

  afterEach(() => {
    cy.deleteFundApi(fund.id);
  });

  it('C4059 Test the search and filter options for funds (thunderjet)', { tags: [testType.smoke] }, function () {
    FinanceHelp.checkZeroSearchResultsMessage();

    Funds.checkFundFilters(ledger.name, fundType.name, 'Active', aUnit.name,
      tag.label, group.name, fund.name);
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
