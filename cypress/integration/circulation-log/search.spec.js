import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckoutActions from '../../support/fragments/checkout/checkout';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let source;
let servicePointId;

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
            source = InventoryHoldings.getHoldingSources({ limit: 1 });
            cy.getInstanceTypes({ limit: 1 });
            ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
              .then((res) => {
                servicePointId = res[0].id;
              });
            cy.getUsers({
              limit: 1,
              query: `"personal.lastName"="${userProperties.username}" and "active"="true"`
            });
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, userId);
            cy.getUserServicePoints(Cypress.env('users')[0].id);
            cy.createInstance({
              instance: {
                instanceTypeId: Cypress.env('instanceTypes')[0].id,
                title: `Barcode search test ${Number(new Date())}`,
              },
              holdings: [{
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
                sourceId: source.id,
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
            CheckoutActions.createItemCheckoutViaApi({
              itemBarcode: ITEM_BARCODE,
              userBarcode: Cypress.env('users')[0].barcode,
              servicePointId,
            });
          });
      });
  });

  afterEach('reset search results', () => {
    SearchPane.resetResults();
  });

  after('Delete all data', () => {
    CheckinActions.createItemCheckinApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId,
      checkInDate: new Date().toISOString(),
    })
      .then(() => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
          .then((instance) => {
            cy.deleteItem(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          });
        cy.getBlockApi(userId).then(() => {
          cy.deleteBlockApi(Cypress.env('blockIds')[0].id);
        });
        Users.deleteViaApi(userId);
      });
  });

  it('C15484 Filter circulation log on item barcode', { retries: 3, tags: [TestTypes.smoke, devTeams.firebird, TestTypes.broken] }, () => {
    SearchPane.searchByItemBarcode(ITEM_BARCODE);
    SearchPane.verifyResultCells();
  });

  it('C16976 Filter circulation log by date', { retries: 3, tags: [TestTypes.smoke, devTeams.firebird, TestTypes.broken] }, () => {
    const verifyDate = true;

    SearchPane.filterByLastWeek();
    SearchPane.verifyResultCells(verifyDate);
  });

  it('C15485 Filter circulation log on user barcode', { tags: [TestTypes.smoke, devTeams.firebird, TestTypes.broken] }, () => {
    const userBarcode = Cypress.env('users')[0].barcode;

    SearchPane.searchByUserBarcode(userBarcode);
    SearchPane.verifyResultCells();
  });

  it('C15853 Filter circulation log on description', { tags: [TestTypes.smoke, devTeams.firebird, TestTypes.broken] }, () => {
    // login with user that has all permissions
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.usersPath);

    // find user
    UsersSearchPane.searchByStatus('Active');
    UsersSearchPane.searchByKeywords(userId);
    UsersSearchPane.openUser(userId);

    // create patron block
    const searchString = `${getRandomPostfix()}`;
    const testDescription = `test ${searchString} description filter`;

    UsersCard.openPatronBlocks();
    UsersCard.createPatronBlock();
    UsersCard.fillDescription(testDescription);
    UsersCard.saveAndClose();

    // verify circulation logs result
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.searchByDescription(searchString);
    SearchPane.verifyResultCells();
  });
});
