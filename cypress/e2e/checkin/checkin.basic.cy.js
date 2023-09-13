import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import Checkout from '../../support/fragments/checkout/checkout';
import devTeams from '../../support/dictionary/devTeams';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('Check In - Actions ', () => {
  const userData = {
    permissions: [
      permissions.checkinAll.gui,
      permissions.uiUsersViewLoans.gui,
      permissions.uiUsersView.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiUsersfeefinesCRUD.gui,
    ],
  };
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const checkInResultsData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

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
        checkInResultsData.push(defaultLocation.name);
        Location.createViaApi(defaultLocation);
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          itemData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          itemData.materialTypeId = res.id;
          itemData.materialTypeName = res.name;
          checkInResultsData.push(`${itemData.instanceTitle} (${itemData.materialTypeName})`);
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
              barcode: itemData.barcode,
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

    cy.createTempUser(userData.permissions)
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode: itemData.barcode,
          loanDate: moment.utc().format(),
          servicePointId: servicePoint.id,
          userBarcode: userData.barcode,
        });

        cy.login(userData.username, userData.password);
      });
  });

  after('Delete New Service point, Item and User', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it('C347631 Check in: Basic check in (vega)', { tags: [TestTypes.smoke, devTeams.vega] }, () => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(10000);
    cy.visit(TopMenu.checkInPath);
    CheckInActions.waitLoading();
    CheckInActions.checkInItemGui(itemData.barcode);
    CheckInPane.verifyResultCells();
    CheckInPane.checkResultsInTheRow(checkInResultsData);
    CheckInActions.checkActionsMenuOptions();
    CheckInActions.openLoanDetails(userData.username);
    CheckInActions.openCheckInPane();
    CheckInActions.openPatronDetails(userData.username);
    CheckInActions.openCheckInPane();
    CheckInActions.openItemDetails(itemData.barcode);
    CheckInActions.openCheckInPane();
    CheckInActions.openNewfeefinesPane();
    CheckInActions.openCheckInPane();
  });
});
