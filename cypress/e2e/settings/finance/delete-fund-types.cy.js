import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FundTypes from '../../../support/fragments/settings/finance/fundTypes';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';

describe('Finance › Settings (Finance)', () => {
  const firstFundType = { ...FundTypes.getDefaultFundTypes() };
  const secondFundType = {
    name: `autotest_type_name_${getRandomPostfix()}`,
    id: uuid(),
  };
  const defaultfund = { ...Funds.defaultUiFund };
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
      defaultFiscalYear.id = response.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultfund.ledgerId = defaultLedger.id;
        FundTypes.createFundTypesViaApi(firstFundType).then((fundTypeResponse) => {
          defaultfund.fundTypeId = fundTypeResponse.id;
          FundTypes.createFundTypesViaApi(secondFundType);
          Funds.createViaApi(defaultfund).then((fundResponse) => {
            defaultfund.id = fundResponse.fund.id;
          });
        });
      });
    });

    cy.createTempUser([permissions.uiSettingsFinanceViewEditCreateDelete.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.fundTypesPath,
          waiter: SettingsFinance.waitFundTypesLoading,
        });
      },
    );
  });

  after(() => {
    cy.getAdminToken();
    Funds.deleteFundViaApi(defaultfund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    FundTypes.deleteFundTypesViaApi(firstFundType.id);
  });

  it(
    'C367941 Delete Fund types (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C367941'] },
    () => {
      SettingsFinance.canNotDeleteFundType(firstFundType);
      SettingsFinance.deleteFundType(secondFundType);
    },
  );
});
