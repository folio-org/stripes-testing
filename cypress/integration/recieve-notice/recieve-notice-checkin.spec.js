import moment from 'moment';
import topMenu from '../../support/fragments/topMenu';
import settingsMenu from '../../support/fragments/settingsMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NoticePolicyApi, { NOTICE_CATEGORIES, NOTICE_ACTIONS } from '../../support/fragments/circulation/notice-policy';
import NoticePolicyTemplateApi from '../../support/fragments/circulation/notice-policy-template';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import NewNoticePolicy from '../../support/fragments/circulation/newNoticePolicy';
import NewNoticePolicyTemplate from '../../support/fragments/circulation/newNoticePolicyTemplate';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import DefaultUser from '../../support/fragments/users/userDefaultObjects/defaultUser';
import loanPolicy from '../../support/fragments/circulation/loan-policy';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import Users from '../../support/fragments/users/users';

// TODO Add email notice check after checktout: https://issues.folio.org/browse/FAT-1854
describe('Recieving notice: Checkin', () => {
  const noticePolicyTemplate = { ...NewNoticePolicyTemplate.defaultUi };
  const noticePolicy = { ...NewNoticePolicy.defaultUi };
  const ITEM_BARCODE = generateItemBarcode();
  const patronGroup = {};
  const userData = { ...DefaultUser.defaultApiPatron };
  const searchResultsData = {
    userBarcode: userData.barcode,
    itemBarcode: ITEM_BARCODE,
    objectType1: NOTICE_CATEGORIES.loan.name,
    objectType2: 'Notice',
    circAction1: 'Checked in',
    circAction2: 'Closed loan',
    circAction3: 'Checked out',
    // TODO: add check for date with format <C6/8/2022, 6:46 AM>
    servicePoint: 'Online',
    source1: 'ADMINISTRATOR, DIKU',
    source2: 'System',
    desc: 'Checked out to proxy: no.',
  };
  const testData = {
    instanceTitle: `Pre-checkin_instance_${Number(new Date())}`
  };

  beforeEach('Preconditions', () => {
    noticePolicyTemplate.token = 'item.title';
    noticePolicyTemplate.category = NOTICE_CATEGORIES.loan.name;
    noticePolicy.templateName = noticePolicyTemplate.name;
    noticePolicy.format = 'Email';
    noticePolicy.action = NOTICE_ACTIONS.checkin;
    noticePolicy.noticeName = NOTICE_CATEGORIES.loan.name;
    noticePolicy.noticeId = NOTICE_CATEGORIES.loan.id;

    cy.getAdminToken();
    PatronGroups.createViaApi()
      .then(res => {
        patronGroup.id = res;
        Users.createViaApi({
          patronGroup: res,
          ...userData
        }).then((createdUser) => {
          userData.id = createdUser.id;
        });
      });

    cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' })
      .then((servicePoints) => {
        cy.addServicePointToUser([servicePoints[0].id], userData.id).then((points) => {
          testData.userServicePoint = points.body.defaultServicePointId;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialType = res.id; });
        cy.getLocations({ limit: 1 }).then((res) => { testData.location = res.id; });
        cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingType = res[0].id; });
        InventoryHoldings.getHoldingSources({ limit: 1 }).then((res) => { testData.holdingSource = res[0].id; });
        cy.getInstanceTypes({ limit: 1 }).then((res) => { testData.instanceType = res[0].id; });
        cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanType = res[0].id; });
      })

      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: testData.instanceType,
            title: testData.instanceTitle,
          },
          holdings: [{
            holdingsTypeId: testData.holdingType,
            permanentLocationId: testData.location,
            sourceId: testData.holdingSource,
          }],
          items: [
            [{
              barcode: ITEM_BARCODE,
              missingPieces: '3',
              numberOfMissingPieces: '3',
              status: { name: 'Available' },
              permanentLoanType: { id: testData.loanType },
              materialType: { id: testData.materialType },
            }],
          ],
        });
      });

    cy.getCirculationRules().then((res) => {
      testData.baseRules = res.rulesAsText;
      testData.ruleProps = CirculationRules.getRuleProps(res.rulesAsText);
    });

    loanPolicy.getApi({ limit: 1 }).then((loanPolicyRes) => {
      testData.ruleProps.l = loanPolicyRes.body.loanPolicies[0].id;
      testData.loanNoticeName = loanPolicyRes.body.loanPolicies[0].name;
    });

    cy.loginAsAdmin({ path: settingsMenu.circulationPatronNoticePoliciesPath, waiter: NewNoticePolicyTemplate.waitLoading });
  });

  afterEach('Deleting created entities', () => {
    CheckInActions.createItemCheckinApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.userServicePoint,
      checkInDate: moment.utc().format(),
    }).then(() => {
      Users.deleteViaApi(userData.id);
      PatronGroups.deleteViaApi(patronGroup.id);
    });

    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });

    CirculationRules.deleteRuleApi(testData.baseRules);
    NoticePolicyApi.deleteApi(testData.ruleProps.n);
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticePolicyTemplate.name}` }).then((templateId) => {
      NoticePolicyTemplateApi.deleteViaApi(templateId);
    });
  });

  it('C347623 Check that user can receive notice with multiple items after finishing the session "Check in" by clicking the End Session button', { tags: [testTypes.smoke, devTeams.vega] }, () => {
    NewNoticePolicyTemplate.startAdding();
    NewNoticePolicyTemplate.checkInitialState();
    NewNoticePolicyTemplate.create(noticePolicyTemplate);
    NewNoticePolicyTemplate.addToken(noticePolicyTemplate);
    noticePolicyTemplate.body += '{{item.title}}';
    NewNoticePolicyTemplate.save();
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
      CirculationRules.addRuleApi(testData.baseRules, testData.ruleProps, 'g ', patronGroup.id);
    });

    cy.visit(topMenu.checkOutPath);
    CheckOutActions.checkOutUser(userData.barcode);
    CheckOutActions.checkUserInfo(userData, patronGroup.name);
    CheckOutActions.checkOutUser(userData.barcode);
    CheckOutActions.checkOutItem(ITEM_BARCODE);
    CheckOutActions.checkUserInfo(userData);
    CheckOutActions.checkItemInfo(ITEM_BARCODE, testData.instanceTitle, testData.loanNoticeName);
    CheckOutActions.endSession();

    cy.visit(topMenu.checkInPath);
    cy.checkInItem(ITEM_BARCODE);
    cy.verifyItemCheckIn();

    cy.visit(topMenu.circulationLogPath);
    SearchPane.searchByItemBarcode(ITEM_BARCODE);
    SearchPane.verifyResultCells();
    SearchPane.checkResultSearch(searchResultsData, 3);
  });
});
