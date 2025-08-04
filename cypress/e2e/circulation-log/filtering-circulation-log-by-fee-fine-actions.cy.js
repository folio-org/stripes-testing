import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import CancelFeeFine from '../../support/fragments/users/cancelFeeFine';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import RefundFeeFine from '../../support/fragments/users/refundFeeFine';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Circulation log', () => {
  let userData;
  const [fullAmount, partiallAmount] = ['4.00', '2.00'];
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePoint(),
    manualChargeName: null,
  };

  const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());
  const refundReason = RefundReasons.getDefaultNewRefundReason(uuid());
  const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());
  const getActionBody = (type, amount) => ({
    amount,
    paymentMethod: type,
    notifyPatron: false,
    servicePointId: testData.userServicePoint.id,
    userName: testData.adminSourceRecord,
  });
  const userOwnerBody = {
    id: uuid(),
    owner: getTestEntityValue('OwnerCircLog'),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };
  const goToCircLogApp = (filterName) => {
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
    SearchPane.waitLoading();
    cy.wait(4000);
    SearchPane.setFilterOptionFromAccordion('fee', filterName);
    SearchPane.searchByItemBarcode(testData.itemBarcode);
    return SearchPane.findResultRowIndexByContent(filterName);
  };
  const checkActionsButton = (filterName) => {
    goToCircLogApp(filterName).then((rowIndex) => {
      SearchResults.chooseActionByRow(rowIndex, 'Fee/fine details');
      FeeFineDetails.waitLoading();
    });
    goToCircLogApp(filterName).then((rowIndex) => {
      SearchResults.chooseActionByRow(rowIndex, 'User details');
      Users.verifyFirstNameOnUserDetailsPane(userData.firstName);
    });
    goToCircLogApp(filterName).then((rowIndex) => {
      SearchResults.clickOnCell(testData.itemBarcode, Number(rowIndex));
      ItemRecordView.waitLoading();
    });
  };
  const filterByAction = (filterName, desc = `Fee/Fine type: ${testData.manualChargeName}.`) => {
    const searchResultsData = {
      userBarcode: userData.barcode,
      itemBarcode: testData.itemBarcode,
      object: 'Fee/fine',
      circAction: filterName,
      servicePoint: testData.userServicePoint.name,
      source: testData.adminSourceRecord,
      desc,
    };
    TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('fee', filterName);
    SearchPane.findResultRowIndexByContent(filterName).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
    SearchPane.resetResults();
    SearchPane.searchByItemBarcode(testData.itemBarcode);
    SearchPane.findResultRowIndexByContent(filterName).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
  };
  const createFeeFine = () => {
    return NewFeeFine.createViaApi({
      id: uuid(),
      ownerId: userOwnerBody.id,
      feeFineId: testData.manualChargeId,
      amount: 4,
      feeFineType: testData.manualChargeName,
      feeFineOwner: userOwnerBody.owner,
      userId: userData.userId,
      itemId: testData.itemId,
      barcode: testData.itemBarcode,
      title: testData.folioInstances[0].instanceTitle,
      createdAt: testData.userServicePoint.id,
      dateAction: moment.utc().format(),
      source: testData.adminSourceRecord,
    });
  };

  before('Preconditions', () => {
    cy.loginAsAdmin();
    cy.getAdminSourceRecord().then((record) => {
      testData.adminSourceRecord = record.toLowerCase();
    });
    ServicePoints.createViaApi(testData.userServicePoint);
    testData.defaultLocation = Locations.getDefaultLocation({
      servicePointId: testData.userServicePoint.id,
    }).location;
    Locations.createViaApi(testData.defaultLocation)
      .then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      })
      .then(() => {
        testData.itemBarcode = testData.folioInstances[0].barcodes[0];
        testData.itemId = testData.folioInstances[0].itemIds[0];
      });

    UsersOwners.createViaApi(userOwnerBody);
    ManualCharges.createViaApi({
      defaultAmount: '4',
      automatic: false,
      feeFineType: getTestEntityValue('ChargeCircLog'),
      ownerId: userOwnerBody.id,
    }).then((chargeRes) => {
      testData.manualChargeId = chargeRes.id;
      testData.manualChargeName = chargeRes.feeFineType;
    });
    TransferAccounts.createViaApi({ ...transferAccount, ownerId: userOwnerBody.id });
    WaiveReasons.createViaApi(waiveReason);
    PaymentMethods.createViaApi(userOwnerBody.id).then((paymentRes) => {
      testData.paymentMethodId = paymentRes.id;
      testData.paymentMethodName = paymentRes.name;
    });
    RefundReasons.createViaApi(refundReason);

    cy.createTempUser([permissions.circulationLogAll.gui])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    RefundReasons.deleteViaApi(refundReason.id);
    WaiveReasons.deleteViaApi(waiveReason.id);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    TransferAccounts.deleteViaApi(transferAccount.id);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.userServicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C17064 Check the Actions button from filtering Circulation log by transferred partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17064'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        TransferFeeFine.transferFeeFineViaApi(
          getActionBody(transferAccount.accountName, partiallAmount),
          testData.feeFineId,
        );
        checkActionsButton('Transferred partially');
      });
    },
  );

  it(
    'C17063 Filter circulation log by transferred partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17063'] },
    () => {
      filterByAction('Transferred partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17009 Check the Actions button from filtering Circulation log by billed (volaris)',
    { tags: ['criticalPath', 'volaris', 'C17009'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        checkActionsButton('Billed');
      });
    },
  );

  it(
    'C17008 Filter circulation log by billed (volaris)',
    { tags: ['criticalPath', 'volaris', 'C17008'] },
    () => {
      filterByAction('Billed');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17062 Check the Actions button from filtering Circulation log by transferred fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17062'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        TransferFeeFine.transferFeeFineViaApi(
          getActionBody(transferAccount.accountName, fullAmount),
          testData.feeFineId,
        );
        checkActionsButton('Transferred fully');
      });
    },
  );

  it(
    'C17061 Filter circulation log by transferred fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17061'] },
    () => {
      filterByAction('Transferred fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17052 Check the Actions button from filtering Circulation log by Paid partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17052'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFine.payFeeFineViaApi(
          getActionBody(testData.paymentMethodName, partiallAmount),
          testData.feeFineId,
        );
        checkActionsButton('Paid partially');
      });
    },
  );

  it(
    'C17051 Filter circulation log by paid partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17051'] },
    () => {
      filterByAction('Paid partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17050 Check the Actions button from filtering Circulation log by Paid fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17050'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFine.payFeeFineViaApi(
          getActionBody(testData.paymentMethodName, fullAmount),
          testData.feeFineId,
        );
        checkActionsButton('Paid fully');
      });
    },
  );

  it(
    'C17049 Filter circulation log by paid fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17049'] },
    () => {
      filterByAction('Paid fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17060 Check the Actions button from filtering Circulation log by refunded partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17060'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFine.payFeeFineViaApi(
          getActionBody(testData.paymentMethodName, fullAmount),
          testData.feeFineId,
        );
        RefundFeeFine.refundFeeFineViaApi(
          getActionBody(refundReason.nameReason, partiallAmount),
          testData.feeFineId,
        );
        checkActionsButton('Refunded partially');
      });
    },
  );

  it(
    'C17059 Filter circulation log by refunded partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17059'] },
    () => {
      filterByAction('Refunded partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17058 Check the Actions button from filtering Circulation log by refunded fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17058'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFine.payFeeFineViaApi(
          getActionBody(testData.paymentMethodName, fullAmount),
          testData.feeFineId,
        );
        RefundFeeFine.refundFeeFineViaApi(
          getActionBody(refundReason.nameReason, fullAmount),
          testData.feeFineId,
        );
        checkActionsButton('Refunded fully');
      });
    },
  );

  it(
    'C17057 Filter circulation log by refunded fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17057'] },
    () => {
      filterByAction('Refunded fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17056 Check the Actions button from filtering Circulation log by waived partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17056'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        WaiveFeeFineModal.waiveFeeFineViaApi(
          getActionBody(waiveReason.nameReason, partiallAmount),
          testData.feeFineId,
        );
        checkActionsButton('Waived partially');
      });
    },
  );

  it(
    'C17055 Filter circulation log by waived partially (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17055'] },
    () => {
      filterByAction('Waived partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17054 Check the Actions button from filtering Circulation log by waived fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17054'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        WaiveFeeFineModal.waiveFeeFineViaApi(
          getActionBody(waiveReason.nameReason, fullAmount),
          testData.feeFineId,
        );
        checkActionsButton('Waived fully');
      });
    },
  );

  it(
    'C17053 Filter circulation log by waived fully (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17053'] },
    () => {
      filterByAction('Waived fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17066 Check the Actions button from filtering Circulation log by cancelled as error (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17066'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        CancelFeeFine.cancelFeeFineViaApi(
          {
            notifyPatron: false,
            comments: `STAFF : ${getTestEntityValue()}`,
            servicePointId: testData.userServicePoint.id,
            userName: testData.adminSourceRecord,
          },
          testData.feeFineId,
        );
        checkActionsButton('Cancelled as error');
      });
    },
  );

  it(
    'C17065 Filter circulation log by cancelled as error (volaris)',
    { tags: ['criticalPath', 'volaris', 'shiftLeft', 'C17065'] },
    () => {
      filterByAction('Cancelled as error', `Amount: ${fullAmount}. Cancellation reason`);
    },
  );
});
