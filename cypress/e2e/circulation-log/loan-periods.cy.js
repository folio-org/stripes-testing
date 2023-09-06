import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import permissions from '../../support/dictionary/permissions';
import CheckinActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { ITEM_STATUS_NAMES, LOAN_TYPE_NAMES } from '../../support/constants';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import MultipieceCheckOut from '../../support/fragments/checkout/modals/multipieceCheckOut';
import DateTools from '../../support/utils/dateTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';

const ITEM_BARCODE = `123${getRandomPostfix()}`;
let userId;
let servicePointId;

describe('circulation-log loan period', () => {
  before('create inventory instance', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.circulationLogAll.gui,
      permissions.usersViewRequests.gui,
      permissions.checkoutAll.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.circulationLogPath);
      cy.getAdminToken()
        .then(() => {
          cy.getLoanTypes({ limit: 1, query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` });
          cy.getMaterialTypes({ limit: 1 });
          cy.getLocations({ limit: 1 });
          cy.getHoldingTypes({ limit: 1 });
          cy.getInstanceTypes({ limit: 1 });
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
            servicePointId = res[0].id;
          });
          cy.getUsers({
            limit: 1,
            query: `"personal.lastName"="${userProperties.username}" and "active"="true"`,
          });
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePointId, userId);
          cy.getUserServicePoints(Cypress.env('users')[0].id);
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: `Barcode search test ${Number(new Date())}`,
            },
            holdings: [
              {
                holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
                permanentLocationId: Cypress.env('locations')[0].id,
              },
            ],
            items: [
              {
                barcode: ITEM_BARCODE,
                missingPieces: '3',
                numberOfMissingPieces: '3',
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
              },
            ],
          })
            .then((specialInstanceIds) => {
              return specialInstanceIds.instanceId;
            })
            .then((instanceID) => {
              // Getting both instance hrids and putting them into a file alongside with invalid one
              cy.getInstanceById(instanceID);
            });
        })
        .then(() => {
          cy.login(userProperties.username, userProperties.password);
          cy.visit(TopMenu.checkOutPath);
          CheckOutActions.checkOutItemUser(Cypress.env('users')[0].barcode, ITEM_BARCODE);
          MultipieceCheckOut.confirmMultipleCheckOut(ITEM_BARCODE);
        });
    });
  });

  after('delete test data', () => {
    CheckinActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId,
      checkInDate: new Date().toISOString(),
    }).then(() => {
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${ITEM_BARCODE}"`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      Users.deleteViaApi(userId);
    });
  });

  it('C645 Test "Days" loan period', () => {
    const itemDueDate = new Date(Cypress.env('loanTypes')[0].metadata.createdDate);
    CheckOutActions.checkItemDueDate(DateTools.getFormattedDateWithSlashes({ date: itemDueDate }));
  });
});
