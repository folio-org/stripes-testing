import moment from 'moment';
import uuid from 'uuid';
import TopMenu from '../../support/fragments/topMenu';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import Checkout from '../../support/fragments/checkout/checkout';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import { parseSanityParameters } from '../../support/utils/users';

describe('Check in', () => {
  describe('End to end scenarios', () => {
    const { user, memberTenant } = parseSanityParameters();
    let itemData;
    let defaultLocation;
    let servicePoint = {};
    let checkInResultsData;
    let itemId = null;
    let locationId = null;
    let servicePointId = null;

    before('Create New Item and Check out item', () => {
      itemData = {
        barcode: generateItemBarcode(),
        instanceTitle: `AT_C347631_Instance_${getRandomPostfix()}`,
      };
      servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
      checkInResultsData = [ITEM_STATUS_NAMES.AVAILABLE, itemData.barcode];

      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password)
        .then(() => {
          // Defensive cleanup - delete by title if exists
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
          servicePointId = servicePoint.id;
          defaultLocation = Location.getDefaultLocation(servicePoint.id);
          checkInResultsData.push(defaultLocation.name);
          Location.createViaApi(defaultLocation).then(() => {
            locationId = defaultLocation.id;
          });
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            itemData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
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
          }).then((specialInstanceIds) => {
            itemId = specialInstanceIds.holdingIds[0].itemIds[0];
          });
        })
        .then(() => {
          // Get user token for operations
          cy.getToken(user.username, user.password).then(() => {
            // Add service point to existing sanity user
            cy.getUserServicePoints(user.id).then((servicePoints) => {
              UserEdit.updateServicePointsViaApi(
                servicePoints[0].id,
                Array.from(new Set([...servicePoints[0].servicePointsIds, servicePoint.id])),
                user.id,
                servicePoints[0].defaultServicePointId,
              );
            });

            // Checkout item to user
            Checkout.checkoutItemViaApi({
              id: uuid(),
              itemBarcode: itemData.barcode,
              loanDate: moment.utc().format(),
              servicePointId: servicePoint.id,
              userBarcode: user.barcode,
            });
            cy.wait(10000);
          });
        });
    });

    after('Delete Service point, Item and Location', () => {
      cy.getUserToken(user.username, user.password);
      if (itemId) {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
      }
      if (servicePointId && user.userId) {
        UserEdit.changeServicePointPreferenceViaApi(user.userId, [servicePointId]);
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

    it('C347631 Check in: Basic check in (vega)', { tags: ['sanity', 'vega', 'C347631'] }, () => {
      cy.login(user.username, user.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
      CheckInActions.checkInItemGui(itemData.barcode);
      CheckInPane.verifyResultCells();
      CheckInPane.checkResultsInTheRow(checkInResultsData);
      CheckInActions.checkActionsMenuOptions();

      CheckInActions.openLoanDetails(user.personal.lastName);
      CheckInActions.openCheckInPane();
      CheckInActions.openPatronDetails(user.personal.lastName);
      CheckInActions.openCheckInPane();
      CheckInActions.openItemDetails(itemData.barcode);
      CheckInActions.openCheckInPane();
      CheckInActions.openNewFeeFinesPane();
      CheckInActions.openCheckInPane();
    });
  });
});
