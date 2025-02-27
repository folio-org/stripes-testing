import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../support/constants';
import AppPaths from '../../support/fragments/app-paths';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import DefaultUser from '../../support/fragments/users/userDefaultObjects/defaultUser';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

describe('Fees&Fines', () => {
  describe('Manual Fees/Fines', () => {
    const testData = {
      instanceTitle: `Pre-checkin_instance_${Number(new Date())}`,
    };
    const userData = { ...DefaultUser.defaultApiPatron };
    const itemBarcode = generateItemBarcode();
    beforeEach(() => {
      cy.intercept('POST', '/authn/refresh').as('/authn/refresh');
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
                    cy.loginAsAdmin({
                      path: AppPaths.getUserPreviewPathWithQuery(testData.userProperties.id),
                      waiter: UsersCard.waitLoading,
                    });
                  });
                });
              });

              cy.getMaterialTypes({ query: 'name="book"' }).then((res) => {
                testData.materialType = res.id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                testData.location = res.id;
              });
              cy.getHoldingTypes({ limit: 1 }).then((res) => {
                testData.holdingType = res[0].id;
              });
              InventoryHoldings.getHoldingSources({ limit: 1 }).then((res) => {
                testData.holdingSource = res[0].id;
              });
              cy.getInstanceTypes({ limit: 1 }).then((res) => {
                testData.instanceType = res[0].id;
              });
              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.loanType = res[0].id;
              });
            })
            .then(() => {
              // eslint-disable-next-line spaced-comment
              // OtherSettings.setOtherSettingsViaApi({ prefPatronIdentifier: 'barcode,username' });
              cy.createInstance({
                instance: {
                  instanceTypeId: testData.instanceType,
                  title: testData.instanceTitle,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingType,
                    permanentLocationId: testData.location,
                    sourceId: testData.holdingSource,
                  },
                ],
                items: [
                  [
                    {
                      barcode: itemBarcode,
                      missingPieces: '3',
                      numberOfMissingPieces: '3',
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: testData.loanType },
                      materialType: { id: testData.materialType },
                    },
                  ],
                ],
              });
            });
        });
      });
    });

    it(
      'C455 Verify "New fee/fine" behavior when "Charge & pay now" button pressed (vega)',
      { tags: ['smoke', 'feeFine', 'vega', 'C455'] },
      () => {
        const feeInfo = [testData.owner.name, testData.feeFineType.feeFineTypeName, 'Paid fully'];
        const itemInfo = [testData.instanceTitle + ' (book)', itemBarcode];
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

          PayFeeFaine.checkAmount(ManualCharges.defaultFeeFineType.defaultAmount);
          PayFeeFaine.setPaymentMethod(testData.paymentMethod);

          PayFeeFaine.submitAndConfirm();
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
        // waiting cypress runner to be able to get a command
        // without wait, randomly doesn't redirecting browser to the checkin page
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_OUT);
        Checkout.waitLoading();
        cy.checkOutItem(testData.userProperties.barcode, itemBarcode);
        cy.verifyItemCheckOut();

        cy.visit(AppPaths.getUserPreviewPathWithQuery(testData.userProperties.id));
        cy.wait('@/authn/refresh', { timeout: 30000 });

        UsersCard.viewCurrentLoans();
        NewFeeFine.openFromLoanDetails();
        initialCheckNewFeeFineFragment(testData.owner.name);
        createFee();
        // Scenario 4: CHARGING MANUAL FEE/FINES USING ELLIPSIS OPTION FROM CHECK-IN
        // waiting cypress runner ti be able to get a command
        // without wait, randomly doesn't redirecting browser to the checkin page
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CHECK_IN);
        CheckInActions.waitLoading();
        CheckInActions.checkInItemGui(itemBarcode);
        CheckInActions.confirmMultipleItemsCheckinWithoutConfirmation(itemBarcode);
        CheckInActions.openNewFeeFinesPane();

        initialCheckNewFeeFineFragment(testData.owner.name);
        createFee();

        // Checking created fees
        cy.wait(5000);
        cy.visit(AppPaths.getUserPreviewPathWithQuery(testData.userProperties.id));
        cy.wait('@/authn/refresh', { timeout: 30000 });

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
        itemBarcode,
        servicePointId: testData.userServicePoint,
        checkInDate: moment.utc().format(),
      }).then(() => {
        Users.deleteViaApi(testData.userProperties.id);
        PatronGroups.deleteViaApi(testData.patronGroupId);
      });

      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"items.barcode"=="${itemBarcode}"`,
      }).then((instance) => {
        cy.deleteItemViaApi(instance.items[0].id);
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });

      PaymentMethods.deleteViaApi(testData.paymentMethod.id);
      ManualCharges.deleteViaApi(testData.feeFineType.id);
      UsersOwners.deleteViaApi(testData.owner.id);
    });
  });
});
