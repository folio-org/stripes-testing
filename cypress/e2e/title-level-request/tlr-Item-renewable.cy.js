import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Renewals from '../../support/fragments/loans/renewals';
import NewRequest from '../../support/fragments/requests/newRequest';
import Requests from '../../support/fragments/requests/requests';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import getRandomPostfix from '../../support/utils/stringTools';

describe('TLR: Item renew', () => {
  let instanceHRID;
  let userForRenew = {};
  let userForCheckOut = {};
  const addedRules = [];
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
        cy.getBookMaterialType().then((materialTypes) => {
          testData.materialBookId = materialTypes.id;
        });
        cy.getDvdMaterialType().then((materialTypes) => {
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
      })
      .then(() => {
        PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
          patronGroup.id = patronGroupResponse;
        });
      })
      .then(() => {
        LoanPolicy.createViaApi(loanPolicyBody.renewable);
        CirculationRules.addRuleViaApi(
          { m: testData.materialBookId, g: patronGroup.id },
          { l: loanPolicyBody.renewable.id },
        ).then((newRule) => {
          addedRules.push(newRule);
        });
      })
      .then(() => {
        LoanPolicy.createViaApi(loanPolicyBody.nonRenewable);
        CirculationRules.addRuleViaApi(
          { m: testData.materialDvdId, g: patronGroup.id },
          { l: loanPolicyBody.nonRenewable.id },
        ).then((newRule) => {
          addedRules.push(newRule);
        });
      });

    cy.createTempUser(
      [
        permissions.uiUsersfeefinesCRUD.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.loansRenew.gui,
        permissions.uiRequestsAll.gui,
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
        TitleLevelRequests.enableTLRViaApi();
      });
  });

  beforeEach('Checkout items', () => {
    cy.getAdminToken();
    cy.wait(3000).then(() => {
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"id"=="${instanceData.instanceId}"`,
      }).then((instance) => {
        instanceHRID = instance.hrid;

        if (instance.hrid === undefined) {
          cy.log('Instance HRID is not generated successfully').then(() => {
            throw new Error('Instance HRID is not generated');
          });
        }
      });
    });
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
    cy.getAdminToken();
    cy.wrap(instanceData.itemIds).each((item) => {
      cy.deleteItemViaApi(item);
    });
    cy.wrap(addedRules).each((rule) => {
      CirculationRules.deleteRuleViaApi(rule);
    });
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
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  afterEach('Deleting created entities', () => {
    cy.getAdminToken();
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
    'C360533 TLR: Check that Item assigned to hold is renewable/non renewable depends Loan policy (vega)',
    { tags: ['criticalPath', 'vega', 'shiftLeft', 'C360533'] },
    () => {
      cy.login(userForRenew.username, userForRenew.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
        authRefresh: true,
      });

      NewRequest.createNewRequest({
        requesterBarcode: userForRenew.barcode,
        instanceHRID,
        pickupServicePoint: testData.userServicePoint.name,
        requestType: REQUEST_TYPES.HOLD,
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userForCheckOut.barcode);
      UsersCard.waitLoading();
      UsersCard.viewCurrentLoans();
      UserLoans.openLoanDetails(instanceData.itemsData[0].barcode);
      UserLoans.renewItem(instanceData.itemsData[0].barcode, true);
      LoanDetails.checkAction(0, 'Renewed');

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
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
    { tags: ['criticalPath', 'vega', 'C360534'] },
    () => {
      cy.login(userForRenew.username, userForRenew.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
        authRefresh: true,
      });

      NewRequest.createNewRequest({
        requesterBarcode: userForRenew.barcode,
        instanceHRID,
        pickupServicePoint: testData.userServicePoint.name,
        requestType: REQUEST_TYPES.RECALL,
      });
      cy.wait('@createRequest').then((intercept) => {
        cy.wrap(intercept.response.body.item.barcode).as('itemBarcode');
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
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
