import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Requests from '../../../support/fragments/requests/requests';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Funds', () => {
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultFund = { ...Funds.defaultUiFund };
    const newTagName = `testtag${getRandomPostfix()}`.toLowerCase();
    let user;
    let existingTagId;
    let newTagId;
    const existingTag = {
      label: `existingtag${getRandomPostfix()}`.toLowerCase(),
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.createTagApi(existingTag).then((tagId) => {
        existingTagId = tagId;
      });

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
        permissions.uiFinanceViewEditFundAndBudget.gui,
        permissions.uiTagsPermissionAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Funds.deleteFundViaApi(defaultFund.id);
      Ledgers.deleteLedgerViaApi(defaultLedger.id);
      FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
      Users.deleteViaApi(user.userId);
      cy.getTagsApi({ query: `label=="${newTagName}"`, limit: 1 }).then((response) => {
        if (response.body.tags && response.body.tags.length > 0) {
          newTagId = response.body.tags[0].id;
          cy.deleteTagApi(newTagId);
        }
      });
      if (existingTagId) {
        cy.deleteTagApi(existingTagId);
      }
    });

    it(
      'C6714 Add tags to a fund (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C6714'] },
      () => {
        FinanceHelp.searchByName(defaultFund.name);
        Funds.selectFund(defaultFund.name);
        Funds.waitForFundDetailsLoading();
        Funds.verifyTagsCount(0);

        Funds.openTagsPane();
        Funds.verifyTagsPaneElements();

        Funds.addNewTag(newTagName);
        cy.wait(500);
        InteractorsTools.checkCalloutMessage('New tag created');

        Funds.verifyTagsPaneSubHeader(1);
        Requests.verifyAssignedTags(newTagName);
        Funds.verifyTagsCount(1);

        Funds.closeTagsPane();
        Funds.verifyTagsCount(1);

        Funds.openTagsPane();
        Funds.verifyTagsPaneSubHeader(1);
        Requests.verifyAssignedTags(newTagName);

        Funds.selectExistingTag(existingTag.label);
        Funds.verifyTagsPaneSubHeader(2);
        Requests.verifyAssignedTags(newTagName);
        Requests.verifyAssignedTags(existingTag.label);
        Funds.verifyTagsCount(2);
      },
    );
  });
});
