import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import devTeams from '../../support/dictionary/devTeams';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';

describe('Check Out - Actions ', () => {
  const userData = {
    permissions: [
      permissions.checkinAll.gui,
      permissions.uiCirculationViewCreateEditDelete.gui,
      permissions.uiUserCreate.gui,
      permissions.inventoryAll.gui,
      permissions.checkoutCirculatingItems.gui,
    ],
  };
  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: `Instance ${getRandomPostfix()}`,
  };
  let defaultLocation;
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation('autotest basic checkin', uuid());
  const checkInResultsData = ['Available', itemData.barcode];

  before('Create New Item and New User', () => {
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
              status: { name: 'Available' },
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

        cy.login(userData.username, userData.password);
      });
  });

  after('Delete New Service point, Item and User', () => {
    cy.visit('/checkin');
    CheckInActions.checkInItemGui(itemData.barcode);
    CheckInPane.checkResultsInTheRow(checkInResultsData);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id
    );
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it('C356772 An active user with barcode can Check out item (vega)', { tags: [TestTypes.smoke, devTeams.vega] }, () => {
    cy.visit('/checkout');
    CheckOutActions.checkIsInterfacesOpened();
    CheckOutActions.checkOutUser(userData.barcode);
    CheckOutActions.checkUserInfo(userData, 'staff');
    CheckOutActions.checkOutItem(itemData.barcode);
    // cy.verifyItemCheckOut();
    CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);
  });
});
