import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import AcquisitionUnits from '../../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance: Ledgers', () => {
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let userA;

  before(() => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear).then((fiscalYearResponse) => {
      fiscalYear.id = fiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = fiscalYear.id;
    });

    cy.createTempUser([
      permissions.uiFinanceAssignAcquisitionUnitsToNewRecord.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewEditCreateLedger.gui,
      permissions.uiFinanceViewEditDeleteLedger.gui,
    ]).then((userProperties) => {
      userA = userProperties;
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(userA.userId);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(fiscalYear.id);
    AcquisitionUnits.getAcquisitionUnitViaApi({
      query: `"name"="${defaultAcquisitionUnit.name}"`,
    }).then((response) => {
      if (response.acquisitionsUnits && response.acquisitionsUnits.length > 0) {
        AcquisitionUnits.deleteAcquisitionUnitViaApi(response.acquisitionsUnits[0].id);
      }
    });
  });

  it(
    'C367937 Test acquisition unit restrictions for Ledger records (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C367937'] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInAUInfo(defaultAcquisitionUnit.name);
      AcquisitionUnits.assignUser(userA.username);

      cy.login(userA.username, userA.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });

      Ledgers.createLedgerWithAcquisitionUnitAndCaptureId(
        defaultLedger,
        defaultAcquisitionUnit.name,
      );
      Ledgers.checkCreatedLedgerName(defaultLedger);

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.selectAU(defaultAcquisitionUnit.name);
      AcquisitionUnits.unAssignUser(userA.username, defaultAcquisitionUnit.name);

      cy.login(userA.username, userA.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });

      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.checkLedgerNotFound(defaultLedger.name);

      Ledgers.selectStatusInSearch('Active');
      Ledgers.checkLedgerNotInResults(defaultLedger.name);

      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.selectAU(defaultAcquisitionUnit.name);
      AcquisitionUnits.editAU();
      AcquisitionUnits.selectViewCheckbox();

      cy.login(userA.username, userA.password, {
        path: TopMenu.ledgerPath,
        waiter: Ledgers.waitLoading,
      });

      FinanceHelp.searchByName(defaultLedger.name);
      Ledgers.verifyLedgerLinkExists(defaultLedger.name);

      Ledgers.selectLedger(defaultLedger.name);
      Ledgers.waitForLedgerDetailsLoading();
      Ledgers.checkCreatedLedgerName(defaultLedger);
    },
  );
});
