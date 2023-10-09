import uuid from 'uuid';
import moment from 'moment';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import parallelization from '../../support/dictionary/parallelization';
import permissions from '../../support/dictionary/permissions';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../support/utils/stringTools';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UsersCard from '../../support/fragments/users/usersCard';
import Renewals from '../../support/fragments/loans/renewals';
import NewRequest from '../../support/fragments/requests/newRequest';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';

describe('TLR: Item renew', () => {
  let instanceHRID;
  let addedCirculationRule;
  let originalCirculationRules;
  let userForRenew = {};
  let userForCheckOut = {};
  const patronGroup = {
    name: 'groupToRenew' + getRandomPostfix(),
  };
  const instanceData = {
    title: `Instance ${getRandomPostfix()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const loanPolicyBody = {
    renewable: {
      id: uuid(),
      name: `renewable_${getRandomPostfix()}`,
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
        renewFromId: 'CURRENT_DUE_DATE',
      },
      requestManagement: { holds: { renewItemsWithRequest: true } },
    },
    nonRenewable: {
      id: uuid(),
      name: `nonRenewable_${getRandomPostfix()}`,
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
        unlimited: false,
        numberAllowed: 2,
        renewFromId: 'SYSTEM_DATE',
      },
      requestManagement: { holds: { renewItemsWithRequest: false } },
    },
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.loginAsAdmin({
          path: SettingsMenu.circulationTitleLevelRequestsPath,
          waiter: TitleLevelRequests.waitLoading,
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
        cy.getMaterialTypes({ query: 'name="book"' }).then((materialTypes) => {
          testData.materialBookId = materialTypes.id;
        });
        cy.getMaterialTypes({ query: 'name="dvd"' }).then((materialTypes) => {
          testData.materialDvdId = materialTypes.id;
        });
      })
      .then(() => {
        instanceData.itemsData = [
          {
            barcode: generateUniqueItemBarcodeWithShift(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialBookId },
          },
          {
            barcode: generateUniqueItemBarcodeWithShift(),
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialDvdId },
          },
        ];
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: instanceData.itemsData,
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.holdingId = specialInstanceIds.holdingIds[0].id;
          instanceData.itemIds = specialInstanceIds.holdingIds[0].itemIds;
        });
      });
    LoanPolicy.createViaApi(loanPolicyBody.renewable);
    LoanPolicy.createViaApi(loanPolicyBody.nonRenewable);
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
      const defaultProps = ` i ${ruleProps.i} r ${ruleProps.r} o ${ruleProps.o} n ${ruleProps.n}`;
      addedCirculationRule = ` \nm ${testData.materialBookId} + g ${patronGroup.id}: l ${loanPolicyBody.renewable.id} ${defaultProps} \nm ${testData.materialDvdId} + g ${patronGroup.id}: l ${loanPolicyBody.nonRenewable.id} ${defaultProps}`;
      cy.updateCirculationRules({
        rulesAsText: `${originalCirculationRules}${addedCirculationRule}`,
      });
    });

    cy.createTempUser(
      [
        permissions.uiUsersfeefinesCRUD.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.loansRenew.gui,
        permissions.requestsAll.gui,
      ],
      patronGroup.name,
    ).then((userProperties) => {
      userForRenew = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userForRenew.userId,
        testData.userServicePoint.id,
      );
    });

    cy.createTempUser([permissions.checkoutAll.gui], patronGroup.name)
      .then((userProperties) => {
        userForCheckOut = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userForCheckOut.userId,
          testData.userServicePoint.id,
        );
      })
      .then(() => {
        TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
        cy.login(userForRenew.username, userForRenew.password);
      });
  });

  beforeEach('Checkout items', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceData.instanceId}"` }).then(
      (instance) => {
        instanceHRID = instance.hrid;
      },
    );
    cy.wrap(instanceData.itemsData).as('items');
    cy.get('@items').each((item) => {
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: item.barcode,
        loanDate: moment.utc().format(),
        servicePointId: testData.userServicePoint.id,
        userBarcode: userForCheckOut.barcode,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    cy.wrap(instanceData.itemIds).each((item) => {
      cy.deleteItemViaApi(item);
    });
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    cy.deleteHoldingRecordViaApi(instanceData.holdingId);
    InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
    cy.deleteLoanPolicy(loanPolicyBody.renewable.id);
    cy.deleteLoanPolicy(loanPolicyBody.nonRenewable.id);
    UserEdit.changeServicePointPreferenceViaApi(userForRenew.userId, [
      testData.userServicePoint.id,
    ]);
    UserEdit.changeServicePointPreferenceViaApi(userForCheckOut.userId, [
      testData.userServicePoint.id,
    ]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userForRenew.userId);
    Users.deleteViaApi(userForCheckOut.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    TitleLevelRequests.changeTitleLevelRequestsStatus('forbid');
  });

  afterEach('Deleting created entities', () => {
    cy.get('@items').each((item) => {
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
      Checkout.checkoutItemViaApi({
        id: uuid(),
        itemBarcode: item.barcode,
        loanDate: moment.utc().format(),
        servicePointId: testData.userServicePoint.id,
        userBarcode: userForRenew.barcode,
      });
      CheckInActions.checkinItemViaApi({
        itemBarcode: item.barcode,
        servicePointId: testData.userServicePoint.id,
        checkInDate: new Date().toISOString(),
      });
    });
  });

  it(
    'C360533: TLR: Check that Item assigned to hold is renewable/non renewable depends Loan policy (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega, parallelization.nonParallel] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      NewRequest.createNewRequest({
        requesterBarcode: userForRenew.barcode,
        instanceHRID,
        pickupServicePoint: testData.userServicePoint.name,
        requestType: REQUEST_TYPES.HOLD,
      });

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userForCheckOut.barcode);
      UsersCard.waitLoading();
      UsersCard.viewCurrentLoans();
      UserLoans.openLoanDetails(instanceData.itemsData[0].barcode);
      UserLoans.renewItem(instanceData.itemsData[0].barcode, true);
      LoanDetails.checkAction(0, 'Renewed');

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userForCheckOut.barcode);
      UsersCard.waitLoading();
      UsersCard.viewCurrentLoans();
      UserLoans.openLoanDetails(instanceData.itemsData[1].barcode);
      Renewals.checkLoansPage();
    },
  );

  it(
    'C360534 TLR: Check that Item assigned to recall is not renewable (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega, parallelization.nonParallel] },
    () => {
      cy.visit(TopMenu.requestsPath);
      Requests.waitLoading();
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      NewRequest.createNewRequest({
        requesterBarcode: userForRenew.barcode,
        instanceHRID,
        pickupServicePoint: testData.userServicePoint.name,
        requestType: REQUEST_TYPES.RECALL,
      });
      cy.wait('@createRequest').then((intercept) => {
        cy.wrap(intercept.response.body.item.barcode).as('itemBarcode');
      });

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userForCheckOut.barcode);
      UsersCard.waitLoading();
      UsersCard.viewCurrentLoans();
      cy.get('@itemBarcode').then((barcode) => {
        UserLoans.openLoanDetails(barcode);
      });
      Renewals.checkLoansPage();
    },
  );
});
