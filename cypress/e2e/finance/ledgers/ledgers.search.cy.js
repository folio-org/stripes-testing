import uuid from 'uuid';
import { MultiColumnList } from '../../../../interactors';
import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe(
  'Ledgers',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    let aUnit;
    let user;
    let ledger;
    let isAUnitCreated = false;

    const aUnitName = `E2E AcqUnit ${getRandomPostfix()}`;

    beforeEach(() => {
      ledger = {
        id: uuid(),
        name: `E2E ledger ${getRandomPostfix()}`,
        code: `E2ELC${getRandomPostfix()}`,
        description: `E2E ledger description ${getRandomPostfix()}`,
        ledgerStatus: 'Frozen',
        currency: 'USD',
        restrictEncumbrance: false,
        restrictExpenditures: false,
        acqUnitIds: [],
        fiscalYearOneId: '',
      };

      cy.getAdminToken();

      cy.getAcqUnitsApi({ query: 'name="main"' }).then(({ body }) => {
        if (body.acquisitionsUnits.length === 0) {
          cy.createAcqUnitApi(aUnitName).then((response) => {
            ledger.acqUnitIds = [response.body.id];
            aUnit = response.body;
            isAUnitCreated = true;
          });
        } else {
          ledger.acqUnitIds = [body.acquisitionsUnits[0].id];
          aUnit = body.acquisitionsUnits[0];
        }
      });

      cy.getFiscalYearsApi({ limit: 1 }).then(({ body }) => {
        ledger.fiscalYearOneId = body.fiscalYears[0].id;
        cy.createLedgerApi({
          ...ledger,
        });
      });

      cy.createTempUser([permissions.uiFinanceViewLedger.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);
      });
    });

    afterEach(() => {
      cy.getAdminToken();
      cy.deleteLedgerApi(ledger.id);
      Users.deleteViaApi(user.userId);
      if (isAUnitCreated) cy.deleteAcqUnitApi(aUnit.id);
    });

    it(
      'C4061 Test the search and filter options for ledgers (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C4061'] },
      () => {
        TopMenuNavigation.navigateToApp('Finance');

        FinanceHelp.checkZeroSearchResultsMessage();

        // search by acquisition units, name and status
        Ledgers.searchByStatusUnitsAndName('Frozen', aUnit.name, ledger.name);
        cy.expect(MultiColumnList({ id: 'ledgers-list' }).has({ rowCount: 1 }));

        // search by name only
        Ledgers.resetFilters();
        FinanceHelp.searchByName(ledger.name);
        cy.expect(MultiColumnList({ id: 'ledgers-list' }).has({ rowCount: 1 }));

        // search by code only
        Ledgers.resetFilters();
        FinanceHelp.searchByCode(ledger.code);
        cy.expect(MultiColumnList({ id: 'ledgers-list' }).has({ rowCount: 1 }));
      },
    );
  },
);
