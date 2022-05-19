import TestTypes from '../../../../support/dictionary/testTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import permissions from '../../../../support/dictionary/permissions';
import Helper from '../../../../support/fragments/finance/financeHelper';
import NewServicePoint from '../../../../support/fragments/service_point/newServicePoint';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Check Out', () => {
  let user = {};
  let userBarcode = '';
  const itemBarcode = Helper.getRandomBarcode();
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  const quantityOfItemPieces = '2';
  let servicePoint;

  beforeEach(() => {
    cy.createTempUser([
      permissions.checkoutCirculatingItems.gui
    ])
      .then(userProperties => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaulServicePoint();
        ServicePoints.createViaApi(servicePoint.body);
        cy.addServicePointToUser([servicePoint.body.id],
          user.userId, servicePoint.body.id);
      })
      .then(() => {
        cy.login(user.username, user.password);
        cy.getUsers({ limit: 1, query: `"personal.lastName"="${user.username}" and "active"="true"` })
          .then((users) => {
            userBarcode = users[0].barcode;
          });
        cy.visit(TopMenu.inventoryPath);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1, query: '"name"="Course Reserve"' });
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
                    barcode: itemBarcode,
                    numberOfPieces: quantityOfItemPieces,
                    status: { name: 'Available' },
                    permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                    materialType: { id: Cypress.env('materialTypes')[0].id },
                  }
                ],
              ],
            });
          });
      });
  });

  it('C591 Check out: multipiece items', { tags: [TestTypes.smoke] }, () => {

  });
});
