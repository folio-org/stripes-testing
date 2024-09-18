import moment from 'moment';

import LostItemsRequiringActualCostPage from '../../support/fragments/users/lostItemsRequiringActualCostPage';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import BillActualCostModal from '../../support/fragments/users/billActualCostModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import { Permissions } from '../../support/dictionary';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Fees&Fines', () => {
  describe('Lost items requiring actual cost', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };
    let instanceData;
    const ownerData = UsersOwners.getDefaultNewOwner();

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation)
        .then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        })
        .then(() => {
          UsersOwners.createViaApi({
            ...ownerData,
            servicePointOwner: [
              {
                value: testData.servicePoint.id,
                label: testData.servicePoint.name,
              },
            ],
          }).then((ownerResponse) => {
            testData.owner = ownerResponse;
          });
        });

      cy.createTempUser([Permissions.uiUserLostItemRequiringActualCost.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
          UserEdit.addServicePointViaApi(
            testData.servicePoint.id,
            testData.user.userId,
            testData.servicePoint.id,
          ).then(() => {
            instanceData = testData.folioInstances[0];
            Checkout.checkoutItemViaApi({
              itemBarcode: instanceData.barcodes[0],
              userBarcode: testData.user.barcode,
              servicePointId: testData.servicePoint.id,
            });
          });
          UserLoans.getUserLoansIdViaApi(testData.user.userId)
            .then((userLoans) => {
              UserLoans.declareLoanLostViaApi(
                {
                  servicePointId: testData.servicePoint.id,
                  declaredLostDateTime: moment.utc().format(),
                },
                userLoans.loans[0].id,
              );
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.usersPath,
                waiter: UsersSearchResultsPane.waitLoading,
              });
            });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceViaApi({
        instance: instanceData,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
      UsersOwners.deleteViaApi(testData.owner.id);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C374115 Verify ability to bill actual cost for item with "Declared lost" status (vega) (TaaS)',
      { tags: ['extendedPath', 'vega'] },
      () => {
        const staffInfo = `staff ${getRandomPostfix()}`;
        const patronInfo = `patron ${getRandomPostfix()}`;
        const firstValue = '50.00';
        const secondValue = '100.00';
        let modalInfo = {
          actualCost: firstValue,
          instanceTitle: instanceData.instanceTitle,
          username: testData.user.username,
          firstName: testData.user.firstName,
          staffInfo,
          patronInfo,
        };
        // #1 Click on "Actions" dropdown => Click "Lost items requiring actual cost" action
        UsersSearchPane.openLostItemsRequiringActualCostPane();
        LostItemsRequiringActualCostPage.waitLoading();
        LostItemsRequiringActualCostPage.verifyFilters();
        // #2 Click on the "Declared lost" in "Loss type" filter
        LostItemsRequiringActualCostPage.searchByLossType('Declared lost');
        LostItemsRequiringActualCostPage.checkResultsLossType(
          instanceData.instanceTitle,
          'Declared lost',
        );
        LostItemsRequiringActualCostPage.checkDropdownOptions(instanceData.instanceTitle, [
          'Bill actual cost',
          'Do not bill',
          'Patron details',
          'Loan details',
          'Item details',
        ]);
        // #3 Click "..." in the "Actions" column => select "Bill actual cost" option
        LostItemsRequiringActualCostPage.openBillActualCost(instanceData.instanceTitle);
        BillActualCostModal.checkModalInfo(testData.user, testData.owner);
        // #4 * Fill "Actual cost to bill patron" field with valid value (f.e. 50.00)
        BillActualCostModal.fillActualCost(firstValue);
        BillActualCostModal.fillAdditionalInfoInputs(staffInfo, patronInfo);
        // #5 Click "Continue" button
        BillActualCostModal.continue();
        BillActualCostModal.checkConfirmModalInfo(modalInfo);
        // #6 Click "Keep editing" button
        BillActualCostModal.keepEditing();
        BillActualCostModal.checkModalInfo(testData.user, testData.owner, {
          actualCost: firstValue,
          staffInfo,
          patronInfo,
          continueBtnDisabled: false,
        });
        // #7 Click "Cancel" button
        BillActualCostModal.cancel();
        LostItemsRequiringActualCostPage.waitLoading();
        // #8 Click "..." in the "Actions" column => select "Bill actual cost" option => Fill in "Actual cost to bill patron*" field with valid value (e.g. 100) => Click "Confirm" button
        LostItemsRequiringActualCostPage.openBillActualCost(instanceData.instanceTitle);
        BillActualCostModal.fillActualCost(secondValue);
        modalInfo = {
          actualCost: secondValue,
          instanceTitle: instanceData.instanceTitle,
          username: testData.user.username,
          firstName: testData.user.firstName,
        };
        BillActualCostModal.continue();
        BillActualCostModal.checkConfirmModalInfo(modalInfo);
        // #9 Click "Confirm" button
        BillActualCostModal.confirm();
        BillActualCostModal.verifyCalloutMessage(testData.user, secondValue);
        LostItemsRequiringActualCostPage.checkResultsColumn(
          instanceData.instanceTitle,
          'Status',
          `Billed: $${secondValue}`,
        );
        // #10 Click on "Actions" column includes ellipses
        LostItemsRequiringActualCostPage.checkDropdownOptions(
          instanceData.instanceTitle,
          ['Bill actual cost', 'Do not bill'],
          true,
        );
      },
    );
  });
});
