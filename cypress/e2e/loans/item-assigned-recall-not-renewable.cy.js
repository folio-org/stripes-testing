import uuid from 'uuid';
import moment from 'moment';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
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
import RequestPolicy from '../../support/fragments/circulation/request-policy';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';

describe('TLR: Item renew', () => {
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
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotestRenew', uuid()),
  };
  const requestPolicyBody = {
    requestTypes: ['Recall'],
    name: `recall_${getRandomPostfix()}`,
    id: uuid(),
  };
  const loanPolicyBody = {
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
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        instanceData.itemsData = [
          {
            barcode: generateUniqueItemBarcodeWithShift(),
            status: { name: 'Available' },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
          {
            barcode: generateUniqueItemBarcodeWithShift(),
            status: { name: 'Available' },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
        ];
        cy.wrap(instanceData.itemsData).as('items');
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
          cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceData.instanceId}"` }).then(
            (instance) => {
              instanceData.instanceHRID = instance.hrid;
            }
          );
        });
      });
    LoanPolicy.createViaApi(loanPolicyBody);
    PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
      patronGroup.id = patronGroupResponse;
    });
    RequestPolicy.createViaApi(requestPolicyBody);
    CirculationRules.getViaApi().then((circulationRule) => {
      originalCirculationRules = circulationRule.rulesAsText;
      const ruleProps = CirculationRules.getRuleProps(circulationRule.rulesAsText);
      ruleProps.l = loanPolicyBody.id;
      ruleProps.r = requestPolicyBody.id;
      CirculationRules.addRuleViaApi(originalCirculationRules, ruleProps, 't ', testData.loanTypeId);
    });

    cy.createTempUser(
      [
        permissions.uiUsersfeefinesCRUD.gui,
        permissions.uiUsersfeefinesView.gui,
        permissions.loansRenew.gui,
        permissions.requestsAll.gui,
      ],
      patronGroup.name
    ).then((userProperties) => {
      userForRenew = userProperties;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userForRenew.userId,
        testData.userServicePoint.id
      );
    });

    cy.createTempUser([permissions.checkoutAll.gui], patronGroup.name)
      .then((userProperties) => {
        userForCheckOut = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userForCheckOut.userId,
          testData.userServicePoint.id
        );
      })
      .then(() => {
        cy.get('@items').each((item) => {
          Checkout.checkoutItemViaApi({
            id: uuid(),
            itemBarcode: item.barcode,
            loanDate: moment.utc().format(),
            servicePointId: testData.userServicePoint.id,
            userBarcode: userForCheckOut.barcode,
          });
        });
        cy.loginAsAdmin({
          path: SettingsMenu.circulationTitleLevelRequestsPath,
          waiter: TitleLevelRequests.waitLoading,
        }).then(() => {
          TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
        });
        cy.login(userForRenew.username, userForRenew.password);
      });
  });

  after('Deleting created entities', () => {
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
    cy.wrap(instanceData.itemIds).each((item) => {
      cy.deleteItemViaApi(item);
    });
    cy.deleteHoldingRecordViaApi(instanceData.holdingId);
    InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    RequestPolicy.deleteViaApi(requestPolicyBody.id);
    CirculationRules.deleteRuleViaApi(originalCirculationRules);
    cy.deleteLoanType(testData.loanTypeId);
    UserEdit.changeServicePointPreferenceViaApi(userForRenew.userId, [testData.userServicePoint.id]);
    UserEdit.changeServicePointPreferenceViaApi(userForCheckOut.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userForRenew.userId);
    Users.deleteViaApi(userForCheckOut.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
    cy.loginAsAdmin();
    cy.visit(SettingsMenu.circulationTitleLevelRequestsPath);
    TitleLevelRequests.waitLoading();
    TitleLevelRequests.changeTitleLevelRequestsStatus('forbid');
  });
  it(
    'C360534 TLR: Check that Item assigned to recall is not renewable (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      cy.visit(TopMenu.requestsPath);
      cy.intercept('POST', 'circulation/requests').as('createRequest');
      NewRequest.createNewRequest({
        requesterBarcode: userForRenew.barcode,
        instanceHRID: instanceData.instanceHRID,
        pickupServicePoint: testData.userServicePoint.name,
        requestType: 'Recall',
      });
      cy.wait('@createRequest').then((intercept) => {
        cy.wrap(intercept.response.body.item.barcode).as('itemBarcode');
      });

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userForCheckOut.barcode);
      UsersCard.waitLoading();
      UsersCard.openLoans();
      UsersCard.showOpenedLoans();
      cy.get('@itemBarcode').then((barcode) => {
        UserLoans.openLoan(barcode);
      });
      Renewals.checkLoansPage();
    }
  );
});
