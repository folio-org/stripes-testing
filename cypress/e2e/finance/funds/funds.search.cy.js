import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Funds from '../../../support/fragments/finance/funds/funds';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('ui-finance: Funds', () => {
  let aUnit;
  let tag;
  let ledger;
  let group;
  let fundType;
  let user;

  const fund = {
    id: uuid(),
    code: `E2ETFC${getRandomPostfix()}`,
    fundStatus: 'Active',
    name: `E2E fund ${getRandomPostfix()}`,
    description: `E2E fund description ${getRandomPostfix()}`,
    externalAccountNo: `fund external  ${getRandomPostfix()}`,
  };

  before(() => {
    cy.getAdminToken();

    cy.getFundTypesApi({ limit: 1 }).then(({ body }) => {
      fundType = body.fundTypes[0];
    });
    cy.getTagsApi({ limit: 1 }).then(({ body }) => {
      tag = body.tags[0];
    });
    cy.getAcqUnitsApi({ limit: 1 }).then(({ body }) => {
      aUnit = body.acquisitionsUnits[0];
    });
    cy.getLedgersApi({ limit: 1 }).then(({ body }) => {
      ledger = body.ledgers[0];
    });
    cy.getGroupsApi({ limit: 1 }).then(({ body }) => {
      group = body.groups[0];
    });

    cy.createTempUser([permissions.uiFinanceViewFundAndBudget.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password);
    });
  });

  beforeEach(() => {
    cy.getAdminToken();
    cy.createFundApi({
      ...fund,
      acqUnitIds: [aUnit.id],
      ledgerId: ledger.id,
      fundTypeId: fundType.id,
      tags: { tagList: [tag.label] },
      groupIds: [group.id],
    });
  });

  afterEach(() => {
    cy.getAdminToken();
    cy.deleteFundApi(fund.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C4059 Test the search and filter options for funds (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'shiftLeft', 'eurekaPhase1'] },
    () => {
      TopMenuNavigation.navigateToApp('Finance');
      FinanceHelp.checkZeroSearchResultsMessage();

      Funds.checkFundFilters(
        ledger.name,
        fundType.name,
        'Active',
        aUnit.name,
        tag.label,
        group.name,
        fund.name,
      );
      Funds.checkSearch();
      // search by name
      Funds.resetFundFilters();
      FinanceHelp.searchByName(fund.name);
      Funds.checkSearch();
      // search by code
      Funds.resetFundFilters();
      FinanceHelp.searchByCode(fund.code);
      Funds.checkSearch();
      // search by external accounts
      Funds.resetFundFilters();
      FinanceHelp.searchByExternalAccount(fund.externalAccountNo);
      Funds.checkSearch();
      // search by all
      Funds.resetFundFilters();
      FinanceHelp.searchByAll(fund.name);
      Funds.checkSearch();
      Funds.resetFundFilters();
      FinanceHelp.searchByAll(fund.code);
      Funds.checkSearch();
      Funds.resetFundFilters();
      FinanceHelp.searchByAll(fund.description);
      Funds.checkSearch();
    },
  );
});
