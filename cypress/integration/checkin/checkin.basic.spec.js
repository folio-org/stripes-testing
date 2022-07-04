import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import checkoutActions from '../../support/fragments/checkout/checkout';
import Users from '../../support/fragments/users/users';
import InTransitModal from '../../support/fragments/checkin/modals/inTransit';
import { Button, Pane, including, Modal } from '../../../interactors';

describe('Check In - Actions ', () => {
  const userData = {
    permissions: [permissions.checkinAll.gui,
      permissions.uiUsersViewLoans.gui,
      permissions.uiUsersView.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiUsersfeefinesCRUD.gui],
  };
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,

  };
  const loanDetailsButton = Button('Loan details');
  const patronDetailsButton = Button('Patron details');
  const itemDetailsButton = Button('Item details');
  const newFeeFineButton = Button('New Fee/Fine');
  const checkInButton = Button('Check in');
  const availableActionsButton = Button({ id: 'available-actions-button-0' });

  function returnCheckIn() {
    cy.do(checkInButton.click());
    cy.do(availableActionsButton.click());
  }

  before('Create New Item, New User and Check out item', () => {
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { itemData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { itemData.holdingTypeId = res[0].id; });
      cy.getLocations({ limit: 1 }).then((res) => { itemData.locationId = res.id; });
      cy.getLoanTypes({ limit: 1 }).then((res) => { itemData.loanTypeId = res[0].id; });
      cy.getMaterialTypes({ limit: 1 }).then((res) => { itemData.materialTypeId = res.id; });
      ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => { itemData.servicepointId = servicePoints[0].id; });
    }).then(() => {
      InventoryInstances.createFolioInstanceViaApi({ instance: {
        instanceTypeId: itemData.instanceTypeId,
        title: itemData.instanceTitle,
      },
      holdings: [{
        holdingsTypeId: itemData.holdingTypeId,
        permanentLocationId: itemData.locationId,
      }],
      items:[{
        barcode: itemData.barcode,
        status:  { name: 'Available' },
        permanentLoanType: { id: itemData.loanTypeId },
        materialType: { id: itemData.materialTypeId },
      }] });
    }).then(specialInstanceIds => {
      itemData.testInstanceIds = specialInstanceIds;
    });

    cy.createTempUser(userData.permissions)
      .then(userProperties => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(itemData.servicepointId,
          userData.userId, itemData.servicepointId);

        const payloadInCheckOutItemRequest = {
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: itemData.servicepointId,
          userBarcode: userData.barcode,
        };

        checkoutActions.createItemCheckoutApi(payloadInCheckOutItemRequest);

        cy.login(userData.username, userData.password, { path: TopMenu.checkInPath, waiter: CheckInActions.waitLoading });
      });
  });

  after('Delete New Service point, Item and User', () => {
    InventoryInstances.deleteInstanceViaApi(itemData.barcode);
    cy.get('@userProperties').then(userProperties => {
      Users.deleteViaApi(userProperties.userId);
    });
  });

  it('C347631 Check in: Basic check in', { tags: [TestTypes.smoke, TestTypes.broken] }, () => {
    CheckInActions.checkInItemGui(itemData.barcode);
    InTransitModal.verifyModalTitle();
    InTransitModal.verifySelectedCheckboxPrintSlip();
    InTransitModal.unselectCheckboxPrintSlip();
    InTransitModal.verifyUnSelectedCheckboxPrintSlip();
    InTransitModal.closeModal();
    cy.get('@userProperties').then(userProperties => {
      CheckInActions.checkActionsMenuOptions();
      cy.do(loanDetailsButton.click());
      cy.expect(Pane(including(userProperties.username)).exists());
      cy.expect(Pane(including('Loan details')).exists());
      returnCheckIn();
      cy.do(patronDetailsButton.click());
      cy.expect(Pane({ title: including(userProperties.username) }).exists());
      returnCheckIn();
      cy.do(itemDetailsButton.click());
      cy.expect(Pane(including(itemData.barcode)).exists());
      returnCheckIn();
      cy.do(newFeeFineButton.click());
      cy.expect(Modal(including('New fee/fine')).exists());
      returnCheckIn();
    });
  });
});

