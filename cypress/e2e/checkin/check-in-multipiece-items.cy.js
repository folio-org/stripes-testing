import TestTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import Helper from '../../support/fragments/finance/financeHelper';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import NewServicePoint from '../../support/fragments/settings/tenant/servicePoints/newServicePoint';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import MultipieceCheckIn from '../../support/fragments/checkin/modals/multipieceCheckIn';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DevTeams from '../../support/dictionary/devTeams';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';

describe('Check In', () => {
  let user = {};
  let servicePoint;
  let materialTypeName;
  let testInstanceIds;
  const instanceTitle = `autotest_instance_title_${getRandomPostfix()}`;
  const testItems = [];
  const defaultDescription = `autotest_description_${getRandomPostfix()}`;
  let defaultLocation;

  beforeEach(() => {
    cy.createTempUser([permissions.checkinAll.gui])
      .then((userProperties) => {
        user = userProperties;
        servicePoint = NewServicePoint.getDefaultServicePoint();
        ServicePoints.createViaApi(servicePoint);
        defaultLocation = Location.getDefaultLocation(servicePoint.id);
        Location.createViaApi(defaultLocation);
        UserEdit.addServicePointViaApi(servicePoint.id, user.userId, servicePoint.id);
      })
      .then(() => {
        cy.login(user.username, user.password);
      });
    cy.getAdminToken()
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 }).then(({ id, name }) => {
          materialTypeName = { id, name };
        });
        // cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 2 });
        cy.getInstanceTypes({ limit: 1 });
      })
      .then(() => {
        const getTestItem = (numberOfPieces, hasDescription, hasMissingPieces) => {
          const defaultItem = {
            barcode: Helper.getRandomBarcode(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
            materialType: { id: materialTypeName.id },
            materialTypeName: materialTypeName.name,
            instanceTitle,
          };
          if (numberOfPieces) {
            defaultItem.numberOfPieces = numberOfPieces;
          }
          if (hasDescription) {
            defaultItem.descriptionOfPieces = defaultDescription;
          }
          if (hasMissingPieces) {
            defaultItem.numberOfMissingPieces = 2;
            defaultItem.missingPieces = defaultDescription;
          }
          return defaultItem;
        };
        testItems.push(getTestItem(1, false, false));
        testItems.push(getTestItem(3, true, false));
        testItems.push(getTestItem(2, true, true));
        testItems.push(getTestItem(0, false, true));
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle,
          },
          holdings: [
            {
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: defaultLocation.id,
            },
          ],
          items: testItems,
        }).then((specialInstanceIds) => {
          testInstanceIds = specialInstanceIds;
        });
      });
  });

  after(() => {
    testInstanceIds.holdingIds.forEach((holdingsId) => {
      holdingsId.itemIds.forEach((itemId) => {
        cy.deleteItemViaApi(itemId);
      });
      cy.deleteHoldingRecordViaApi(holdingsId.id);
    });
    InventoryInstance.deleteInstanceViaApi(testInstanceIds.instanceId);
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [servicePoint.id]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C590 Check in: multipiece items (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // Open check in interface
      cy.visit(TopMenu.checkInPath);
      // "Scan items" section appears
      CheckInActions.waitLoading();
      // Enter barcode for item A (number of pieces set to 1, and description of pieces, number of missing pieces, and description of missing pieces left blank)
      CheckInActions.checkInItem(testItems[0].barcode);
      // Confirm multipiece check in modal does not appear.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsAbsent();
      // Enter barcode for item B (number of pieces set to a number greater than 1 and/or some value for description of pieces; number of missing pieces and description of missing pieces left blank)
      CheckInActions.waitLoading();
      CheckInActions.checkInItem(testItems[1].barcode);
      // Confirm multipiece check in modal appears: <Title of item> (<material type of item>) (Barcode: <barcode of item>) will be checked in.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      MultipieceCheckIn.checkContent(testItems[1]);
      // Click Cancel and Item is not checked in.
      MultipieceCheckIn.cancelMultipieceCheckInModal(testItems[1].barcode);
      // Enter barcode for item B again.
      CheckInActions.checkInItem(testItems[1].barcode);
      // Same modal from step 3 displays.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      // Click check in.
      // Item is checked in.
      CheckInActions.confirmMultipleItemsCheckin(testItems[1].barcode);
      // #7 Enter barcode for item C (number of pieces set to a number greater than 1 and/or some value for description of pieces, and some value for number of missing pieces and/or description of missing pieces)
      CheckInActions.checkInItem(testItems[2].barcode);
      // Confirm multipiece check in modal appears.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      MultipieceCheckIn.checkContent(testItems[2]);
      // Click check in.Item is checked in.
      CheckInActions.confirmMultipleItemsCheckin(testItems[2].barcode);
      // Enter barcode for item D (number of pieces left blank, description of pieces left blank, and some value for number of missing pieces and/or description of missing pieces)
      CheckInActions.checkInItem(testItems[3].barcode);
      // Confirm multipiece check in modal appears.
      MultipieceCheckIn.verifyMultipieceCheckInModalIsDisplayed();
      MultipieceCheckIn.checkContent(testItems[3]);
      // Click check in. Item is checked in.
      CheckInActions.confirmMultipleItemsCheckin(testItems[3].barcode);
    },
  );
});
