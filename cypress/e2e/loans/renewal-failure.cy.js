import uuid from 'uuid';
import getRandomPostfix from '../../support/utils/stringTools';
import TestType from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Parallelization from '../../support/dictionary/parallelization';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import permissions from '../../support/dictionary/permissions';
import RenewalActions from '../../support/fragments/loans/renewals';
import {
  CY_ENV,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../support/constants';
import LoanPolicyActions from '../../support/fragments/circulation/loan-policy';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Checkout from '../../support/fragments/checkout/checkout';

describe('Renewal', () => {
  let materialTypeId;
  let loanId;
  let servicePointId;
  let initialCircRules;
  let sourceId;
  const firstName = 'testPermFirst';
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
        cy.getCirculationRules().then((rules) => {
          initialCircRules = rules.rulesAsText;
        });
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

            cy.login(userProperties.username, userProperties.password);
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
        const policy = `l ${loanPolicyData.id} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;
        const priority = 'priority: number-of-criteria, criterium (t, s, c, b, a, m, g), last-line';
        const newRule = `${priority}\nfallback-policy: ${policy}\nm ${materialTypeId}: ${policy}`;

        cy.updateCirculationRules({
          rulesAsText: newRule,
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
      cy.updateCirculationRules({
        rulesAsText: initialCircRules,
      });
      cy.deleteLoanPolicy(LOAN_POLICY_ID);
    });
  });

  it(
    'C568 Renewal: failure because loan is not renewable (vega)',
    { tags: [TestType.smoke, DevTeams.vega, Parallelization.nonParallel] },
    () => {
      RenewalActions.renewWithoutOverrideAccess(loanId, renewUserData.id, itemData);
      cy.login(renewOverrideUserData.lastName, renewOverrideUserData.password);
      RenewalActions.renewWithOverrideAccess(loanId, renewUserData.id, itemData);
      RenewalActions.startOverriding(itemData);
      RenewalActions.fillOverrideInfo();
      RenewalActions.overrideLoan();
      RenewalActions.checkLoanDetails({ firstName, lastName: renewOverrideUserData.lastName });
    },
  );
});
