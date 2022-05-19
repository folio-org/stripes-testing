import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import usersSearchPane from '../../support/fragments/users/usersSearchPane';
import usersCard from '../../support/fragments/users/usersCard';
import checkinActions from '../../support/fragments/check-in-actions/checkInActions';
import checkoutActions from '../../support/fragments/checkout/checkout';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId = '';


describe('ui-circulation-log', () => {
  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.usersViewRequests.gui
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
        cy.visit(TopMenu.circulationLogPath);
        cy.getAdminToken()
          .then(() => {
            cy.getLoanTypes({ limit: 1 });
            cy.getMaterialTypes({ limit: 1 });
            cy.getLocations({ limit: 1 });
            cy.getHoldingTypes({ limit: 1 });
            cy.getHoldingSources({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            cy.addServicePointToUser(Cypress.env('servicePoints')[0].id, userId);
            cy.getUserServicePoints(Cypress.env('users')[0].id);
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Barcode search test ${Number(new Date())}`,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: Cypress.env('holdingSources')[0].id,
              }],
              items: [
                [{
                  barcode: ITEM_BARCODE,
                  missingPieces: '3',
                  numberOfMissingPieces: '3',
                  status: { name: 'Available' },
                  permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                  materialType: { id: Cypress.env('materialTypes')[0].id },
                }],
              ],
            });
          })
          .then(() => {
            checkoutActions.createItemCheckoutApi({
              itemBarcode: ITEM_BARCODE,
              userBarcode: Cypress.env('users')[0].barcode,
              servicePointId: Cypress.env('userServicePoints')[0].id,
            });
          });
      });
  });

  afterEach('reset search results', () => {
    SearchPane.resetResults();
  });

  after('Delete all data', () => {
    checkinActions.createItemCheckinApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: Cypress.env('servicePoints')[0].id,
      checkInDate: '2021-09-30T16:14:50.444Z',
    });
    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
    cy.getBlockApi(userId).then(() => {
      cy.deleteBlockApi(Cypress.env('blockIds')[0].id);
    });
    cy.deleteUser(userId);
  });

  it('C15484 Filter circulation log on item barcode', { retries: 3, tags: [TestTypes.smoke] }, () => {
    SearchPane.searchByItemBarcode(ITEM_BARCODE);
    SearchPane.verifyResultCells();
  });

  it('C16976 Filter circulation log by date', { retries: 3, tags: [TestTypes.smoke] }, () => {
    const verifyDate = true;

    SearchPane.filterByLastWeek();
    SearchPane.verifyResultCells(verifyDate);
  });

  it('C15485 Filter circulation log on user barcode', { tags: [TestTypes.smoke] }, () => {
    const userBarcode = Cypress.env('users')[0].barcode;

    SearchPane.searchByUserBarcode(userBarcode);
    SearchPane.verifyResultCells();
  });

  it('C15853 Filter circulation log on description', { tags: [TestTypes.smoke] }, () => {
    // login with user that has all permissions
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.usersPath);

    // find user
    usersSearchPane.searchByStatus('Active');
    usersSearchPane.searchByKeywords(userId);
    usersSearchPane.openUser(userId);

    // create patron block
    const searchString = `${getRandomPostfix()}`;
    const testDescription = `test ${searchString} description filter`;

    usersCard.openPatronBlocks();
    usersCard.createPatronBlock();
    usersCard.fillDescription(testDescription);
    usersCard.saveAndClose();

    // verify circulation logs result
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.searchByDescription(searchString);
    SearchPane.verifyResultCells();
  });
});
