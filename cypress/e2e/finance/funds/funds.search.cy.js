import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Groups from '../../../support/fragments/finance/groups/groups';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Funds', () => {
  let tag;
  let fundType;
  let user;
  const isAUnitCreated = false;
  const fund = {
    id: uuid(),
    code: `E2ETFC${getRandomPostfix()}`,
    fundStatus: 'Active',
    name: `E2E fund ${getRandomPostfix()}`,
    description: `E2E fund description ${getRandomPostfix()}`,
    externalAccountNo: `fund external  ${getRandomPostfix()}`,
  };
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const group = { ...Groups.defaultUiGroup };
  const aUnit = { ...AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }) };

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(fiscalYear).then((firstFiscalYearResponse) => {
      fiscalYear.id = firstFiscalYearResponse.id;
      ledger.fiscalYearOneId = fiscalYear.id;
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        Groups.createViaApi(group).then((secondGroupResponse) => {
          group.id = secondGroupResponse.id;

          AcquisitionUnits.createAcquisitionUnitViaApi(aUnit)
            .then(() => {
              cy.getAdminUserDetails().then((admin) => {
                AcquisitionUnits.assignUserViaApi(admin.id, aUnit.id);
              });
              cy.getFundTypesApi({ limit: 1 }).then(({ body }) => {
                fundType = body.fundTypes[0];
              });
              cy.getTagsApi({ limit: 1 }).then(({ body }) => {
                tag = body.tags[0];
              });
            })
            .then(() => {
              cy.createFundApi({
                ...fund,
                acqUnitIds: [aUnit.id],
                ledgerId: ledger.id,
                fundTypeId: fundType.id,
                tags: { tagList: [tag.label] },
                groupIds: [group.id],
              });
            });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiFinanceManageAcquisitionUnits.gui,
    ]).then((userProperties) => {
      AcquisitionUnits.assignUserViaApi(userProperties.userId, aUnit.id);
      user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
      Funds.waitLoading();
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.deleteFundApi(fund.id);
    Users.deleteViaApi(user.userId);
    if (isAUnitCreated) cy.deleteAcqUnitApi(aUnit.id);
  });

  it(
    'C4059 Test the search and filter options for funds (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C4059', 'shiftLeft'] },
    () => {
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
