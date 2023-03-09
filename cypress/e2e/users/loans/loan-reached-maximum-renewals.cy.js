import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import { getNewItem } from '../../../support/fragments/inventory/item';
import getRandomPostfix, { getTestEntityValue } from '../../../support/utils/stringTools';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import Checkout from '../../../support/fragments/checkout/checkout';
import AppPaths from '../../../support/fragments/app-paths';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import LoansPage from '../../../support/fragments/loans/loansPage';
import RenewConfirmationModal from '../../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../../support/fragments/users/loans/overrideAndRenewModal';
import Loans from '../../../support/fragments/users/userDefaultObjects/loans';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import DevTeams from '../../../support/dictionary/devTeams';
import LoanPolicyActions from '../../../support/fragments/circulation/loan-policy';
import CirculationRules from '../../../support/fragments/circulation/circulation-rules';

describe('ui-users-loans: renewal failure because loan has reached maximum renewals', () => {
  const loanTypeName = `autotest_loan_type${getRandomPostfix()}`;
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
  let loanPolicy;
  let materialType;
  let holdingsSourceId;
  let addedCirculationRule;
  let originalCirculationRules;
  let firstUser = {};
  let secondUser = {};
  let firstInstanceIds;
  let secondInstanceIds;
  let servicePointId;

  beforeEach(() => {
    cy.getAdminToken();
    cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
      materialType = materialTypes;
    });
    InventoryHoldings.getHoldingSources({ limit: 1 }).then((source) => {
      holdingsSourceId = source.id;
    });
    cy.getInstanceTypes({ limit: 1 });
    cy.getLocations({ limit: 1 });
    cy.getHoldingTypes({ limit: 1 });
    cy.createLoanType({ name: loanTypeName });
    ServicePoints.getViaApi()
      .then((res) => {
        servicePointId = res[0].id;
      });

    LoanPolicyActions.createViaApi({
      loanable: true,
      loansPolicy: {
        closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
        period: {
          duration: 5,
          intervalId: 'Minutes'
        },
        profileId: 'Rolling',
      },
      name: getTestEntityValue(),
      renewable: true,
      renewalsPolicy: {
        numberAllowed: 0,
        renewFromId: 'SYSTEM_DATE',
      },
    }).then((policy) => {
      loanPolicy = policy;

      CirculationRules.getViaApi().then((circulationRule) => {
        originalCirculationRules = circulationRule.rulesAsText;
        const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
        const defaultProps = ` i ${ruleProps.i} r ${ruleProps.r} o ${ruleProps.o} n ${ruleProps.n}`;

        addedCirculationRule = `\nm ${materialType.id}: l ${loanPolicy.id} ${defaultProps}`;
        cy.updateCirculationRules({ rulesAsText: `${originalCirculationRules}${addedCirculationRule}` });
      });
    });

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
            sourceId: holdingsSourceId,
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
            sourceId: holdingsSourceId,
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
        cy.deleteItemViaApi(itemId);
      })).then(() => {
        cy.deleteHoldingRecordViaApi(holdingsId.id);
      });
    })).then(() => {
      InventoryInstance.deleteInstanceViaApi(firstInstanceIds.instanceId);
    });

    cy.wrap(secondInstanceIds.holdingIds.forEach(holdingsId => {
      cy.wrap(holdingsId.itemIds.forEach(itemId => {
        cy.deleteItemViaApi(itemId);
      })).then(() => {
        cy.deleteHoldingRecordViaApi(holdingsId.id);
      });
    })).then(() => {
      InventoryInstance.deleteInstanceViaApi(secondInstanceIds.instanceId);
    });
    cy.deleteLoanPolicy(loanPolicy.id);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
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
