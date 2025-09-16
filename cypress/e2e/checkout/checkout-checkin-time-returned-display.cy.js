import { ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Check out and Check in with End Session', () => {
  const userData = {
    group: getTestEntityValue('staff$'),
    personal: {},
  };
  let patronGroupId = '';

  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('Instance'),
  };
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(servicePoint);
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          itemData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          itemData.holdingTypeId = res[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          itemData.loanTypeId = res[0].id;
        });
        cy.getBookMaterialType({ limit: 1 }).then((res) => {
          itemData.materialTypeId = res.id;
          itemData.materialTypeName = res.name;
        });
        PatronGroups.createViaApi(userData.group).then((patronGroupResponse) => {
          patronGroupId = patronGroupResponse;
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

    cy.createTempUser(
      [
        permissions.checkoutCirculatingItems.gui,
        permissions.checkinAll.gui,
        permissions.uiUsersView.gui,
        permissions.inventoryAll.gui,
      ],
      userData.group,
    )
      .then((userProperties) => {
        userData.personal.lastname = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
        userData.username = userProperties.username;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroupId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C411866 Verify "Time returned" is displayed correctly in Check in app (volaris)',
    { tags: ['extendedPath', 'volaris', 'C411866'] },
    () => {
      cy.login(userData.personal.lastname, userData.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });
      cy.wait(1000);

      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkUserInfo(userData, userData.patronGroup);

      CheckOutActions.checkOutItem(itemData.barcode);
      CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);

      CheckOutActions.endCheckOutSession();

      TopMenu.openCheckInApp();
      CheckInActions.waitLoading();
      CheckInActions.checkInItemGui(itemData.barcode);

      CheckInPane.verifyResultCells();
      CheckInPane.checkResultsInTheRow([ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode]);
    },
  );
});
