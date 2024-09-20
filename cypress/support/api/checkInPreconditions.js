import moment from 'moment';
import uuid from 'uuid';
import ServicePoints from '../fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../fragments/users/userEdit';
import InventoryInstances from '../fragments/inventory/inventoryInstances';
import Users from '../fragments/users/users';
import Checkout from '../fragments/checkout/checkout';
import Location from '../fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../constants';

export default {
  createTestItemViaApi(testData) {
    return cy
      .wrap(true)
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.item.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          testData.item.holdingTypeId = res[0].id;
        });
        ServicePoints.createViaApi(testData.servicePoint);
        testData.location = Location.getDefaultLocation(testData.servicePoint.id);
        testData.checkInRowData.push(testData.location.name);
        Location.createViaApi(testData.location);
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.item.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.item.materialTypeId = res.id;
          testData.item.materialTypeName = res.name;
          testData.checkInRowData.push(
            `${testData.item.instanceTitle} (${testData.item.materialTypeName})`,
          );
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.item.instanceTypeId,
            title: testData.item.instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: testData.item.holdingTypeId,
              permanentLocationId: testData.location.id,
            },
          ],
          items: [
            {
              barcode: testData.item.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.item.loanTypeId },
              materialType: { id: testData.item.materialTypeId },
            },
          ],
        });
      })
      .then((specialInstanceIds) => {
        testData.item.testInstanceIds = specialInstanceIds;
        testData.checkInRowData.push(testData.item.barcode);
      });
  },

  createTestUserViaApi(testData) {
    return cy
      .createTempUser(testData.user.permissions)
      .then((userProperties) => {
        testData.user.username = userProperties.username;
        testData.user.password = userProperties.password;
        testData.user.userId = userProperties.userId;
        testData.user.barcode = userProperties.barcode;
        testData.user.firstName = userProperties.firstName;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.user.userId,
          testData.servicePoint.id,
        );
      });
  },

  checkoutItemViaApi(testData) {
    return Checkout.checkoutItemViaApi({
      id: uuid(),
      itemBarcode: testData.item.barcode,
      loanDate: moment.utc().format(),
      servicePointId: testData.servicePoint.id,
      userBarcode: testData.user.barcode,
    });
  },

  deletePreconditions(testData) {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.barcode);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    Users.deleteViaApi(testData.user.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.location.institutionId,
      testData.location.campusId,
      testData.location.libraryId,
      testData.location.id,
    );
    ServicePoints.deleteViaApi(testData.servicePoint.id);
  },
};
