import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import DefaultUser from '../../support/fragments/users/userDefaultObjects/defaultUser';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import Modals from '../../support/fragments/modals';

describe('Fees&Fines', () => {
  describe('Manual Fees/Fines', () => {
    const testData = {
      barcode: generateItemBarcode(),
      instanceTitle: `AT_C455_Instance_${getRandomPostfix()}`,
    };
    const userData = { ...DefaultUser.defaultApiPatron };
    beforeEach(() => {
      cy.getAdminToken();
      PatronGroups.createViaApi().then((patronGroupId) => {
        testData.patronGroupId = patronGroupId;
        testData.userProperties = { barcode: uuid() };
        Users.createViaApi({
          patronGroup: patronGroupId,
          ...userData,
        }).then((userProperties) => {
          testData.userProperties = userProperties;
          ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' })
            .then((servicePoints) => {
              testData.servicePointId = servicePoints[0].id;
              UserEdit.addServicePointViaApi(servicePoints[0].id, testData.userProperties.id).then(
                (points) => {
                  testData.userServicePoint = points.body.defaultServicePointId;
                },
              );
              UsersOwners.createViaApi({ owner: uuid() }).then(({ id, owner }) => {
                testData.owner = { id, name: owner };
                ManualCharges.createViaApi({
                  ...ManualCharges.defaultFeeFineType,
                  ownerId: id,
                }).then((manualCharge) => {
                  testData.feeFineType = {
                    id: manualCharge.id,
                    feeFineTypeName: manualCharge.feeFineType,
                  };
                  PaymentMethods.createViaApi(testData.owner.id).then((createdPaymentMethod) => {
                    testData.paymentMethod = {
                      id: createdPaymentMethod.id,
                      name: createdPaymentMethod.name,
                    };
                    cy.waitForAuthRefresh(() => {
                      cy.loginAsAdmin({
                        path: TopMenu.usersPath,
                        waiter: UsersSearchPane.waitLoading,
                      });
                      UsersSearchPane.searchByUsername(testData.userProperties.username);
                    });
                  });
                });
              });

              cy.getBookMaterialType().then((res) => {
                testData.materialTypeId = res.id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                testData.location = res.id;
              });
              cy.getHoldingTypes({ limit: 1 }).then((res) => {
                testData.holdingTypeId = res[0].id;
              });
              InventoryHoldings.getHoldingSources({ limit: 1 }).then((res) => {
                testData.holdingSource = res[0].id;
              });
              cy.getInstanceTypes({ limit: 1 }).then((res) => {
                testData.instanceTypeId = res[0].id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.loanTypeId = res[0].id;
              });
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.instanceTitle,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeId,
                    permanentLocationId: testData.location,
                    sourceId: testData.holdingSource,
                  },
                ],
                items: [
                  {
                    barcode: testData.barcode,
                    missingPieces: '3',
                    numberOfMissingPieces: '3',
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeId },
                    materialType: { id: testData.materialTypeId },
                  },
                ],
              });
            })
            .then((specialInstanceIds) => {
              testData.testInstanceIds = specialInstanceIds;
            });
        });
      });
    });

    it(
      'C455 Verify "New fee/fine" behavior when "Charge & pay now" button pressed (vega)',
      { tags: ['smoke', 'feeFine', 'vega', 'C455'] },
      () => {
        const feeInfo = [testData.owner.name, testData.feeFineType.feeFineTypeName, 'Paid fully'];
        const itemInfo = [testData.instanceTitle + ' (book)', testData.barcode];
        const initialCheckNewFeeFineFragment = () => {
          NewFeeFine.checkInitialState(testData.userProperties, testData.owner.name);
          NewFeeFine.setFeeFineOwner(testData.owner.name);
          NewFeeFine.checkFilteredFeeFineType(testData.feeFineType.feeFineTypeName);
        };

        const createFee = () => {
          NewFeeFine.setFeeFineOwner(testData.owner.name);
          NewFeeFine.setFeeFineType(testData.feeFineType.feeFineTypeName);
          NewFeeFine.checkAmount(ManualCharges.defaultFeeFineType.defaultAmount);

          NewFeeFine.cancel();
          NewFeeFine.keepEditing();
          NewFeeFine.waitLoading();

          NewFeeFine.chargeAndPayNow();

          PayFeeFine.checkAmount(ManualCharges.defaultFeeFineType.defaultAmount);
          PayFeeFine.setPaymentMethod(testData.paymentMethod);

          PayFeeFine.submitAndConfirm();
        };
        // Scenario 1: CHARGING MANUAL FEE/FINE USING BUTTON FROM USER INFORMATION
        UsersCard.openFeeFines();
        UsersCard.startFeeFineAdding();
        NewFeeFine.waitLoading();

        initialCheckNewFeeFineFragment();
        createFee();
        // Scenario 2: CHARGING MANUAL FEE/FINE USING BUTTON ON "FEES/FINES HISTORY"
        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.createFeeFine();

        initialCheckNewFeeFineFragment(testData.owner.name);
        createFee();
        // Scenario 3: CHARGING MANUAL FEE/FINES USING ELLIPSIS OPTION FROM OPEN/CLOSED LOANS
        cy.wait(2000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
        Checkout.waitLoading();
        cy.checkOutItem(testData.userProperties.barcode, testData.barcode);
        cy.verifyItemCheckOut();

        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
        // Close fee/fine page
        UsersCard.clickOnCloseIcon();
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByUsername(testData.userProperties.username);

        UsersCard.viewCurrentLoans();
        NewFeeFine.openFromLoanDetails();
        initialCheckNewFeeFineFragment(testData.owner.name);
        createFee();
        // Scenario 4: CHARGING MANUAL FEE/FINES USING ELLIPSIS OPTION FROM CHECK-IN
        cy.wait(2000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.waitLoading();
        CheckInActions.checkInItemGui(testData.barcode);
        CheckInActions.confirmMultipleItemsCheckinWithoutConfirmation(testData.barcode);
        Modals.closeModalWithPrintSlipCheckboxIfAny();
        CheckInActions.openNewFeeFinesPane();

        initialCheckNewFeeFineFragment(testData.owner.name);
        createFee();

        // Checking created fees
        cy.wait(5000);
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
        // Close create a new fee/fine modal
        UsersCard.clickOnCloseIcon();
        // Close fee/fine page
        UsersCard.clickOnCloseIcon();
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByUsername(testData.userProperties.username);

        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();

        NewFeeFine.checkClosedFeesByRow(feeInfo.concat(itemInfo), 0);
        NewFeeFine.checkClosedFeesByRow(feeInfo.concat(itemInfo), 1);
        NewFeeFine.checkClosedFeesByRow(feeInfo, 2);
        NewFeeFine.checkClosedFeesByRow(feeInfo, 3);
      },
    );
    after(() => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode: testData.barcode,
        servicePointId: testData.userServicePoint,
        checkInDate: moment.utc().format(),
      }).then(() => {
        Users.deleteViaApi(testData.userProperties.id);
        PatronGroups.deleteViaApi(testData.patronGroupId);
      });
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
      PaymentMethods.deleteViaApi(testData.paymentMethod.id);
      ManualCharges.deleteViaApi(testData.feeFineType.id);
      UsersOwners.deleteViaApi(testData.owner.id);
    });
  });
});
