import moment from 'moment';
import uuid from 'uuid';
import testTypes from '../../../support/dictionary/testTypes';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import UserEdit from '../../../support/fragments/users/userEdit';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';
import { getNewItem } from '../../../support/fragments/inventory/item';
import UsersOwners, { getNewOwner } from '../../../support/fragments/settings/users/usersOwners';
import permissions from '../../../support/dictionary/permissions';
import Checkout from '../../../support/fragments/checkout/checkout';
import AppPaths from '../../../support/fragments/app-paths';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import { CY_ENV } from '../../../support/constants';
import checkInActions from '../../../support/fragments/check-in-actions/checkInActions';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import OverdueFinePolicy from '../../../support/fragments/circulation/overdue-fine-policy';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import NoticePolicy from '../../../support/fragments/circulation/notice-policy';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('ui-users-loans: Manual anonymization in closed loans', () => {
  const loanTypeName = `autotest_loan_type${getRandomPostfix()}`;
  const newOwnerData = getNewOwner();
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
  const feeFineType = uuid();
  let servicePointId;
  let servicePoints = [];

  beforeEach(() => {
    let source;

    cy.getAdminToken();
    cy.getMaterialTypes({ limit: 1 });
    cy.getInstanceTypes({ limit: 1 });
    cy.getLocations({ limit: 1 });
    cy.getHoldingTypes({ limit: 1 });

    cy.then(() => {
      ServicePoints.getViaApi()
        .then((res) => {
          servicePointId = res[0].id;
          servicePoints = res;
        });

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
          renewFromId: 'CURRENT_DUE_DATE',
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
      });
      source = InventoryHoldings.getHoldingSources({ limit: 1 });
    }).then(() => {
      cy.createTempUser([
        permissions.uiUsersViewLoans.gui,
        permissions.uiUsersDeclareItemLost.gui,
        permissions.uiUserLoansAnonymize.gui,
        permissions.uiFeeFines.gui,
      ]).then(({
        username,
        password,
        userId,
        barcode: userBarcode,
      }) => {
        UserEdit.addServicePointViaApi(servicePointId, userId).then(() => {
          const servicePointOwner = servicePoints.map(({
            id,
            name,
          }) => ({
            value: id,
            label: name,
          }));

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
              }, {
                ...newSecondItemData,
                permanentLoanType: { id: Cypress.env('loanTypes').id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
              },
            ],
          }).then(() => {
            [
              newFirstItemData.barcode,
              newSecondItemData.barcode,
            ].forEach((itemBarcode) => {
              Checkout.createItemCheckoutViaApi({
                itemBarcode,
                userBarcode,
                servicePointId,
              });
            });

            [
              newFirstItemData.barcode,
              newSecondItemData.barcode,
            ].forEach((itemBarcode) => {
              checkInActions.createItemCheckinApi({
                itemBarcode,
                servicePointId,
                checkInDate: moment.utc().format(),
              });
            });

            cy.login(username, password, { path: AppPaths.getClosedLoansPath(userId), waiter: LoanDetails.waitLoading });

            UsersOwners.createViaApi({
              ...newOwnerData,
              servicePointOwner,
            }).then(() => {
              cy.createFeesFinesTypeApi({
                feeFineType,
                ownerId: newOwnerData.id,
              });
            });
          });
        });
      });
    });
  });

  it('C9217 Manual anonymization in closed loans', { tags: [testTypes.smoke] }, () => {
    LoanDetails.createFeeFine(newOwnerData.owner, feeFineType);
    LoanDetails.anonymizeAllLoans();
    LoanDetails.checkAnonymizeModalOpen();
    LoanDetails.closeAnonymizeModal();
    LoanDetails.checkLoanAbsent(newFirstItemData.barcode);
  });
});
