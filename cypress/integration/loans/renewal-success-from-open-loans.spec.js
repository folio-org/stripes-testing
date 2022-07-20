import uuid from 'uuid';
import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import renewalActions from '../../support/fragments/loans/renewals';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import permissions from '../../support/dictionary/permissions';
import {
  CY_ENV,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../support/constants';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import { getNewItem } from '../../support/fragments/inventory/item';
import loanPolicyActions from '../../support/fragments/circulation/loan-policy';
import checkoutActions from '../../support/fragments/checkout/checkout';
import users from '../../support/fragments/users/users';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

describe('Renewal', () => {
  let materialTypeId;
  let source;

  let loanId;
  let servicePointId;
  let initialCircRules;
  let sourceId;
  let materialType;
  let limitLoanTypeId;
  let loanTypeId;
  const newFirstItemData = getNewItem();
  const newSecondItemData = getNewItem();
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
        cy.getMaterialTypes({ limit: 1 })
          .then(({ id }) => {
            materialType = { id };
          });
        cy.getLoanTypes({ limit: 1, query: 'name="Course reserves"' })
          .then((body) => {
            limitLoanTypeId = body[0].id;
          });
        cy.getLoanTypes({ limit: 1, query: 'name="Reading Room"' })
          .then((body) => {
            loanTypeId = body[0].id;
          });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
      })
      .then(() => {
        source = InventoryHoldings.getHoldingSources({ limit: 1 });
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
        })
          // create loan policy
          .then(() => {
            loanPolicyActions.createLoanableNotRenewableLoanPolicyApi(loanPolicyData);
          });
        // checkout item
        // .then(() => {
        //   checkoutActions.createItemCheckoutViaApi({
        //     servicePointId,
        //     itemBarcode: itemData.barcode,
        //     userBarcode: renewUserData.barcode
        //   })
        //     .then(body => {
        //       loanId = body.id;
        //     });
        // });
      });
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
  });

  it('C567 Renewal: success, from open loans (multiple items)', { tags: [TestType.smoke] }, () => {
    cy.visit(TopMenu.usersPath);
  });
});
