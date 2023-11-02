import uuid from 'uuid';
import moment from 'moment';
import TestTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import parallelization from '../../../../support/dictionary/parallelization';
import permissions from '../../../../support/dictionary/permissions';
import UserEdit from '../../../../support/fragments/users/userEdit';
import TopMenu from '../../../../support/fragments/topMenu';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import generateUniqueItemBarcodeWithShift from '../../../../support/utils/generateUniqueItemBarcodeWithShift';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../../../support/fragments/users/users';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import CheckInActions from '../../../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../../../support/fragments/checkout/checkout';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../support/utils/stringTools';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../../../support/fragments/settings/users/paymentMethods';
import LoanPolicy from '../../../../support/fragments/circulation/loan-policy';
import Conditions from '../../../../support/fragments/settings/users/conditions';
import Limits from '../../../../support/fragments/settings/users/limits';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserLoans from '../../../../support/fragments/users/loans/userLoans';
import Renewals from '../../../../support/fragments/loans/renewals';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Patron Block: Maximum number of overdue items', () => {
  let addedCirculationRule;
  let originalCirculationRules;
  const renewComment = `AutotestText${getRandomPostfix()}`;
  const blockMessage = `You have reached maximum number of overdue items as set by patron group${getRandomPostfix()}`;
  const patronGroup = {
    name: 'groupToPatronBlock' + getRandomPostfix(),
  };
  const userData = {};
  const itemsData = {
    itemsWithSeparateInstance: [
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
      { instanceTitle: `Instance ${getRandomPostfix()}` },
    ],
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const owner = {
    body: {
      owner: 'AutotestOwner' + getRandomPostfix(),
      servicePointOwner: [
        {
          value: testData.userServicePoint.id,
          label: testData.userServicePoint.name,
        },
      ],
    },
    data: {},
  };
  const loanPolicyBody = {
    id: uuid(),
    name: `1_loan_${getRandomPostfix()}`,
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
      period: {
        duration: 1,
        intervalId: 'Minutes',
      },
      profileId: 'Rolling',
    },
    renewable: true,
    renewalsPolicy: {
      unlimited: true,
      renewFromId: 'SYSTEM_DATE',
    },
  };

  const findPatron = () => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByKeywords(userData.barcode);
  };

  before('Preconditions', () => {
    itemsData.itemsWithSeparateInstance.forEach((item, index) => {
      item.barcode = generateUniqueItemBarcodeWithShift(index);
    });

    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((res) => {
          testData.holdingTypeId = res[0].id;
        });
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((res) => {
          testData.loanTypeId = res.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
      })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: item.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.defaultLocation.id,
              },
            ],
            items: [
              {
                barcode: item.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
            itemsData.itemsWithSeparateInstance[index].holdingId =
              specialInstanceIds.holdingIds[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId =
              specialInstanceIds.holdingIds[0].itemIds;
          });
        });
      });

    UsersOwners.createViaApi(owner.body).then((response) => {
      owner.data = response;
      PaymentMethods.createViaApi(response.id).then((resp) => {
        testData.paymentMethodId = resp.id;
      });
    });
    LoanPolicy.createViaApi(loanPolicyBody);
    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
    });
    CirculationRules.getViaApi().then((response) => {
      originalCirculationRules = response.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
      ruleProps.l = loanPolicyBody.id;
      addedCirculationRule =
        't ' +
        testData.loanTypeId +
        ': i ' +
        ruleProps.i +
        ' l ' +
        ruleProps.l +
        ' r ' +
        ruleProps.r +
        ' o ' +
        ruleProps.o +
        ' n ' +
        ruleProps.n;
      CirculationRules.addRuleViaApi(
        originalCirculationRules,
        ruleProps,
        't ',
        testData.loanTypeId,
      );
    });

    cy.createTempUser(
      [
        permissions.uiUsersSettingsOwners.gui,
        permissions.loansAll.gui,
        permissions.overridePatronBlock.gui,
        permissions.uiUsersCreatePatronConditions.gui,
        permissions.uiUsersCreatePatronLimits.gui,
        permissions.checkinAll.gui,
        permissions.checkoutAll.gui,
        permissions.uiUsersView.gui,
      ],
      patronGroup.name,
    )
      .then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
        userData.barcode = userProperties.barcode;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
        cy.login(userData.username, userData.password);
        cy.visit(SettingsMenu.conditionsPath);
        Conditions.waitLoading();
        Conditions.select('Maximum number of overdue items');
        Conditions.setConditionState(blockMessage);
        cy.visit(SettingsMenu.limitsPath);
        Limits.selectGroup(patronGroup.name);
        Limits.setLimit('Maximum number of overdue items', '4');
      });
  });

  beforeEach('Assign lost status to items', () => {
    cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
    cy.get('@items').each((item) => {
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: item.barcode,
        loanDate: moment.utc().format(),
        servicePointId: testData.userServicePoint.id,
        userBarcode: userData.barcode,
      });
    });

    UserLoans.changeDueDateForAllOpenPatronLoans(userData.userId, -1);
  });

  afterEach('Returning items to original state', () => {
    cy.get('@items').each((item) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
  });

  after('Deleting created entities', () => {
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    UsersOwners.deleteViaApi(owner.data.id);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each((item, index) => {
      cy.deleteItemViaApi(item.itemId);
      cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
      InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
    });
    Conditions.resetConditionViaApi(
      '584fbd4f-6a34-4730-a6ca-73a6a6a9d845',
      'Maximum number of overdue items',
    );
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.deleteLoanType(testData.loanTypeId);
  });
  it(
    'C350654 Verify automated patron block "Maximum number of overdue items" removed after overdue item renewed (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega, parallelization.nonParallel] },
    () => {
      findPatron();
      UsersCard.waitLoading();
      Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

      const itemForRenew = itemsData.itemsWithSeparateInstance[0];
      UsersCard.viewCurrentLoans();
      UserLoans.openLoanDetails(itemForRenew.barcode);
      UserLoans.renewItem(itemForRenew.barcode, true);
      Renewals.renewBlockedPatron(renewComment);

      findPatron();
      Users.checkPatronIsNotBlocked(userData.userId);
    },
  );

  it(
    'C350649 Verify automated patron block "Maximum number of overdue items" removed after overdue item returned (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega, parallelization.nonParallel] },
    () => {
      findPatron();
      UsersCard.waitLoading();
      Users.checkIsPatronBlocked(blockMessage, 'Borrowing, Renewals, Requests');

      cy.visit(TopMenu.checkInPath);
      const itemForCheckIn = itemsData.itemsWithSeparateInstance[0];
      CheckInActions.checkInItemGui(itemForCheckIn.barcode);
      CheckInActions.verifyLastCheckInItem(itemForCheckIn.barcode);

      findPatron();
      Users.checkPatronIsNotBlocked(userData.userId);
    },
  );
});
