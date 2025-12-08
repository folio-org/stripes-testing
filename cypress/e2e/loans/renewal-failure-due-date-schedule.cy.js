import uuid from 'uuid';
import {
  CY_ENV,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicyActions from '../../support/fragments/circulation/loan-policy';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import RenewalActions from '../../support/fragments/loans/renewals';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

describe(
  'Renewal',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    let materialTypeId;
    let loanId1;
    let loanId2;
    let servicePointId;
    let sourceId;
    const firstName = 'preferredName testMiddleName';
    const renewUserData = {
      firstName,
      lastName: '',
      id: '',
      barcode: '',
    };
    const renewOverrideUserData = { ...renewUserData };
    let LOAN_POLICY_ID;
    let loanPolicyData = {};
    let itemData1 = {};
    let itemData2 = {};
    let addedRule;

    beforeEach(() => {
      LOAN_POLICY_ID = uuid();
      loanPolicyData = {
        id: LOAN_POLICY_ID,
        name: `Test loan policy ${LOAN_POLICY_ID}`,
      };
      itemData1 = {
        title: `CY_Test instance ${getRandomPostfix()}`,
        status: 'Checked out',
        requests: '0',
        barcode: generateItemBarcode(),
        loanPolicy: loanPolicyData.name,
      };
      itemData2 = {
        title: `CY_Test instance ${getRandomPostfix()}`,
        status: 'Checked out',
        requests: '0',
        barcode: generateItemBarcode(),
        loanPolicy: loanPolicyData.name,
      };
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 });
          cy.getHoldingTypes({ limit: 1 });
          cy.getLocations({ limit: 1 });
          InventoryHoldings.getHoldingSources({ limit: 1 }).then((holdingsSources) => {
            sourceId = holdingsSources[0].id;
          });
          cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` });
          cy.getMaterialTypes({ query: `name="${MATERIAL_TYPE_NAMES.BOOK}"` }).then(
            (materilaTypes) => {
              materialTypeId = materilaTypes.id;
            },
          );
          cy.getRequestPolicy();
          cy.getNoticePolicy();
          cy.getOverdueFinePolicy();
          cy.getLostItemFeesPolicy();
          ServicePoints.getViaApi({ pickupLocation: true }).then((servicePoints) => {
            servicePointId = servicePoints[0].id;
          });
        })
        .then(() => {
          // create first user with view and renew permissions
          cy.createTempUser([permissions.loansView.gui, permissions.loansRenew.gui]).then(
            (userProperties) => {
              renewUserData.lastName = userProperties.username;
              renewUserData.id = userProperties.userId;
              renewUserData.barcode = userProperties.barcode;
              renewUserData.password = userProperties.password;
              renewUserData.username = userProperties.username;
            },
          );
          // create second user with view, renew, and override permissions
          cy.createTempUser([
            permissions.loansView.gui,
            permissions.loansRenew.gui,
            permissions.loansRenewOverride.gui,
          ]).then((userProperties) => {
            renewOverrideUserData.lastName = userProperties.username;
            renewOverrideUserData.id = userProperties.userId;
            renewOverrideUserData.barcode = userProperties.barcode;
            renewOverrideUserData.password = userProperties.password;
            renewOverrideUserData.username = userProperties.username;
          });
        })
        // create first instance
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env(CY_ENV.INSTANCE_TYPES)[0].id,
              title: itemData1.title,
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env(CY_ENV.HOLDINGS_TYPES)[0].id,
                permanentLocationId: Cypress.env(CY_ENV.LOCATION)[0].id,
                sourceId,
              },
            ],
            items: [
              [
                {
                  barcode: itemData1.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: Cypress.env(CY_ENV.LOAN_TYPES)[0].id },
                  materialType: { id: materialTypeId },
                },
              ],
            ],
          });
        })
        .then(() => {
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env(CY_ENV.INSTANCE_TYPES)[0].id,
              title: itemData2.title,
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env(CY_ENV.HOLDINGS_TYPES)[0].id,
                permanentLocationId: Cypress.env(CY_ENV.LOCATION)[0].id,
                sourceId,
              },
            ],
            items: [
              [
                {
                  barcode: itemData2.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: Cypress.env(CY_ENV.LOAN_TYPES)[0].id },
                  materialType: { id: materialTypeId },
                },
              ],
            ],
          });
        })
        // create loan policy with due date schedule that doesn't contain current date
        .then(() => {
          const currentDate = new Date();
          const pastDate = new Date(currentDate);
          pastDate.setDate(currentDate.getDate() - 30);
          const futureDate = new Date(currentDate);
          futureDate.setDate(currentDate.getDate() + 30);

          cy.createLoanPolicy({
            id: loanPolicyData.id,
            name: loanPolicyData.name,
            loanable: true,
            loansPolicy: {
              closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
              period: {
                duration: 3,
                intervalId: 'Weeks',
              },
              profileId: 'Rolling',
            },
            renewable: true,
            renewalsPolicy: {
              numberAllowed: 5,
              renewFromId: 'SYSTEM_DATE',
            },
          });
        })
        // create circulation rules
        .then(() => {
          const requestPolicyId = Cypress.env(CY_ENV.REQUEST_POLICY)[0].id;
          const noticePolicyId = Cypress.env(CY_ENV.NOTICE_POLICY)[0].id;
          const overdueFinePolicyId = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY)[0].id;
          const lostItemFeesPolicyId = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY)[0].id;
          CirculationRules.addRuleViaApi(
            { m: materialTypeId },
            {
              r: requestPolicyId,
              n: noticePolicyId,
              o: overdueFinePolicyId,
              i: lostItemFeesPolicyId,
              l: loanPolicyData.id,
            },
          ).then((newRule) => {
            addedRule = newRule;
          });
        })
        // checkout items
        .then(() => {
          Checkout.checkoutItemViaApi({
            servicePointId,
            itemBarcode: itemData1.barcode,
            userBarcode: renewUserData.barcode,
          }).then((body) => {
            loanId1 = body.id;
          });
        })
        .then(() => {
          Checkout.checkoutItemViaApi({
            servicePointId,
            itemBarcode: itemData2.barcode,
            userBarcode: renewOverrideUserData.barcode,
          }).then((body) => {
            loanId2 = body.id;
          });
        });
    });

    afterEach(() => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(addedRule);
      CheckinActions.checkinItemViaApi({
        itemBarcode: itemData1.barcode,
        servicePointId,
      }).then(() => {
        Users.deleteViaApi(renewUserData.id);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"items.barcode"=="${itemData1.barcode}"`,
        }).then((instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
      CheckinActions.checkinItemViaApi({
        itemBarcode: itemData2.barcode,
        servicePointId,
      }).then(() => {
        Users.deleteViaApi(renewOverrideUserData.id);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"items.barcode"=="${itemData2.barcode}"`,
        }).then((instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
        cy.deleteLoanPolicy(LOAN_POLICY_ID);
      });
    });

    it(
      'C570 Renewal: failure because renewal date is not in loan policy\'s due date schedule (vega)',
      { tags: ['extendedPath', 'vega', 'system', 'C570'] },
      () => {
        // Step 1: Log in as User A (without override permission) and attempt to renew
        cy.login(renewUserData.username, renewUserData.password, {
          path: RenewalActions.generateInitialLink(renewUserData.id, loanId1),
          waiter: () => cy.wait(10000),
        });
        RenewalActions.renewWithoutOverrideAccess(itemData1);

        // Step 2: Log in as User B (with override permission) and attempt to renew
        cy.login(renewOverrideUserData.username, renewOverrideUserData.password, {
          path: RenewalActions.generateInitialLink(renewOverrideUserData.id, loanId2),
          waiter: () => cy.wait(10000),
        });
        RenewalActions.renewWithOverrideAccess(itemData2);

        // Step 3-4: Click override, fill required information
        RenewalActions.startOverriding(itemData2);
        RenewalActions.fillOverrideInfo();

        // Step 5: Override the renewal
        RenewalActions.overrideLoan();

        // Step 6: Navigate to loan details and verify renewal override
        RenewalActions.checkLoanDetails({ firstName, lastName: renewOverrideUserData.lastName });
      },
    );
  },
);
