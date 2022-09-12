import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import settingsMenu from '../../support/fragments/settingsMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import UserEdit from '../../support/fragments/users/userEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NoticePolicyApi, { NOTICE_CATEGORIES, NOTICE_ACTIONS } from '../../support/fragments/circulation/notice-policy';
import NoticePolicyTemplateApi from '../../support/fragments/circulation/notice-policy-template';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import NewNoticePolicy from '../../support/fragments/circulation/newNoticePolicy';
import NewNoticePolicyTemplate from '../../support/fragments/circulation/newNoticePolicyTemplate';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../support/utils/stringTools';

function generateUniqueItemBarcodeWithShift(index = 0) {
  return ((generateItemBarcode() - Math.round(getRandomPostfix())) + '').substring(index);
}

describe('Recieving notice: Checkout', () => {
  const noticePolicyTemplate = { ...NewNoticePolicyTemplate.defaultUi,
    category: NOTICE_CATEGORIES.loan.name };
  const noticePolicy = { ...NewNoticePolicy.defaultUi,
    templateName: noticePolicyTemplate.name,
    format: 'Email',
    action: NOTICE_ACTIONS.checkin,
    noticeName: NOTICE_CATEGORIES.loan.name,
    noticeId: NOTICE_CATEGORIES.loan.id };
  const patronGroup = {
    name: 'groupToTestNoticeCheckout' + getRandomPostfix()
  };
  const userData = {
    personal: {
      lastname: null
    }
  };
  const itemsData = {
    itemsWithSeparateInstance: [{
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    },
    {
      instanceTitle: `Instance ${getRandomPostfix()}`,
    }]
  };
  const testData = {
    noticePolicyTemplateToken: 'item.title',
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotest receive notice check in', uuid()),
  };
  const searchResultsData = {
    userBarcode: null,
    object: 'Notice',
    circAction: 'Send',
    // TODO: add check for date with format <C6/8/2022, 6:46 AM>
    servicePoint: testData.userServicePoint.name,
    source: 'System',
    desc: `Template: ${noticePolicyTemplate.name}. Triggering event: Check in.`,
  };

  beforeEach('Preconditions', () => {
    itemsData.itemsWithSeparateInstance.forEach(function (item, index) { item.barcode = generateUniqueItemBarcodeWithShift(index); });
    searchResultsData.itemBarcode = itemsData.itemsWithSeparateInstance[0].barcode;
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
      Location.createViaApi(testData.defaultLocation);
      cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanTypeId = res[0].id; });
      cy.getMaterialTypes({ limit: 1 }).then((res) => {
        testData.materialTypeId = res.id;
        testData.materialTypeName = res.name;
      });
    })
      .then(() => {
        itemsData.itemsWithSeparateInstance.forEach((item, index) => {
          InventoryInstances.createFolioInstanceViaApi({ instance: {
            instanceTypeId: testData.instanceTypeId,
            title: item.instanceTitle,
          },
          holdings: [{
            holdingsTypeId: testData.holdingTypeId,
            permanentLocationId: testData.defaultLocation.id,
          }],
          items:[{
            barcode: item.barcode,
            status:  { name: 'Available' },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          }] }).then(specialInstanceIds => {
            itemsData.itemsWithSeparateInstance[index].instanceId = specialInstanceIds.instanceId;
            itemsData.itemsWithSeparateInstance[index].holdingId = specialInstanceIds.holdingIds[0].id;
            itemsData.itemsWithSeparateInstance[index].itemId = specialInstanceIds.holdingIds[0].itemIds;
          });
        });
        cy.wrap(itemsData.itemsWithSeparateInstance).as('items');
      });
    PatronGroups.createViaApi(patronGroup.name)
      .then(res => {
        patronGroup.id = res;
        cy.createTempUser([permissions.checkinAll.gui,
          permissions.checkoutAll.gui,
          permissions.circulationLogAll.gui,
          permissions.uiCirculationSettingsNoticeTemplates.gui,
          permissions.uiCirculationSettingsNoticePolicies.gui
        ], patronGroup.name)
          .then(userProperties => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.personal.lastname = userProperties.lastName;
            searchResultsData.userBarcode = userProperties.barcode;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(testData.userServicePoint.id,
              userData.userId, testData.userServicePoint.id);

            cy.getCirculationRules().then((response) => {
              testData.baseRules = response.rulesAsText;
              testData.ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
            });

            cy.login(userData.username, userData.password, { path: settingsMenu.circulationPatronNoticePoliciesPath, waiter: NewNoticePolicyTemplate.waitLoading });
          });
      });
  });

  afterEach('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(testData.baseRules);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    NoticePolicyApi.deleteApi(testData.ruleProps.n);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.get('@items').each(
      (item, index) => {
        cy.deleteItem(item.itemId);
        cy.deleteHoldingRecordViaApi(itemsData.itemsWithSeparateInstance[index].holdingId);
        InventoryInstance.deleteInstanceViaApi(itemsData.itemsWithSeparateInstance[index].instanceId);
      }
    );
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticePolicyTemplate.name}` }).then((templateId) => {
      NoticePolicyTemplateApi.deleteViaApi(templateId);
    });
  });

  it('C347621 Check that user can receive notice with multiple items after finishing the session "Check in" by clicking the End Session button (vega)',
    { tags: [testTypes.smoke, devTeams.vega] }, () => {
      NewNoticePolicyTemplate.startAdding();
      NewNoticePolicyTemplate.checkInitialState();
      NewNoticePolicyTemplate.addToken(testData.noticePolicyTemplateToken);
      noticePolicyTemplate.body += '{{item.title}}';
      NewNoticePolicyTemplate.create(noticePolicyTemplate);
      NewNoticePolicyTemplate.checkAfterSaving(noticePolicyTemplate);
      NewNoticePolicyTemplate.checkTemplateActions(noticePolicyTemplate);

      cy.visit(settingsMenu.circulationPatronNoticePoliciesPath);
      NewNoticePolicy.waitLoading();
      NewNoticePolicy.startAdding();
      NewNoticePolicy.checkInitialState();
      NewNoticePolicy.fillGeneralInformation(noticePolicy);
      NewNoticePolicy.addNotice(noticePolicy);
      NewNoticePolicy.save();
      NewNoticePolicy.check(noticePolicy);
      NewNoticePolicy.checkAfterSaving(noticePolicy);
      NewNoticePolicy.checkNoticeActions(noticePolicy);

      cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((res) => {
        testData.ruleProps.n = res[0].id;
        CirculationRules.addRuleViaApi(testData.baseRules, testData.ruleProps, 'g ', patronGroup.id);
      });

      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkUserInfo(userData, patronGroup.name);
      cy.get('@items').each(
        (item) => {
          CheckOutActions.checkOutItem(item.barcode);
          Checkout.verifyResultsInTheRow([item.barcode]);
        }
      );
      CheckOutActions.endCheckOutSession();

      cy.visit(TopMenu.checkInPath);
      cy.get('@items').each((item) => {
        CheckInActions.checkInItem(item.barcode);
        CheckInActions.verifyLastCheckInItem(item.barcode);
      });
      CheckInActions.endCheckInSession();

      cy.visit(TopMenu.circulationLogPath);
      SearchPane.searchByUserBarcode(userData.barcode);
      SearchPane.verifyResultCells();
      SearchPane.checkResultSearch(searchResultsData);
    });
});
