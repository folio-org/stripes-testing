/// <reference types="cypress" />

import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Helper from '../../support/fragments/finance/financeHelper';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import NewServicePoint from '../../support/fragments/service_point/newServicePoint';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints';

describe('Check Out', () => {
  let user = {};
  const FIRST_ITEM_BARCODE = Helper.getRandomBarcode();
  const SECOND_ITEM_BARCODE = Helper.getRandomBarcode();
  const THIRD_ITEM_BARCODE = Helper.getRandomBarcode();
  const FOURTH_ITEM_BARCODE = Helper.getRandomBarcode();
  let userBarcode = '';

  beforeEach(() => {
    const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;

    cy.createTempUser([
      permissions.checkoutCirculatingItems.gui
    ])
      .then(userProperties => {
        user = userProperties;
        const servicePoint = NewServicePoint.getDefaulServicePoint();
        ServicePoints.createViaApi(servicePoint.body);
        cy.addServicePointToUser([servicePoint.body.id],
          user.userId, servicePoint.body.id);
      })
      .then(() => {
        cy.login(user.username, user.password);
        cy.visit(TopMenu.inventoryPath);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 2 });
            cy.getHoldingTypes({ limit: 2 });
            cy.getHoldingSources({ limit: 2 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
              .then((users) => {
                userBarcode = users[0].barcode;
              });
          })
          .then(() => {
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: instanceTitle,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: Cypress.env('holdingSources')[0].id,
              }],
              items: [
                [
                  {
                    barcode: FIRST_ITEM_BARCODE,
                    numberOfPieces: '1',
                    status: { name: 'Available' },
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                  {
                    barcode: SECOND_ITEM_BARCODE,
                    numberOfPieces: '3',
                    status: { name: 'Available' },
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                  {
                    barcode: THIRD_ITEM_BARCODE,
                    numberOfPieces: '2',
                    status: { name: 'Available' },
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                  {
                    barcode: FOURTH_ITEM_BARCODE,
                    numberOfPieces: '1',
                    status: { name: 'Available' },
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  },
                ],
              ],
            });
          });
      });
  });

  it('C591 Check out: multipiece items', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.checkOutPath);
    CheckOutActions.checkIsInterfacesOpened();
    CheckOutActions.checkOutItem(userBarcode, FIRST_ITEM_BARCODE);
    CheckOutActions.checkPatronInformation(user.username, userBarcode);
    CheckOutActions.checkOutItem(userBarcode, SECOND_ITEM_BARCODE);
  });
});
