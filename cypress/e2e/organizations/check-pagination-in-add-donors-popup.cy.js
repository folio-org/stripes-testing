import permissions from '../../support/dictionary/permissions';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import newOrganization from '../../support/fragments/organizations/newOrganization';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../support/fragments/finance/funds/funds';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import FundEditForm from '../../support/fragments/finance/funds/fundEditForm';
import AddDonorsModal from '../../support/fragments/finance/modals/addDonorsModal';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Organizations', () => {
  let user;
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund, code: `${getRandomPostfix()}_1` };
  const organizationsIds = [];

  before('Create user, fund, and donor organizations', () => {
    cy.getAdminToken();
    for (let i = 0; i < 101; i++) {
      Organizations.createOrganizationViaApi({
        ...newOrganization.defaultUiOrganizations,
        name: `autotest_name_${getRandomPostfix()}_${i}`,
        code: `${getRandomPostfix()}_${i}`,
        isDonor: true,
      }).then((orgId) => {
        organizationsIds.push(orgId);
      });
    }
    FiscalYears.createViaApi(defaultFiscalYear).then((fiscalYearResponse) => {
      defaultFiscalYear.id = fiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = fiscalYearResponse.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;
        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.id;
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiOrganizationsView.gui,
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
    organizationsIds.forEach((organizationId) => {
      Organizations.deleteOrganizationViaApi(organizationId);
    });
    Users.deleteViaApi(user.userId);
  });

  it(
    'C422163 Check pagination in "Add donors" popup (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C422163'] },
    () => {
      FinanceHelp.searchByName(defaultFund.name);
      Funds.selectFund(defaultFund.name);
      Funds.editBudget();
      FundEditForm.expandDonorInformationSection();
      FundEditForm.checkButtonsConditions([
        { label: 'Add donor', conditions: { disabled: false } },
      ]);
      FundEditForm.clickAddDonnorsButton();
      FundEditForm.verifyDonorModal();
      FinanceHelp.selectCheckboxFromResultsList(0);
      AddDonorsModal.verifyTotalSelected(1);
      AddDonorsModal.clickNextPaginationButton();
      AddDonorsModal.selectAllDonorsOnPage();
      AddDonorsModal.verifyTotalSelected(51);
      AddDonorsModal.clickNextPaginationButton();
      FinanceHelp.selectCheckboxFromResultsList(0);
      AddDonorsModal.verifyTotalSelected(52);
      AddDonorsModal.clickPreviousPaginationButton();
      AddDonorsModal.clickSaveButton();
      FundEditForm.clickDonorNameByRow(0);
      FundEditForm.keepEditingFund();
      cy.wait(4000);
      FundEditForm.clickSaveAndCloseButton();
      Funds.editBudget();
      FundEditForm.expandDonorInformationSection();
      FundEditForm.checkButtonsConditions([
        { label: 'Add donor', conditions: { disabled: false } },
      ]);
    },
  );
});
