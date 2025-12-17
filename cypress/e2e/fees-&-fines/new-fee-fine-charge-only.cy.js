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
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
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
  describe('Manual Fees/Fines - Charge only', () => {
    const testData = {
      barcode: generateItemBarcode(),
      instanceTitle: `AT_C454_Instance_${getRandomPostfix()}`,
    };
    const userData = { ...DefaultUser.defaultApiPatron };

    before(() => {
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
      'C454 Verify "New fee/fine" behavior when "Charge only" button pressed (vega)',
      { tags: ['criticalPath', 'vega', 'C454'] },
      () => {
        const initialCheckNewFeeFineFragment = () => {
          NewFeeFine.checkInitialState(testData.userProperties, testData.owner.name);
          NewFeeFine.setFeeFineOwner(testData.owner.name);
          NewFeeFine.checkFilteredFeeFineType(testData.feeFineType.feeFineTypeName);
        };

        const createFeeChargeOnly = () => {
          NewFeeFine.setFeeFineOwner(testData.owner.name);
          NewFeeFine.setFeeFineType(testData.feeFineType.feeFineTypeName);
          NewFeeFine.checkAmount(ManualCharges.defaultFeeFineType.defaultAmount);

          NewFeeFine.cancel();
          NewFeeFine.keepEditing();
          NewFeeFine.waitLoading();

          NewFeeFine.chargeOnly();
          cy.wait(2000);
        };

        // Login and navigate to user
        cy.loginAsAdmin({
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        cy.waitForAuthRefresh(() => {
          UsersSearchPane.searchByUsername(testData.userProperties.username);
        });

        // Scenario 1: CHARGING MANUAL FEE/FINE USING BUTTON FROM USER INFORMATION
        UsersCard.openFeeFines();
        UsersCard.startFeeFineAdding();
        NewFeeFine.waitLoading();

        initialCheckNewFeeFineFragment();
        createFeeChargeOnly();

        // Scenario 2: CHARGING MANUAL FEE/FINE USING BUTTON ON "FEES/FINES HISTORY"
        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.waitLoading();
        UserAllFeesFines.createFeeFineViaActionsButton();
        NewFeeFine.waitLoading();

        initialCheckNewFeeFineFragment();
        createFeeChargeOnly();

        // Scenario 3: CHARGING MANUAL FEE/FINES USING ELLIPSIS OPTION FROM OPEN/CLOSED LOANS
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
        createFeeChargeOnly();

        // Scenario 4: CHARGING MANUAL FEE/FINES USING ELLIPSIS OPTION FROM CHECK-IN
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.waitLoading();
        CheckInActions.checkInItemGui(testData.barcode);
        CheckInActions.confirmMultipleItemsCheckinWithoutConfirmation(testData.barcode);
        Modals.closeModalWithPrintSlipCheckboxIfAny();
        CheckInActions.openNewFeeFinesPane();

        initialCheckNewFeeFineFragment(testData.owner.name);
        createFeeChargeOnly();

        // Verification: Check that fees were created and are outstanding
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.USERS);
        // Close create a new fee/fine modal
        UsersCard.clickOnCloseIcon();
        // Close fee/fine page
        UsersCard.clickOnCloseIcon();
        UsersSearchPane.resetAllFilters();
        UsersSearchPane.searchByUsername(testData.userProperties.username);

        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.waitLoading();

        // Verify all 4 fees were created
        UserAllFeesFines.verifyFeeFineCount(4);

        // Verify fee/fine details for check-in created fee
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        // Verify fee/fine details contain correct information
        cy.contains(testData.owner.name).should('be.visible');
        cy.contains(testData.feeFineType.feeFineTypeName).should('be.visible');
        cy.contains('Outstanding').should('be.visible');

        FeeFineDetails.openActions();
        FeeFineDetails.verifyActionsAreAvailable(['Pay', 'Waive', 'Transfer', 'Error']);
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
      ManualCharges.deleteViaApi(testData.feeFineType.id);
      UsersOwners.deleteViaApi(testData.owner.id);
    });
  });
});
