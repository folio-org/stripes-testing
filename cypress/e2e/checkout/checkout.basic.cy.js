import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import devTeams from '../../support/dictionary/devTeams';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import SettingsMenu from '../../support/fragments/settingsMenu';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import DefaultUser from '../../support/fragments/users/userDefaultObjects/defaultUser';
import Checkout from '../../support/fragments/checkout/checkout';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';

describe('Check Out - Actions ', () => {
  const userData = {
    group: `staff${getRandomPostfix()}`,
    personal: {},
  };
  let patronGroupId = '';
  const testActiveUser = { ...DefaultUser.defaultUiPatron.body };
  testActiveUser.patronGroup = userData.group;
  testActiveUser.personal.lastname = testActiveUser.personal.lastName;
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

  before('Create New Item and New User', () => {
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
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
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
        permissions.uiCirculationSettingsOtherSettings.gui,
        permissions.uiUsersView.gui,
        permissions.uiUsersCreate.gui,
        permissions.inventoryAll.gui,
        permissions.checkoutCirculatingItems.gui,
      ],
      userData.group,
    )
      .then((userProperties) => {
        userData.personal.lastname = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
        userData.firstName = userProperties.firstName;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId, servicePoint.id);

        cy.login(userData.personal.lastname, userData.password, {
          path: SettingsMenu.circulationOtherSettingsPath,
          waiter: OtherSettings.waitLoading,
        });
      });
  });

  after('Delete New Service point, Item and User', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    Users.deleteViaApi(testActiveUser.id);
    PatronGroups.deleteViaApi(patronGroupId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C356772 An active user with barcode can Check out item (vega)',
    { tags: [TestTypes.smoke, devTeams.vega] },
    () => {
      OtherSettings.selectPatronIdsForCheckoutScanning(['Username'], '3');
      cy.visit(TopMenu.usersPath);
      Users.createViaUi(testActiveUser).then((id) => {
        testActiveUser.id = id;
      });
      // eslint-disable-next-line spaced-comment
      //Users.checkIsUserCreated(testActiveUser);
      cy.visit(TopMenu.checkOutPath);
      Checkout.waitLoading();
      // without this waiter, the user will not be found by username
      cy.wait(4000);
      CheckOutActions.checkOutUser(testActiveUser.barcode, testActiveUser.username);
      CheckOutActions.checkUserInfo(testActiveUser, testActiveUser.patronGroup);
      CheckOutActions.checkOutItem(itemData.barcode);
      CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);
    },
  );
});
