import uuid from 'uuid';
import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import { getTestEntityValue } from '../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import UserEdit from '../../support/fragments/users/userEdit';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import WaiveFeeFineModal from '../../support/fragments/users/waiveFeeFineModal';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import RefundFeeFine from '../../support/fragments/users/refundFeeFine';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';

describe('Circulation log', () => {
  const patronGroup = {
    name: getTestEntityValue('GroupCircLog'),
  };
  let userData;
  const itemData = {
    barcode: generateItemBarcode(),
    title: getTestEntityValue('InstanceCircLog'),
  };
  const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());
  const refundReason = RefundReasons.getDefaultNewRefundReason(uuid());
  const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    manualChargeName: null,
  };
  const waiveBody = (amount) => ({
    amount,
    paymentMethod: waiveReason.nameReason,
    notifyPatron: false,
    servicePointId: testData.userServicePoint.id,
    userName: 'ADMINISTRATOR, DIKU',
  });
  const payBody = (amount) => ({
    amount,
    paymentMethod: testData.paymentMethodName,
    notifyPatron: false,
    servicePointId: testData.userServicePoint.id,
    userName: 'ADMINISTRATOR, DIKU',
  });
  const transferBody = (amount) => ({
    amount,
    paymentMethod: transferAccount.accountName,
    notifyPatron: false,
    servicePointId: testData.userServicePoint.id,
    userName: 'ADMINISTRATOR, DIKU',
  });
  const refundBody = (amount) => ({
    amount,
    paymentMethod: refundReason.nameReason,
    notifyPatron: false,
    servicePointId: testData.userServicePoint.id,
    userName: 'ADMINISTRATOR, DIKU',
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
  const filterByAction = (filterName) => {
    const searchResultsData = {
      userBarcode: userData.barcode,
      itemBarcode: itemData.barcode,
      object: 'Fee/fine',
      circAction: filterName,
      // TODO: add check for date with format <C6/8/2022, 6:46 AM>
      servicePoint: testData.userServicePoint.name,
      source: 'ADMINISTRATOR, DIKU',
      desc: `Fee/Fine type: ${testData.manualChargeName}.`,
    };
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.waitLoading();
    SearchPane.setFilterOptionFromAccordion('fee', filterName);
    SearchPane.findResultRowIndexByContent(searchResultsData.servicePoint).then((rowIndex) => {
      SearchPane.checkResultSearch(searchResultsData, rowIndex);
    });
    SearchPane.resetResults();
    SearchPane.searchByItemBarcode(itemData.barcode);
    SearchPane.findResultRowIndexByContent(searchResultsData.servicePoint).then((rowIndex) => {
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
      source: 'ADMINISTRATOR, DIKU',
    });
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
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

    PatronGroups.createViaApi(patronGroup.name).then((group) => {
      patronGroup.id = group;
      cy.createTempUser([permissions.circulationLogAll.gui], patronGroup.name)
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
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
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
    'C17061 Filter circulation log by transferred fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      createFeeFine().then((feeFineId) => {
        cy.log(userData.userName);
        testData.feeFineId = feeFineId;
        TransferFeeFine.transferFeeFineViaApi(transferBody('4.00'), testData.feeFineId);
        filterByAction('Transferred fully');
        NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
      });
    },
  );

  it(
    'C17052 Check the Actions button from filtering Circulation log by Paid partially (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(payBody('2.00'), testData.feeFineId);
        checkActionsButton('Paid partially');
      });
    },
  );

  it(
    'C17051 Filter circulation log by paid partially (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      filterByAction('Paid partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17050 Check the Actions button from filtering Circulation log by Paid fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(payBody('4.00'), testData.feeFineId);
        checkActionsButton('Paid fully');
      });
    },
  );

  it(
    'C17049 Filter circulation log by paid fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      filterByAction('Paid fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17060 Check the Actions button from filtering Circulation log by refunded partially (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(payBody('4.00'), testData.feeFineId);
        RefundFeeFine.refundFeeFineViaApi(refundBody('2.00'), testData.feeFineId);
        checkActionsButton('Refunded partially');
      });
    },
  );

  it(
    'C17059 Filter circulation log by refunded partially (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      filterByAction('Refunded partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17058 Check the Actions button from filtering Circulation log by refunded fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        PayFeeFaine.payFeeFineViaApi(payBody('4.00'), testData.feeFineId);
        RefundFeeFine.refundFeeFineViaApi(refundBody('4.00'), testData.feeFineId);
        checkActionsButton('Refunded fully');
      });
    },
  );

  it(
    'C17057 Filter circulation log by refunded fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      filterByAction('Refunded fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17056 Check the Actions button from filtering Circulation log by waived partially (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        WaiveFeeFineModal.waiveFeeFineViaApi(waiveBody('2.00'), testData.feeFineId);
        checkActionsButton('Waived partially');
      });
    },
  );

  it(
    'C17055 Filter circulation log by waived partially (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      filterByAction('Waived partially');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );

  it(
    'C17054 Check the Actions button from filtering Circulation log by waived fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      createFeeFine().then((feeFineId) => {
        testData.feeFineId = feeFineId;
        WaiveFeeFineModal.waiveFeeFineViaApi(waiveBody('4.00'), testData.feeFineId);
        checkActionsButton('Waived fully');
      });
    },
  );

  it(
    'C17053 Filter circulation log by waived fully (volaris)',
    { tags: [TestTypes.criticalPath, devTeams.volaris] },
    () => {
      filterByAction('Waived fully');
      NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineId);
    },
  );
});
