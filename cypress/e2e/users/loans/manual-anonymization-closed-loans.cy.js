import moment from 'moment';
import uuid from 'uuid';
import { CY_ENV } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import AppPaths from '../../../support/fragments/app-paths';
import checkInActions from '../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../support/fragments/checkout/checkout';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy from '../../../support/fragments/circulation/lost-item-fee-policy';
import OverdueFinePolicy from '../../../support/fragments/circulation/overdue-fine-policy';
import RequestPolicy from '../../../support/fragments/circulation/request-policy';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { getNewItem } from '../../../support/fragments/inventory/item';
import NoticePolicy from '../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import NewFeeFine from '../../../support/fragments/users/newFeeFine';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';

describe('ui-users-loans: Manual anonymization in closed loans', () => {
  const newOwnerData = UsersOwners.getDefaultNewOwner();
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
  const feeFineType = uuid();
  let servicePointId;
  let servicePoints = [];
  const testData = {};
  const policyIds = {};
  const userData = {};
  const loanPolicyBody = {
    id: uuid(),
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
      period: {
        duration: 5,
        intervalId: 'Minutes',
      },
      profileId: 'Rolling',
    },
    renewable: true,
    renewalsPolicy: {
      numberAllowed: 0,
      renewFromId: 'CURRENT_DUE_DATE',
    },
  };

  before(() => {
    let source;

    cy.getAdminToken()
      .then(() => {
        ServicePoints.getViaApi().then((res) => {
          servicePointId = res[0].id;
          servicePoints = res;
        });
        cy.getLocations({ limit: 1 }).then((locations) => {
          testData.locationsId = locations.id;
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        RequestPolicy.createViaApi();
        LostItemFeePolicy.createViaApi();
        OverdueFinePolicy.createViaApi();
        NoticePolicy.createApi();
        LoanPolicy.createViaApi(loanPolicyBody);
      })
      .then(() => {
        policyIds.loan = Cypress.env(CY_ENV.LOAN_POLICY).id;
        policyIds.request = Cypress.env(CY_ENV.REQUEST_POLICY).id;
        policyIds.notice = Cypress.env(CY_ENV.NOTICE_POLICY).id;
        policyIds.overdueFine = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY).id;
        policyIds.lostItemFee = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY).id;
      })
      .then(() => {
        CirculationRules.addRuleViaApi(
          { t: testData.loanTypeId },
          {
            i: policyIds.lostItemFee,
            l: policyIds.loan,
            r: policyIds.request,
            o: policyIds.overdueFine,
            n: policyIds.notice,
          },
        ).then((newRule) => {
          testData.addedRule = newRule;
        });
        source = InventoryHoldings.getHoldingSources({ limit: 1 });
      })
      .then(() => {
        cy.createTempUser([
          permissions.uiUsersViewLoans.gui,
          permissions.uiUsersDeclareItemLost.gui,
          permissions.uiUserLoansAnonymize.gui,
          permissions.uiFeeFines.gui,
          permissions.uiInventoryViewInstances.gui,
        ]).then(({ username, password, userId, barcode: userBarcode }) => {
          userData.userId = userId;
          UserEdit.addServicePointViaApi(servicePointId, userId).then(() => {
            const servicePointOwner = servicePoints.map(({ id, name }) => ({
              value: id,
              label: name,
            }));

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: getTestEntityValue(),
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.locationsId,
                  sourceId: source.id,
                },
              ],
              items: [
                {
                  ...newFirstItemData,
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
                {
                  ...newSecondItemData,
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialTypeId },
                },
              ],
            })
              .then((specialInstanceIds) => {
                testData.instanceId = specialInstanceIds.instanceId;
                testData.holdingId = specialInstanceIds.holdingIds[0].id;
                testData.itemIds = specialInstanceIds.holdingIds[0].itemIds;
              })
              .then(() => {
                cy.wrap([newFirstItemData.barcode, newSecondItemData.barcode]).each(
                  (itemBarcode) => {
                    Checkout.checkoutItemViaApi({
                      itemBarcode,
                      userBarcode,
                      servicePointId,
                    });
                  },
                );

                cy.wrap([newFirstItemData.barcode, newSecondItemData.barcode]).each(
                  (itemBarcode) => {
                    checkInActions.checkinItemViaApi({
                      itemBarcode,
                      servicePointId,
                      checkInDate: moment.utc().format(),
                    });
                  },
                );
                UsersOwners.createViaApi({
                  ...newOwnerData,
                  servicePointOwner,
                }).then((resp) => {
                  testData.userOwnerId = resp.id;
                  cy.createFeesFinesTypeApi({
                    feeFineType,
                    ownerId: newOwnerData.id,
                  });
                });
                cy.login(username, password, {
                  path: AppPaths.getClosedLoansPath(userId),
                  waiter: LoanDetails.waitLoading,
                });
              });
          });
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.deleteFeesFinesTypeApi(Cypress.env('feesFinesType').id);
    UsersOwners.deleteViaApi(testData.userOwnerId);
    cy.wrap(testData.itemIds).each((item) => {
      cy.deleteItemViaApi(item);
    });
    CirculationRules.deleteRuleViaApi(testData.addedRule);
    cy.deleteHoldingRecordViaApi(testData.holdingId);
    InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    RequestPolicy.deleteViaApi(policyIds.request);
    LostItemFeePolicy.deleteViaApi(policyIds.lostItemFee);
    OverdueFinePolicy.deleteViaApi(policyIds.overdueFine);
    NoticePolicy.deleteViaApi(policyIds.notice);
    cy.deleteLoanPolicy(policyIds.loan);
    cy.deleteLoanType(testData.loanTypeId);
    NewFeeFine.getUserFeesFines(userData.userId).then((userFeesFines) => {
      const feesFinesData = userFeesFines.accounts;
      cy.wrap(feesFinesData).each(({ id }) => {
        cy.deleteFeesFinesApi(id);
      });
    });
    Users.deleteViaApi(userData.userId);
  });

  it('C9217 Manual anonymization in closed loans (volaris)', { tags: ['smoke', 'volaris'] }, () => {
    LoanDetails.createFeeFine(newOwnerData.owner, feeFineType);
    LoanDetails.anonymizeAllLoans();
    LoanDetails.checkAnonymizeAllLoansModalOpen();
    LoanDetails.confirmAnonymizeAllLoans();
    LoanDetails.checkAnonymizeModalOpen();
    LoanDetails.closeAnonymizeModal();
    LoanDetails.checkLoanAbsent(newFirstItemData.barcode);
  });
});
