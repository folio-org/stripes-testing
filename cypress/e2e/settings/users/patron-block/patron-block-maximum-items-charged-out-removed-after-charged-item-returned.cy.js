import uuid from 'uuid';
import moment from 'moment';
import TestTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import UserEdit from '../../../../support/fragments/users/userEdit';
import TopMenu from '../../../../support/fragments/topMenu';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import generateUniqueItemBarcodeWithShift from '../../../../support/utils/generateUniqueItemBarcodeWithShift';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../../../support/fragments/users/users';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Conditions from '../../../../support/fragments/settings/users/conditions';
import Limits from '../../../../support/fragments/settings/users/limits';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Patron Block: Maximum number of items charged out', () => {
  const checkedOutBlockMessage = `You have reached the maximum number of items you can check out as set by patron group${getRandomPostfix()}`;
  const patronGroup = {
    name: 'groupToPatronBlock' + getRandomPostfix(),
  };
  const userData = {};
  const itemsData = {
    itemsWithSeparateInstance: [
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
    ],
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    itemsData.itemsWithSeparateInstance.forEach((item, index) => {
      item.barcode = generateUniqueItemBarcodeWithShift(index);
    });

    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: item.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
            itemsData.itemsWithSeparateInstance[index].holdingId =
              specialInstanceIds.holdingIds[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId =
              specialInstanceIds.holdingIds[0].itemIds;
          });
        });
        cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
      });

    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
      cy.createTempUser(
        [
          permissions.uiUsersSettingsOwners.gui,
          permissions.uiUsersCreatePatronConditions.gui,
          permissions.uiUsersCreatePatronLimits.gui,
          permissions.checkinAll.gui,
          permissions.checkoutAll.gui,
          permissions.uiUsersView.gui,
        ],
        patronGroup.name,
      )
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
          userData.barcode = userProperties.barcode;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );

          cy.get('@items').each((item) => {
            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: item.barcode,
              loanDate: moment.utc().format(),
              servicePointId: testData.userServicePoint.id,
              userBarcode: userData.barcode,
            });
          });

          cy.login(userData.username, userData.password);
        });
    });
  });

  after('Deleting created entities', () => {
    cy.get('@items').each((item) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each((item, index) => {
      cy.deleteItemViaApi(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    Conditions.resetConditionViaApi(
      '3d7c52dc-c732-4223-8bf8-e5917801386f',
      'Maximum number of items charged out',
    );
  });

  it(
    'C350647 Verify automated patron block "Maximum number of items charged out" removed after charged item returned (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(SettingsMenu.conditionsPath);
      Conditions.waitLoading();
      Conditions.select('Maximum number of items charged out');
      Conditions.setConditionState(checkedOutBlockMessage);
      cy.visit(SettingsMenu.limitsPath);
      Limits.selectGroup(patronGroup.name);
      Limits.setLimit('Maximum number of items charged out', '4');

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      Users.checkIsPatronBlocked(checkedOutBlockMessage, 'Borrowing, Renewals, Requests');

      cy.visit(TopMenu.checkInPath);
      const itemForCheckIn = itemsData.itemsWithSeparateInstance[0];
      CheckInActions.checkInItemGui(itemForCheckIn.barcode);
      CheckInActions.verifyLastCheckInItem(itemForCheckIn.barcode);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      Users.checkIsPatronBlocked(checkedOutBlockMessage, 'Borrowing');

      cy.visit(SettingsMenu.limitsPath);
      Limits.selectGroup(patronGroup.name);
      Limits.setLimit('Maximum number of items charged out', '5');

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      Users.checkPatronIsNotBlocked(userData.userId);
    },
  );
});
