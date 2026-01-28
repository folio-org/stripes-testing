import { ITEM_STATUS_NAMES } from '../../../support/constants';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import CheckOutActions from '../../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import TopMenu from '../../../support/fragments/topMenu';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';
// eslint-disable-next-line no-unused-vars
import UserEdit from '../../../support/fragments/users/userEdit';

describe('Check out', () => {
  const { user, memberTenant } = parseSanityParameters();

  const itemData = {
    barcode: generateItemBarcode(),
    instanceTitle: getTestEntityValue('Instance'),
  };
  let defaultLocation;
  const servicePoint = {};
  let itemId = null;
  let locationId = null;

  before('Create test data', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password)
      .then(() => {
        cy.getUserDetailsByUsername(user.username)
          .then((userDetails) => {
            user.id = userDetails.id;
            user.personal = userDetails.personal;
            user.barcode = userDetails.barcode;
          })
          .then(() => {
            cy.getUserServicePoints(user.id).then((servicePoints) => {
              servicePoint.id = servicePoints[0].defaultServicePointId;
            });
          });
        InventoryInstances.deleteInstanceByTitleViaApi(itemData.instanceTitle);
      })
      .then(() => {
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          itemData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          itemData.holdingTypeId = res[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          itemData.loanTypeId = res[0].id;
        });
        cy.getDefaultMaterialType().then((res) => {
          itemData.materialTypeId = res.id;
          itemData.materialTypeName = res.name;
        });
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation).then(() => {
          locationId = defaultLocation.id;
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
        }).then((specialInstanceIds) => {
          itemId = specialInstanceIds.holdingIds[0].itemIds[0];
        });
      });
  });

  after('Delete test data', () => {
    cy.getUserToken(user.username, user.password);
    if (itemId) {
      CheckInActions.checkinItemViaApi({
        itemBarcode: itemData.barcode,
        servicePointId: servicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    }
    if (locationId) {
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        defaultLocation.institutionId,
        defaultLocation.campusId,
        defaultLocation.libraryId,
        defaultLocation.id,
      );
    }
  });

  it(
    'C356772 An active user with barcode can Check out item (vega)',
    { tags: ['dryRun', 'vega', 'C356772'] },
    () => {
      cy.login(user.username, user.password, {
        path: TopMenu.checkOutPath,
        waiter: Checkout.waitLoading,
      });

      cy.wait(4000);
      CheckOutActions.checkOutUser(user.barcode);
      CheckOutActions.checkUserInfo({ ...user });
      CheckOutActions.checkOutItem(itemData.barcode);
      CheckOutActions.checkItemInfo(itemData.barcode, itemData.instanceTitle);
    },
  );
});
