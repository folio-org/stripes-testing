import uuid from 'uuid';
import moment from 'moment';
import getRandomPostfix from '../../support/utils/stringTools';
import TestType from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import permissions from '../../support/dictionary/permissions';
import RenewalActions from '../../support/fragments/loans/renewals';
import {
  CY_ENV,
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
import CirculationRules from '../../support/fragments/circulation/circulation-rules';

describe('Renewal', () => {
  let materialTypeId;
  let loanId;
  let servicePointId;
  let addedCirculationRule;
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
        InventoryHoldings.getHoldingSources({ limit: 1 }).then(holdingsSources => {
          sourceId = holdingsSources[0].id;
        });
        cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` });
        cy.getMaterialTypes({ query: `name="${MATERIAL_TYPE_NAMES.BOOK}"` })
          .then(materilaTypes => {
            materialTypeId = materilaTypes.id;
          });

        ServicePoints.getViaApi({ pickupLocation: true })
          .then((servicePoints) => {
            servicePointId = servicePoints[0].id;
          });
      })
      .then(() => {
        // create first user
        cy.createTempUser([
          permissions.loansView.gui,
          permissions.loansRenew.gui,
        ])
          .then(userProperties => {
            renewUserData.lastName = userProperties.username;
            renewUserData.id = userProperties.userId;
            renewUserData.barcode = userProperties.barcode;

            cy.login(userProperties.username, userProperties.password);
          });
        // create second user
        cy.createTempUser([
          permissions.loansView.gui,
          permissions.loansRenew.gui,
          permissions.loansRenewOverride.gui,
        ])
          .then(userProperties => {
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
          holdings: [{
            holdingsTypeId: Cypress.env(CY_ENV.HOLDINGS_TYPES)[0].id,
            permanentLocationId: Cypress.env(CY_ENV.LOCATION)[0].id,
            sourceId,
          }],
          items: [[{
            barcode: itemData.barcode,
            status: { name: 'Available' },
            permanentLoanType: { id: Cypress.env(CY_ENV.LOAN_TYPES)[0].id },
            materialType: { id: materialTypeId },
          }]],
        });
      })
      // create loan policy
      .then(() => {
        LoanPolicyActions.createLoanableNotRenewableLoanPolicyApi(loanPolicyData);
      })
      // create circulation rules
      .then(() => {
        CirculationRules.getViaApi().then((circulationRule) => {
          const originalCirculationRules = circulationRule.rulesAsText;
          const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
          ruleProps.l = loanPolicyData.id;
          addedCirculationRule = 'm ' + materialTypeId + ': i ' + ruleProps.i + ' l ' + ruleProps.l + ' r ' + ruleProps.r + ' o ' + ruleProps.o + ' n ' + ruleProps.n;
          CirculationRules.addRuleViaApi(originalCirculationRules, ruleProps, 'm ', materialTypeId);
        });
      })
      // checkout item
      .then(() => {
        Checkout.checkoutItemViaApi({
          servicePointId,
          itemBarcode: itemData.barcode,
          userBarcode: renewUserData.barcode
        })
          .then(body => {
            loanId = body.id;
          });
      });
  });

  after(() => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId,
      checkInDate: moment.utc().format(),
    })
      .then(() => {
        Users.deleteViaApi(renewUserData.id);
        Users.deleteViaApi(renewOverrideUserData.id);
        cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemData.barcode}"` })
          .then((instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          });
        CirculationRules.deleteRuleViaApi(addedCirculationRule);
        cy.deleteLoanPolicy(LOAN_POLICY_ID);
      });
  });

  it('C568 Renewal: failure because loan is not renewable (prokopovych)', { tags: [TestType.smoke, DevTeams.prokopovych] }, () => {
    RenewalActions.renewWithoutOverrideAccess(loanId, renewUserData.id, itemData);
    cy.login(renewOverrideUserData.lastName, renewOverrideUserData.password);
    RenewalActions.renewWithOverrideAccess(
      loanId,
      renewUserData.id,
      itemData
    );
    RenewalActions.startOverriding(itemData);
    RenewalActions.fillOverrideInfo();
    RenewalActions.overrideLoan();
    RenewalActions.checkLoanDetails({ firstName, lastName: renewOverrideUserData.lastName });
  });
});
