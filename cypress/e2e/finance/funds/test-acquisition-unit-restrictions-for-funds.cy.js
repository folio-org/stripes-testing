import Permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let userA;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      Permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
    ]).then((userProperties) => {
      userA = userProperties;
    });
  });

  after(() => {
    cy.getAdminToken();
    Funds.deleteFundsByLedgerIdViaApi(defaultLedger.id, true);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(userA.userId);
    AcquisitionUnits.getAcquisitionUnitViaApi({
      query: `"name"="${defaultAcquisitionUnit.name}"`,
    }).then((response) => {
      AcquisitionUnits.deleteAcquisitionUnitViaApi(response.acquisitionsUnits[0].id);
    });
  });

  it(
    'C163928 Test acquisition unit restrictions for Fund records (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C163928'] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      }).then(() => {
        AcquisitionUnits.newAcquisitionUnit();
        AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
        cy.wait(2000);
        AcquisitionUnits.assignUser(userA.username);
        cy.wait(4000);
      });

      cy.login(userA.username, userA.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
      Funds.createFundWithAU(defaultfund, defaultLedger, defaultAcquisitionUnit.name);

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      }).then(() => {
        AcquisitionUnits.unAssignUser(userA.username, defaultAcquisitionUnit.name);
      });

      cy.login(userA.username, userA.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
      FinanceHelp.searchByName(defaultfund.name);
      Funds.checkZeroSearchResultsHeader();

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
        authRefresh: true,
      });
      AcquisitionUnits.edit(defaultAcquisitionUnit.name);
      AcquisitionUnits.selectViewCheckbox();

      cy.login(userA.username, userA.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
      FinanceHelp.searchByName(defaultfund.name);
      Funds.selectFund(defaultfund.name);
    },
  );
});
