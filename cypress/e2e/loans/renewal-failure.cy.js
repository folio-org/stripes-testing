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

describe('Renewal', () => {
  let materialTypeId;
  let loanId;
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
  const LOAN_POLICY_ID = uuid();
  const loanPolicyData = {
    id: LOAN_POLICY_ID,
    name: `Test loan policy ${LOAN_POLICY_ID}`,
  };
  const itemData = {
    title: `CY_Test instance ${getRandomPostfix()}`,
    status: 'Checked out',
    requests: '0',
    barcode: generateItemBarcode(),
    loanPolicy: loanPolicyData.name,
  };
  let addedRule;

  before(() => {
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
        // create first user
        cy.createTempUser([permissions.loansView.gui, permissions.loansRenew.gui]).then(
          (userProperties) => {
            renewUserData.lastName = userProperties.username;
            renewUserData.id = userProperties.userId;
            renewUserData.barcode = userProperties.barcode;
            renewUserData.password = userProperties.password;
            renewUserData.username = userProperties.username;
          },
        );
        // create second user
        cy.createTempUser([
          permissions.loansView.gui,
          permissions.loansRenew.gui,
          permissions.loansRenewOverride.gui,
        ]).then((userProperties) => {
          renewOverrideUserData.lastName = userProperties.username;
          renewOverrideUserData.id = userProperties.userId;
          renewOverrideUserData.password = userProperties.password;
          renewOverrideUserData.username = userProperties.username;
        });
      })
      // create instance
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env(CY_ENV.INSTANCE_TYPES)[0].id,
            title: itemData.title,
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
                barcode: itemData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env(CY_ENV.LOAN_TYPES)[0].id },
                materialType: { id: materialTypeId },
              },
            ],
          ],
        });
      })
      // create loan policy
      .then(() => {
        LoanPolicyActions.createLoanableNotRenewableLoanPolicyApi(loanPolicyData);
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
      // checkout item
      .then(() => {
        Checkout.checkoutItemViaApi({
          servicePointId,
          itemBarcode: itemData.barcode,
          userBarcode: renewUserData.barcode,
        }).then((body) => {
          loanId = body.id;
        });
      });
  });

  after(() => {
    cy.getAdminToken();
    CirculationRules.deleteRuleViaApi(addedRule);
    CheckinActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId,
    }).then(() => {
      Users.deleteViaApi(renewUserData.id);
      Users.deleteViaApi(renewOverrideUserData.id);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${itemData.barcode}"`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      cy.deleteLoanPolicy(LOAN_POLICY_ID);
    });
  });

  it(
    'C568 Renewal: failure because loan is not renewable (vega)',
    { tags: ['smoke', 'vega', 'system', 'shiftLeftBroken', 'C568'] },
    () => {
      cy.login(renewUserData.username, renewUserData.password);
      cy.wait(2000);
      RenewalActions.renewWithoutOverrideAccess(loanId, renewUserData.id, itemData);
      cy.login(renewOverrideUserData.lastName, renewOverrideUserData.password);
      cy.wait(2000);
      RenewalActions.renewWithOverrideAccess(loanId, renewUserData.id, itemData);
      RenewalActions.startOverriding(itemData);
      RenewalActions.fillOverrideInfo();
      RenewalActions.overrideLoan();
      RenewalActions.checkLoanDetails({ firstName, lastName: renewOverrideUserData.lastName });
    },
  );
});
