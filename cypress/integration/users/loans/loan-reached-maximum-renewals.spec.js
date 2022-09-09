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
import Loans from '../../../support/fragments/users/userDefaultObjects/loans';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';

describe('ui-users-loans: renewal failure because loan has reached maximum renewals', () => {
  const loanTypeName = `autotest_loan_type${getRandomPostfix()}`;
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
  let firstUser = {};
  let secondUser = {};
  let firstInstanceIds;
  let secondInstanceIds;
  let servicePointId;
  let rulesDefaultString;

  beforeEach(() => {
    let source;
    cy.getAdminToken();
    cy.getMaterialTypes({ limit: 1 });
    cy.getInstanceTypes({ limit: 1 });
    cy.getLocations({ limit: 1 });
    cy.getHoldingTypes({ limit: 1 });
    cy.createLoanType({ name: loanTypeName });
    cy.getCirculationRules()
      .then(rules => {
        rulesDefaultString = rules.rulesAsText;
      });

    RequestPolicy.createViaApi();
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
            })
              .then(specialInstanceIds => {
                firstInstanceIds = specialInstanceIds;
              })
              .then(() => {
                [newFirstItemData.barcode].forEach((itemBarcode) => {
                  Checkout.checkoutItemViaApi({
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
            })
              .then(specialInstanceIds => {
                secondInstanceIds = specialInstanceIds;
              })
              .then(() => {
                [newSecondItemData.barcode].forEach((itemBarcode) => {
                  Checkout.checkoutItemViaApi({
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

  afterEach(() => {
    [
      newFirstItemData,
      newSecondItemData,
    ].forEach(item => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId,
        checkInDate: new Date().toISOString(),
      });
    });

    cy.wrap(firstInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecordViaApi(holdingsId.id);
      });
    })).then(() => {
      InventoryInstance.deleteInstanceViaApi(firstInstanceIds.instanceId);
    });

    cy.wrap(secondInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItem(itemId);
      })).then(() => {
        cy.deleteHoldingRecordViaApi(holdingsId.id);
      });
    })).then(() => {
      InventoryInstance.deleteInstanceViaApi(secondInstanceIds.instanceId);
    });

    cy.updateCirculationRules({
      rulesAsText: rulesDefaultString,
    });

    cy.deleteLoanPolicy(Cypress.env(CY_ENV.LOAN_POLICY).id);
    RequestPolicy.deleteApi(Cypress.env(CY_ENV.REQUEST_POLICY).id);
    LostItemFeePolicy.deleteViaApi(Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY).id);
    OverdueFinePolicy.deleteApi(Cypress.env(CY_ENV.OVERDUE_FINE_POLICY).id);
    NoticePolicy.deleteApi(Cypress.env(CY_ENV.NOTICE_POLICY).id);

    Users.deleteViaApi(firstUser.userId);
    Users.deleteViaApi(secondUser.userId);
  });

  it('C569: renewal failure because loan has reached maximum renewalsv (folijet) (prokopovych)', { tags: [testTypes.smoke, DevTeams.folijet] }, () => {
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
    Loans.getLoanDetails(newSecondItemData.barcode);
    LoanDetails.checkStatusCheckedOut();
    LoanDetails.checkRenewalCount();
    LoanDetails.checkAction(0, 'Renewed through override');
  });
});
