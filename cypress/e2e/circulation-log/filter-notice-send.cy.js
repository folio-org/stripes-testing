import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import settingsMenu from '../../support/fragments/settingsMenu';
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
import getRandomPostfix from '../../support/utils/stringTools';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import { ITEM_STATUS_NAMES } from '../../support/constants';

let user;

describe('circulation-log', () => {
  let addedCirculationRule;
  const noticePolicyTemplate = {
    ...NewNoticePolicyTemplate.defaultUi,
    category: NOTICE_CATEGORIES.loan.name
  };
  const noticePolicy = {
    ...NewNoticePolicy.defaultUi,
    templateName: noticePolicyTemplate.name,
    format: 'Email',
    action: NOTICE_ACTIONS.checkin,
    noticeName: NOTICE_CATEGORIES.loan.name,
    noticeId: NOTICE_CATEGORIES.loan.id
  };
  const patronGroup = {
    name: 'groupToTestNoticeCheckout' + getRandomPostfix()
  };
  const item = {
    instanceTitle: `Instance ${getRandomPostfix()}`,
    barcode: `item-${getRandomPostfix()}`
  };
  const testData = {
    noticePolicyTemplateToken: 'item.title',
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotest receive notice check in', uuid()),
  };

  before('create test data', () => {
    cy.getAdminToken().then(() => {
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => { testData.instanceTypeId = instanceTypes[0].id; });
      cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingTypeId = res[0].id; });
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
      Location.createViaApi(testData.defaultLocation);
      cy.createLoanType({
        name: `type_${getRandomPostfix()}`,
      }).then((loanType) => {
        testData.loanTypeId = loanType.id;
      });
      cy.getMaterialTypes({ limit: 1 }).then((res) => {
        testData.materialTypeId = res.id;
        testData.materialTypeName = res.name;
      });
    })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: item.instanceTitle,
          },
          holdings: [{
            holdingsTypeId: testData.holdingTypeId,
            permanentLocationId: testData.defaultLocation.id,
          }],
          items: [{
            barcode: item.barcode,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          }]
        }).then(specialInstanceIds => {
          item.instanceId = specialInstanceIds.instanceId;
          item.holdingId = specialInstanceIds.holdingIds[0].id;
          item.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });
    OtherSettings.setOtherSettingsViaApi({ prefPatronIdentifier: 'barcode,username' });
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
            user = userProperties;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(testData.userServicePoint.id,
              user.userId, testData.userServicePoint.id);

            cy.getCirculationRules().then((response) => {
              testData.baseRules = response.rulesAsText;
              testData.ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
            });

            cy.login(user.username, user.password, { path: settingsMenu.circulationPatronNoticePoliciesPath, waiter: NewNoticePolicyTemplate.waitLoading });

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
            NewNoticePolicy.checkPolicyName(noticePolicy);
            NewNoticePolicy.checkAfterSaving(noticePolicy);
            NewNoticePolicy.checkNoticeActions(noticePolicy);

            cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((res) => {
              testData.ruleProps.n = res[0].id;
              addedCirculationRule = 't ' + testData.loanTypeId + ': i ' + testData.ruleProps.i + ' l ' + testData.ruleProps.l + ' r ' + testData.ruleProps.r + ' o ' + testData.ruleProps.o + ' n ' + testData.ruleProps.n;
              CirculationRules.addRuleViaApi(testData.baseRules, testData.ruleProps, 't ', testData.loanTypeId);
            });

            cy.visit(TopMenu.checkOutPath);
            CheckOutActions.checkOutUser(user.barcode);
            CheckOutActions.checkOutItem(item.barcode);
            Checkout.verifyResultsInTheRow([item.barcode]);
            CheckOutActions.endCheckOutSession();

            cy.visit(TopMenu.checkInPath);
            CheckInActions.checkInItem(item.barcode);
            CheckInActions.verifyLastCheckInItem(item.barcode);
            CheckInActions.endCheckInSession();
            cy.visit(TopMenu.circulationLogPath);
          });
      });
  });

  after('delete test data', () => {
    UserEdit.changeServicePointPreferenceViaApi(user.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    NoticePolicyApi.deleteViaApi(testData.ruleProps.n);
    Users.deleteViaApi(user.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    cy.deleteLoanType(testData.loanTypeId);
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

  it('C17092 Filter circulation log by (notice) send (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    const searchResultsData = {
      userBarcode: user.barcode,
      itemBarcode: item.barcode,
      object: 'Notice',
      circAction: 'Send',
      servicePoint: testData.userServicePoint.name,
      source: 'System',
      desc: `Template: ${noticePolicyTemplate.name}. Triggering event: Check in.`,
    };

    SearchPane.setFilterOptionFromAccordion('notice', 'Send');
    SearchPane.verifyResultCells();
    SearchPane.checkResultSearch(searchResultsData);

    SearchPane.searchByUserBarcode(user.barcode);
    SearchPane.verifyResultCells();
    SearchPane.checkResultSearch(searchResultsData);
  });
});
