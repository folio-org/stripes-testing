import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import { getNewItem } from '../../../support/fragments/inventory/item';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';
import { CY_ENV } from '../../../support/constants';

import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import Checkout from '../../../support/fragments/checkout/checkout';
import AppPaths from '../../../support/fragments/app-paths';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import LoansPage from '../../../support/fragments/loans/loansPage';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import OverdueFinePolicy from '../../../support/fragments/circulation/overdue-fine-policy';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import NoticePolicy from '../../../support/fragments/circulation/notice-policy';
import RenewConfirmationModal from '../../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../../support/fragments/users/loans/overrideAndRenewModal';
import loans from '../../../support/fragments/users/userDefaultObjects/loans';

describe('ui-users-loans: renewal failure because loan has reached maximum renewals', () => {
  const loanTypeName = `autotest_loan_type${getRandomPostfix()}`;
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
  let firstUser = {};
  let secondUser = {};

  let servicePointId;

  beforeEach(() => {
    let source;
    cy.getAdminToken();
    cy.getMaterialTypes({ limit: 1 });
    cy.getInstanceTypes({ limit: 1 });
    cy.getLocations({ limit: 1 });
    cy.getHoldingTypes({ limit: 1 });
    cy.createLoanType({ name: loanTypeName });

    RequestPolicy.createApi();
    LostItemFeePolicy.createViaApi();
    OverdueFinePolicy.createApi();
    NoticePolicy.createApi();
    cy.createLoanPolicy({
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
        period: {
          duration: 5,
          intervalId: 'Minutes'
        },
        profileId: 'Rolling',
      },
      renewable: true,
      renewalsPolicy: {
        numberAllowed: 0,
        renewFromId: 'SYSTEM_DATE',
      },
    }).then(() => {
      const loanPolicy = Cypress.env(CY_ENV.LOAN_POLICY).id;
      const requestPolicyId = Cypress.env(CY_ENV.REQUEST_POLICY).id;
      const noticePolicyId = Cypress.env(CY_ENV.NOTICE_POLICY).id;
      const overdueFinePolicyId = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY).id;
      const lostItemFeesPolicyId = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY).id;
      const materialTypeId = Cypress.env('materialTypes').id;
      const policy = `l ${loanPolicy} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;
      const priority = 'priority: number-of-criteria, criterium (t, s, c, b, a, m, g), last-line';
      const newRule = `${priority}\nfallback-policy: ${policy}\nm ${materialTypeId}: ${policy}`;

      cy.updateCirculationRules({
        rulesAsText: newRule,
      });
    }).then(() => {
      cy.then(() => {
        ServicePoints.getViaApi()
          .then((res) => {
            servicePointId = res[0].id;
          });

        source = InventoryHoldings.getHoldingSources({ limit: 1 });
      }).then(() => {
        cy.createTempUser([
          permissions.loansView.gui,
          permissions.loansRenew.gui,
        ]).then(({
          username,
          password,
          userId,
          barcode: userBarcode,
        }) => {
          firstUser = {
            username,
            password,
            userId,
          };
          UserEdit.addServicePointViaApi(servicePointId, userId).then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: getTestEntityValue(),
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
              }],
              items: [
                {
                  ...newFirstItemData,
                  permanentLoanType: { id: Cypress.env('loanTypes').id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }
              ],
            }).then(() => {
              [newFirstItemData.barcode].forEach((itemBarcode) => {
                Checkout.createItemCheckoutViaApi({
                  itemBarcode,
                  userBarcode,
                  servicePointId,
                });
              });
            });
          });
        });
        cy.createTempUser([
          permissions.loansView.gui,
          permissions.loansRenew.gui,
          permissions.loansRenewOverride.gui,
        ]).then(({
          username,
          password,
          userId,
          barcode: userBarcode,
        }) => {
          secondUser = {
            username,
            password,
            userId,
          };
          UserEdit.addServicePointViaApi(servicePointId, userId).then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: getTestEntityValue(),
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
              }],
              items: [
                {
                  ...newSecondItemData,
                  permanentLoanType: { id: Cypress.env('loanTypes').id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }
              ],
            }).then(() => {
              [newSecondItemData.barcode].forEach((itemBarcode) => {
                Checkout.createItemCheckoutViaApi({
                  itemBarcode,
                  userBarcode,
                  servicePointId,
                });
              });
            });
          });
        });
      });
    });
  });

  it('C569: renewal failure because loan has reached maximum renewals', { tags: [testTypes.smoke] }, () => {
    cy.login(
      firstUser.username,
      firstUser.password,
      { path: AppPaths.getOpenLoansPath(firstUser.userId), waiter: LoanDetails.waitLoading },
    );

    LoansPage.renewalMessageCheck('Renew Confirmation');
    LoansPage.checkOverrideButtonHidden();
    LoansPage.closePage();

    cy.login(
      secondUser.username,
      secondUser.password,
      { path: AppPaths.getOpenLoansPath(secondUser.userId), waiter: LoanDetails.waitLoading },
    );

    LoansPage.renewalMessageCheck('Renew Confirmation');
    LoansPage.checkOverrideButtonVisible();
    RenewConfirmationModal.confirmRenewOverrideItem();
    OverrideAndRenewModal.confirmOverrideItem();
    loans.getLoanDetails(newSecondItemData.barcode);
    LoanDetails.checkStatusCheckedOut();
    LoanDetails.checkRenewalCount();
    LoanDetails.checkAction(0, 'Renewed through override');
  });
});
