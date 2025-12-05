import uuid from 'uuid';
import moment from 'moment/moment';
import { Permissions } from '../../support/dictionary';
import { LOCATION_IDS, LOCATION_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CheckInModal from '../../support/fragments/check-in-actions/checkInModal';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import DateTools from '../../support/utils/dateTools';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Check in', () => {
  let userData;
  let servicePoint;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({ count: 3 }),
  };
  const noteWithLeadingSpace = {
    title: 'space at the beginning',
    source: 'ADMINISTRATOR, DIKU',
  };
  const noteWithTrailingSpace = {
    title: 'space at the end',
    source: 'ADMINISTRATOR, DIKU',
  };
  const noteWithoutSpace = {
    title: 'no space',
    source: 'ADMINISTRATOR, DIKU',
  };
  const barcodeWithLeadingSpace = ` 1212${getRandomPostfix()}`;
  const barcodeWithTrailingSpace = `1212${getRandomPostfix()} `;
  const barcodeWithoutSpace = `1212${getRandomPostfix()}`;

  before('Creating test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        servicePoint = sp;
      });
    });
    cy.getAdminSourceRecord().then((record) => {
      noteWithLeadingSpace.source = record;
      noteWithTrailingSpace.source = record;
      noteWithoutSpace.source = record;
    });
    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;

      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
      });

      UserEdit.addServicePointViaApi(servicePoint.id, userProperties.userId, servicePoint.id);

      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.folioInstances[0].barcodes[0]}"`,
      }).then((res) => {
        const itemData = res;
        itemData.barcode = barcodeWithLeadingSpace;
        noteWithLeadingSpace.date = DateTools.getFormattedDateWithTime(new Date(), {
          withoutComma: true,
        });
        itemData.circulationNotes = [
          { noteType: 'Check in', note: noteWithLeadingSpace.title, staffOnly: true },
        ];
        cy.updateItemViaApi(itemData).then(() => {
          testData.folioInstances[0].barcodes[0] = barcodeWithLeadingSpace;
          testData.folioInstances[0].items[0].barcode = barcodeWithLeadingSpace;
        });
      });

      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.folioInstances[1].barcodes[0]}"`,
      }).then((res) => {
        const itemData = res;
        itemData.barcode = barcodeWithTrailingSpace;
        noteWithTrailingSpace.date = DateTools.getFormattedDateWithTime(new Date(), {
          withoutComma: true,
        });
        itemData.circulationNotes = [
          { noteType: 'Check in', note: noteWithTrailingSpace.title, staffOnly: true },
        ];
        cy.updateItemViaApi(itemData).then(() => {
          testData.folioInstances[1].barcodes[0] = barcodeWithTrailingSpace;
          testData.folioInstances[1].items[0].barcode = barcodeWithTrailingSpace;
        });
      });

      cy.getItems({
        limit: 1,
        expandAll: true,
        query: `"barcode"=="${testData.folioInstances[2].barcodes[0]}"`,
      })
        .then((res) => {
          const itemData = res;
          itemData.barcode = barcodeWithoutSpace;
          noteWithoutSpace.date = DateTools.getFormattedDateWithTime(new Date(), {
            withoutComma: true,
          });
          itemData.circulationNotes = [
            { noteType: 'Check in', note: noteWithoutSpace.title, staffOnly: true },
          ];
          cy.updateItemViaApi(itemData).then(() => {
            testData.folioInstances[2].barcodes[0] = barcodeWithoutSpace;
            testData.folioInstances[2].items[0].barcode = barcodeWithoutSpace;
          });
        })
        .then(() => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: barcodeWithLeadingSpace,
            loanDate: moment.utc().format(),
            userBarcode: userData.barcode,
            servicePointId: servicePoint.id,
          });

          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: barcodeWithTrailingSpace,
            loanDate: moment.utc().format(),
            userBarcode: userData.barcode,
            servicePointId: servicePoint.id,
          });

          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: barcodeWithoutSpace,
            loanDate: moment.utc().format(),
            userBarcode: userData.barcode,
            servicePointId: servicePoint.id,
          });
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkInPath,
            waiter: CheckInActions.waitLoading,
          });
        });
    });
  });

  after('Deleting test data', () => {
    cy.getAdminToken();
    testData.folioInstances.forEach((instance) => {
      InventoryInstances.deleteInstanceViaApi({
        instance,
        servicePoint,
        shouldCheckIn: false,
      });
    });
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C566154 Check that Item barcode is not trimming if there is spaces in the Item barcode while check in (vega)',
    { tags: ['extendedPath', 'vega', 'C566154'] },
    () => {
      CheckInActions.checkInItemGui(barcodeWithLeadingSpace);
      CheckInModal.verifyModalTitle();
      CheckInModal.verifyNotesInfo([noteWithLeadingSpace]);
      CheckInModal.confirmModal();
      CheckInPane.checkResultsInTheRow([barcodeWithLeadingSpace]);

      CheckInActions.checkInItemGui(barcodeWithTrailingSpace);
      CheckInModal.verifyModalTitle();
      CheckInModal.verifyNotesInfo([noteWithTrailingSpace]);
      CheckInModal.confirmModal();
      CheckInPane.checkResultsInTheRow([barcodeWithTrailingSpace]);

      CheckInActions.checkInItemGui(barcodeWithoutSpace);
      CheckInModal.verifyModalTitle();
      CheckInModal.verifyNotesInfo([noteWithoutSpace]);
      CheckInModal.confirmModal();
      CheckInPane.checkResultsInTheRow([barcodeWithoutSpace]);
    },
  );
});
