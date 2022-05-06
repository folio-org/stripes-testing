import uuid from 'uuid';
import moment from 'moment';
import TestType from '../../support/dictionary/testTypes';
import renewalActions from '../../support/fragments/loans/renewals';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import permissions from '../../support/dictionary/permissions';
import {
  CY_ENV,
  LIBRARY_DUE_DATE_MANAGMENT,
  LOAN_PROFILE,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Renewal', () => {
  let materialTypeId;
  let loanId;
  let servicePointId;
  let initialCircRules;
  let renewOverrideUserId = '';
  const firstName = 'testPermFirst';
  const renewUserData = {
    firstName,
    lastName: '',
    id: '',
    barcode: '',
  };
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
    cy.getToken(Cypress.env(CY_ENV.DIKU_LOGIN), Cypress.env(CY_ENV.DIKU_PASSWORD))
      .then(() => {
        cy.getInstanceTypes({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
        cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` });
        cy.getMaterialTypes({ query: `name="${MATERIAL_TYPE_NAMES.BOOK}"` })
          .then(materilaTypes => {
            materialTypeId = materilaTypes.id;
          });
        cy.getRequestPolicy();
        cy.getNoticePolicy();
        cy.getOverdueFinePolicy();
        cy.getLostItemFeesPolicy();
        cy.getCirculationRules()
          .then(rules => {
            initialCircRules = rules.rulesAsText;
          });
        cy.getServicePointsApi({ pickupLocation: true })
          .then(servicePoints => {
            servicePointId = servicePoints[0].id;
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
            sourceId: Cypress.env(CY_ENV.HOLDING_SOURCES)[0].id,
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
        cy.createLoanPolicy({
          name: loanPolicyData.name,
          id: loanPolicyData.id,
          loanable: true,
          loansPolicy: {
            closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
            period: {
              duration: 3,
              intervalId: 'Weeks',
            },
            profileId: LOAN_PROFILE.ROLLING,
          },
          renewable: false,
          renewalsPolicy: {
            unlimited: true,
          },
        });
      })
      // create circulation rules
      .then(() => {
        const requestPolicyId = Cypress.env(CY_ENV.REQUEST_POLICY)[0].id;
        const noticePolicyId = Cypress.env(CY_ENV.NOTICE_POLICY)[0].id;
        const overdueFinePolicyId = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY)[0].id;
        const lostItemFeesPolicyId = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY)[0].id;
        const policy = `l ${loanPolicyData.id} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;
        const newRule = `priority: number-of-criteria, criterium (t, s, c, b, a, m, g), last-line\nfallback-policy: ${policy}\nm ${materialTypeId}: ${policy}`;

        cy.updateCirculationRules({
          rulesAsText: newRule,
        });
      })
      // checkout item
      .then(() => {
        cy.createItemCheckout({
          servicePointId,
          itemBarcode: itemData.barcode,
          userBarcode: renewUserData.barcode,
        })
          .then(checkedItem => {
            loanId = checkedItem.body.id;
          });
      });
  });

  after(() => {
    cy.createItemCheckinApi({
      itemBarcode: itemData.barcode,
      servicePointId,
      checkInDate: moment.utc().format(),
    })
      .then(() => {
        cy.deleteUser(renewUserData.id);
        cy.deleteUser(renewOverrideUserId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${itemData.barcode}"` })
          .then((instance) => {
            cy.deleteItem(instance.items[0].id);
            cy.deleteHoldingRecord(instance.holdings[0].id);
            cy.deleteInstanceApi(instance.id);
          });
        cy.updateCirculationRules({
          rulesAsText: initialCircRules,
        });
        cy.deleteLoanPolicy(LOAN_POLICY_ID);
      });
  });

  it('C568 Renewal: failure because loan is not renewable', { tags: [TestType.smoke] }, () => {
    // reason of usage - https://docs.cypress.io/guides/references/error-messages#Uncaught-exceptions-from-your-application
    // eslint-disable-next-line consistent-return
    Cypress.on('uncaught:exception', (err, runnable, promise) => {
      // when the exception originated from an unhandled promise
      // rejection from the original code
      if (promise) {
        return false;
      }
      // we still want to ensure there are no other unexpected
      // errors, so we let them fail the test
    });

    renewalActions.renewWithoutOverrideAccess(loanId, renewUserData.id, itemData);

    cy.createTempUser([
      permissions.loansView.gui,
      permissions.loansRenew.gui,
      permissions.loansRenewOverride.gui,
    ])
      .then(userProperties => {
        renewOverrideUserId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password);

        renewalActions.renewWithOverrideAccess({
          loanId,
          firstName,
          itemData,
          id: renewUserData.id,
          lastName: userProperties.username,
        });
      });
  });
});
