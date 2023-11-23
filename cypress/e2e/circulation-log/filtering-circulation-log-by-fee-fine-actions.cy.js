import moment from 'moment';
import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import TopMenu from '../../support/fragments/topMenu';
import CancelFeeFaine from '../../support/fragments/users/cancelFeeFaine';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import RefundFeeFine from '../../support/fragments/users/refundFeeFine';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Circulation log', () => {
  let userData;
  const [fullAmount, partiallAmount] = ['4.00', '2.00'];
  const itemData = {
    barcode: generateItemBarcode(),
    title: getTestEntityValue('InstanceCircLog'),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    manualChargeName: null,
    patronGroup: {
      name: getTestEntityValue('GroupCircLog'),
    },
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
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('fee', filterName);
    SearchPane.searchByItemBarcode(itemData.barcode);
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
      SearchResults.clickOnCell(itemData.barcode, Number(rowIndex));
      ItemRecordView.waitLoading();
    });
  };
  const filterByAction = (filterName, desc = `Fee/Fine type: ${testData.manualChargeName}.`) => {
    const searchResultsData = {
      userBarcode: userData.barcode,
      itemBarcode: itemData.barcode,
      object: 'Fee/fine',
      circAction: filterName,
      // TODO: add check for date with format <C6/8/2022, 6:46 AM>
      servicePoint: testData.userServicePoint.name,
      source: testData.adminSourceRecord,
      desc,
    };
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('fee', filterName);
    SearchPane.findResultRowIndexByContent(filterName).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
    SearchPane.resetResults();
    SearchPane.searchByItemBarcode(itemData.barcode);
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
      itemId: itemData.itemId[0],
      barcode: itemData.barcode,
      title: itemData.title,
      createdAt: testData.userServicePoint.id,
      dateAction: moment.utc().format(),
      source: testData.adminSourceRecord,
    });
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.getAdminSourceRecord().then((record) => {
          testData.adminSourceRecord = record;
        });
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
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

    PatronGroups.createViaApi(testData.patronGroup.name).then((group) => {
      testData.patronGroup.id = group;
      cy.createTempUser([permissions.circulationLogAll.gui], testData.patronGroup.name)
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
  });

  beforeEach('Login', () => {
    cy.loginAsAdmin();
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(testData.patronGroup.id);
    RefundReasons.deleteViaApi(refundReason.id);
    WaiveReasons.deleteViaApi(waiveReason.id);
    ManualCharges.deleteViaApi(testData.manualChargeId);
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    TransferAccounts.deleteViaApi(transferAccount.id);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemData.barcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C17064 Check the Actions button from filtering Circulation log by transferred partially (volaris)',
    { tags: ['criticalPath', 'volaris'] },
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
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Transferred partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17062 Check the Actions button from filtering Circulation log by transferred fully (volaris)',
    { tags: ['criticalPath', 'volaris'] },
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
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Transferred fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17052 Check the Actions button from filtering Circulation log by Paid partially (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(
          getActionBody(testData.paymentMethodName, partiallAmount),
          testData.feeFineId,
        );
        checkActionsButton('Paid partially');
      });
    },
  );

  it(
    'C17051 Filter circulation log by paid partially (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Paid partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17050 Check the Actions button from filtering Circulation log by Paid fully (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(
          getActionBody(testData.paymentMethodName, fullAmount),
          testData.feeFineId,
        );
        checkActionsButton('Paid fully');
      });
    },
  );

  it(
    'C17049 Filter circulation log by paid fully (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Paid fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17060 Check the Actions button from filtering Circulation log by refunded partially (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(
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
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Refunded partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17058 Check the Actions button from filtering Circulation log by refunded fully (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(
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
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Refunded fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17056 Check the Actions button from filtering Circulation log by waived partially (volaris)',
    { tags: ['criticalPath', 'volaris'] },
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
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Waived partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17054 Check the Actions button from filtering Circulation log by waived fully (volaris)',
    { tags: ['criticalPath', 'volaris'] },
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
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Waived fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17066 Check the Actions button from filtering Circulation log by cancelled as error (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        CancelFeeFaine.cancelFeeFineViaApi(
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
    'C17065 Filter circulation log by cancelled as errorror (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      filterByAction('Cancelled as error', `Amount: ${fullAmount}. Cancellation reason`);
    },
  );
});
