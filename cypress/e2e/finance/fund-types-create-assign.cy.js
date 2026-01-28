import { APPLICATION_NAMES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import SettingsFinance from '../../support/fragments/settings/finance/settingsFinance';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Finance', () => {
  describe('Settings (Finance)', () => {
    let user;
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const fundTypeName = `Test_type${getRandomPostfix()}`;

    before('Create user and fund', () => {
      cy.getAdminToken();
      FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
        defaultFiscalYear.id = defaultFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          defaultFund.ledgerId = defaultLedger.id;
          Funds.createViaApi(defaultFund).then((fundResponse) => {
            defaultFund.id = fundResponse.fund.id;
          });
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceViewEditFundAndBudget.gui,
        Permissions.uiSettingsFinanceViewEditCreateDelete.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.FINANCE);
        SettingsFinance.navigateToFundTypes();
        SettingsFinance.waitFundTypesLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Funds.deleteFundViaApi(defaultFund.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C6651 Create and assign Fund types (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C6651'] },
      () => {
        SettingsFinance.clickNewButton();
        SettingsFinance.fillTypeName('');
        SettingsFinance.checkErrorMessage();
        SettingsFinance.fillTypeName(fundTypeName);
        SettingsFinance.clicksaveButton();
        SettingsFinance.checkFundType(fundTypeName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
        Funds.waitLoading();
        Funds.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.editFund();
        Funds.selectFundType(fundTypeName);
        Funds.save();
        Funds.varifyFundIsSaved();
        Funds.verifyFundType(fundTypeName);
      },
    );
  });
});
