import TopMenu from '../../support/fragments/topMenu';
import uuid from 'uuid';
import moment from 'moment';
import TestType from '../../support/dictionary/testTypes';
import renewalActions from '../../support/fragments/loans/renewals';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import permissions from '../../support/dictionary/permissions';
import {
  CY_ENV,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../support/constants';
import getRandomPostfix from '../../support/utils/stringTools';
import loanPolicyActions from '../../support/fragments/circulation/loan-policy';
import checkoutActions from '../../support/fragments/checkout/checkout';
import checkinActions from '../../support/fragments/check-in-actions/checkInActions';
import users from '../../support/fragments/users/users';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

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
        // create first user
        cy.createTempUser([
          permissions.loansView.gui,
          permissions.loansRenew.gui,
          permissions.uiUsersView.gui,
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
        loanPolicyActions.createLoanableNotRenewableLoanPolicyApi(loanPolicyData);
      })
      // checkout item
      .then(() => {
        checkoutActions.createItemCheckoutViaApi({
          servicePointId,
          itemBarcode: itemData.barcode,
          userBarcode: renewUserData.barcode
        })
          .then(body => {
            loanId = body.id;
          });
      });
  });

  it('C567 Renewal: success, from open loans (multiple items)', { tags: [TestType.smoke] }, () => {
    cy.visit(TopMenu.usersPath);
  });
});
