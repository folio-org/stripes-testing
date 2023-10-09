/* eslint-disable cypress/no-unnecessary-waiting */
import uuid from 'uuid';
import TestType from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import RenewalActions from '../../support/fragments/loans/renewals';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import permissions from '../../support/dictionary/permissions';
import {
  CY_ENV,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';
import LoanPolicyActions from '../../support/fragments/circulation/loan-policy';
import CheckoutActions from '../../support/fragments/checkout/checkout';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import users from '../../support/fragments/users/users';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import TopMenu from '../../support/fragments/topMenu';

describe('Renewal', () => {
  let materialTypeId;
  let servicePointId;
  let initialCircRules;
  let sourceId;
  const secondItemBarcode = `${generateItemBarcode()}2`;
  const firstName = 'testPermFirst';
  const renewUserData = {
    firstName,
    lastName: '',
    id: '',
    barcode: '',
  };
  const loanPolicyId = uuid();
  const loanPolicyData = {
    id: loanPolicyId,
    name: `Test loan policy ${loanPolicyId}`,
  };
  const itemData = {
    title: `CY_Test instance ${getRandomPostfix()}`,
    status: 'Checked out',
    requests: '0',
    barcode: generateItemBarcode(),
    loanPolicy: loanPolicyData.name,
  };
  let userName;

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
        // create user
        cy.createTempUser([permissions.loansView.gui, permissions.loansRenew.gui]).then(
          (userProperties) => {
            renewUserData.lastName = userProperties.username;
            renewUserData.id = userProperties.userId;
            renewUserData.barcode = userProperties.barcode;
            userName = userProperties.username;

            cy.login(userProperties.username, userProperties.password);
          },
        );
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
              {
                barcode: secondItemBarcode,
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
        LoanPolicyActions.createRenewableLoanPolicyApi(loanPolicyData);
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
        CheckoutActions.checkoutItemViaApi({
          servicePointId,
          itemBarcode: itemData.barcode,
          userBarcode: renewUserData.barcode,
        });
        CheckoutActions.checkoutItemViaApi({
          servicePointId,
          itemBarcode: secondItemBarcode,
          userBarcode: renewUserData.barcode,
        });
      });
  });

  after(() => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId,
    });
    CheckinActions.checkinItemViaApi({
      itemBarcode: secondItemBarcode,
      servicePointId,
    }).then(() => {
      users.deleteViaApi(renewUserData.id);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${itemData.barcode}"`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteItemViaApi(instance.items[1].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      cy.updateCirculationRules({
        rulesAsText: initialCircRules,
      });
      cy.deleteLoanPolicy(loanPolicyId);
    });
  });

  it(
    'C567: Renewal: success, from open loans (multiple items) (vega)',
    { tags: [TestType.smoke, DevTeams.vega] },
    () => {
      cy.visit(TopMenu.usersPath);
      cy.intercept('GET', '/configurations/entries?*').as('getEntries');
      UsersSearchPane.searchByKeywords(userName);
      cy.wait('@getEntries');
      // wait few seconds, that the user will be displayed
      cy.wait(2000);
      UsersCard.viewCurrentLoans();
      RenewalActions.renewAllLoans();
      RenewalActions.confirmRenewalsSuccess();
    },
  );
});
