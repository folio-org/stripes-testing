import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import getRandomPostfix from '../../../support/utils/stringTools';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';
import LedgerEditForm from '../../../support/fragments/finance/ledgers/ledgerEditForm';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { LEDGER_STATUSES, LEDGER_VIEW_FIELDS } from '../../../support/constants';

describe('Finance: Ledgers', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const testLedger = {
    name: `autotest_ledger_${getRandomPostfix()}`,
    code: getRandomPostfix(),
  };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((fiscalYearResponse) => {
      defaultFiscalYear.id = fiscalYearResponse.id;

      cy.createTempUser([Permissions.uiFinanceViewEditCreateLedger.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      Ledgers.deleteLedgerViaApi(testLedger.id);
      FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C347840 Check Enforce all budget checkboxes for ledger (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C347840'] },
    () => {
      Ledgers.clickNewLedger();
      LedgerEditForm.fillInNameField(testLedger.name);
      LedgerEditForm.fillInCodeField(testLedger.code);
      LedgerEditForm.selectFiscalYear(defaultFiscalYear.code);
      LedgerEditForm.clickSaveCloseButton();
      LedgerDetails.checkLedgerDetails({
        information: [
          { key: LEDGER_VIEW_FIELDS.NAME, value: testLedger.name },
          { key: LEDGER_VIEW_FIELDS.CODE, value: testLedger.code },
          { key: LEDGER_VIEW_FIELDS.FISCAL_YEAR, value: defaultFiscalYear.code },
          { key: LEDGER_VIEW_FIELDS.STATUS, value: LEDGER_STATUSES.ACTIVE },
        ],
        encumbranceLimitChecked: true,
        expenditureLimitChecked: true,
      });
      cy.url().then((url) => {
        testLedger.id = url.match(/ledger\/([^/]+)/)?.[1] || null;
      });
      LedgerDetails.selectEditOption();
      LedgerEditForm.clickEncumbranceLimitsCheckbox();
      LedgerEditForm.clickSaveCloseButton();
      LedgerDetails.waitLoading();
      LedgerDetails.checkLedgerDetails({
        encumbranceLimitChecked: false,
        expenditureLimitChecked: true,
      });
    },
  );
});
