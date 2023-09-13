import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import Checkout from '../../support/fragments/checkout/checkout';
import devTeams from '../../support/dictionary/devTeams';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import { getNewItem } from '../../support/fragments/inventory/item';

describe('Check In - Actions ', () => {
  const userData = [
    {
      permissions: [permissions.checkinAll.gui, permissions.checkoutAll.gui],
    },
    {
      permissions: [permissions.checkinAll.gui],
    },
  ];
  const itemData = {
    items: [getNewItem(), getNewItem(), getNewItem(), getNewItem()],
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  let sessionId;
  before('Create New Item, New User and Check out item', () => {
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          itemData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          itemData.holdingTypeId = res[0].id;
        });
        ServicePoints.createViaApi(servicePoint);
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          itemData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          itemData.materialTypeId = res.id;
          itemData.materialTypeName = res.name;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: itemData.instanceTypeId,
            title: itemData.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: itemData.holdingTypeId,
              permanentLocationId: defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.items[0].barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
            {
              barcode: itemData.items[1].barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
            {
              barcode: itemData.items[2].barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
            {
              barcode: itemData.items[3].barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: itemData.loanTypeId },
              materialType: { id: itemData.materialTypeId },
            },
          ],
        });
      })
      .then((specialInstanceIds) => {
        itemData.testInstanceIds = specialInstanceIds;
      });

    cy.createTempUser(userData[0].permissions)
      .then((userProperties) => {
        userData[0].username = userProperties.username;
        userData[0].password = userProperties.password;
        userData[0].userId = userProperties.userId;
        userData[0].barcode = userProperties.barcode;
        userData[0].firstName = userProperties.firstName;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(servicePoint.id, userData[0].userId, servicePoint.id);

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.items[0].barcode,
          loanDate: moment.utc().format(),
          servicePointId: servicePoint.id,
          userBarcode: userData[0].barcode,
        });
        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.items[1].barcode,
          loanDate: moment.utc().format(),
          servicePointId: servicePoint.id,
          userBarcode: userData[0].barcode,
        });
        cy.createTempUser(userData[1].permissions)
          .then((userProperties) => {
            userData[1].username = userProperties.username;
            userData[1].password = userProperties.password;
            userData[1].userId = userProperties.userId;
            userData[1].barcode = userProperties.barcode;
            userData[1].firstName = userProperties.firstName;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePoint.id, userData[1].userId, servicePoint.id);
            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: itemData.items[2].barcode,
              loanDate: moment.utc().format(),
              servicePointId: servicePoint.id,
              userBarcode: userData[1].barcode,
            });
            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: itemData.items[3].barcode,
              loanDate: moment.utc().format(),
              servicePointId: servicePoint.id,
              userBarcode: userData[1].barcode,
            });
          });
      });
  });

  after('Delete New Service point, Item and User', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.items[0].barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData[0].userId, [servicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userData[1].userId, [servicePoint.id]);
    Users.deleteViaApi(userData[0].userId);
    Users.deleteViaApi(userData[1].userId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C398022 Check sessionId does not change when switching to other applications in scope of one check-in session (vega)',
    { tags: [TestTypes.extendedPath, devTeams.vega] },
    () => {
      cy.login(userData[0].username, userData[0].password);
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.getSessionIdAfterCheckInItem(itemData.items[0].barcode).then(
        (responseSessionId) => {
          sessionId = responseSessionId;
        },
      );
      TopMenu.openCheckOutApp();
      Checkout.waitLoading();
      TopMenu.openCheckInApp();
      CheckInActions.waitLoading();
      CheckInActions.getSessionIdAfterCheckInItem(itemData.items[1].barcode).then(
        (responseSessionId) => {
          cy.wrap(responseSessionId).should('equal', sessionId);
        },
      );
    },
  );

  it(
    'C398005 Check sessionId field while check-in (vega)',
    { tags: [TestTypes.extendedPath, devTeams.vega] },
    () => {
      cy.login(userData[1].username, userData[1].password);
      cy.visit(TopMenu.checkInPath);
      CheckInActions.waitLoading();
      CheckInActions.getSessionIdAfterCheckInItem(itemData.items[2].barcode)
        .then((responseSessionId) => {
          sessionId = responseSessionId;
        })
        .then(() => {
          // needed to synchronize with textfield to enter data
          cy.wait(1000);
          CheckInActions.getSessionIdAfterCheckInItem(itemData.items[3].barcode).then(
            (responseSessionId2) => {
              cy.wrap(responseSessionId2).should('equal', sessionId);
            },
          );
        });
    },
  );
});
