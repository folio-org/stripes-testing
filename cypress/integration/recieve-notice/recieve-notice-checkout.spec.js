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
import DefaultUser from '../../support/fragments/user/defaultUser';

// TODO Add email notice check after checktout: https://issues.folio.org/browse/FAT-185
describe('Recieving notice: Checkout', () => {
  const noticePolicyTemplate = { ...NewNoticePolicyTemplate.defaultUi };
  const noticePolicy = { ...NewNoticePolicy.defaultUi };
  const ITEM_BARCODE = generateItemBarcode();
  const patronGroup = {};
  const userData = { ...DefaultUser.defaultApiPatron };
  const searchResultsData = {
    userBarcode: userData.barcode,
    itemBarcode: ITEM_BARCODE,
    objectType: NOTICE_CATEGORIES.loan.name,
    souce: 'ADMINISTRATOR, DIKU',
    desc: 'Checked out to proxy: no.',
    circAction: 'Checked out',
  };
  const testData = {};

  beforeEach('Preconditions', () => {
    noticePolicyTemplate.token = 'item.title';
    noticePolicy.templateId = noticePolicyTemplate.name;
    noticePolicy.format = 'Email';
    noticePolicy.action = NOTICE_ACTIONS.checkout;
    noticePolicy.noticeName = NOTICE_CATEGORIES.loan.name;
    noticePolicy.noticeId = NOTICE_CATEGORIES.loan.id;

    cy.getAdminToken();

    PatronGroups.createViaApi()
      .then(res => {
        patronGroup.name = res.group;
        patronGroup.id = res.id;
        cy.createUserApi({
          patronGroup: res.id,
          ...userData
        }).then((createdUser) => {
          userData.id = createdUser.id;
        });
      });

    cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' })
      .then((servicePoints) => {
        cy.addServicePointToUser(servicePoints[0].id, userData.id).then((points) => {
          testData.userServicePoint = points.body.defaultServicePointId;
        });
        cy.getMaterialTypes({ limit: 1 }).then((res) => { testData.materialType = res.id; });
        cy.getLocations({ limit: 1 }).then((res) => { testData.location = res.id; });
        cy.getHoldingTypes({ limit: 1 }).then((res) => { testData.holdingType = res[0].id; });
        cy.getHoldingSources({ limit: 1 }).then((res) => { testData.holdingSource = res[0].id; });
        cy.getInstanceTypes({ limit: 1 }).then((res) => { testData.instanceType = res[0].id; });
        cy.getLoanTypes({ limit: 1 }).then((res) => { testData.loanType = res[0].id; });
      })

      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: testData.instanceType,
            title: `Pre-checkout_instance_${Number(new Date())}`,
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

    cy.loginAsAdmin({ path: settingsMenu.circulationPatronNoticePoliciesPath, waiter: NewNoticePolicyTemplate.waitLoading });
  });

  afterEach('Deleting created entities', () => {
    cy.visit(settingsMenu.circulationPatronNoticePoliciesPath);
    CheckInActions.createItemCheckinApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.userServicePoint,
      checkInDate: moment.utc().format(),
    }).then(() => {
      cy.deleteUser(userData.id);
      PatronGroups.deleteViaApi(patronGroup.id);
    });

    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });

    CirculationRules.deleteRuleApi(testData.defaultRules);
    NoticePolicyApi.deleteApi(testData.noticeId);
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticePolicyTemplate.name}` }).then((templateId) => {
      NoticePolicyTemplateApi.deleteViaApi(templateId);
    });
  });

  it('C347621 Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button', { tags: [testTypes.smoke, devTeams.vega] }, () => {
    NewNoticePolicyTemplate.startAdding();
    NewNoticePolicyTemplate.create(noticePolicyTemplate);
    NewNoticePolicyTemplate.addToken(noticePolicyTemplate);
    noticePolicyTemplate.body += '{{item.title}}';
    NewNoticePolicyTemplate.save();
    NewNoticePolicyTemplate.check(noticePolicyTemplate);

    cy.visit(`${settingsMenu.circulationPatronNoticePoliciesPath}`);
    NewNoticePolicy.startAdding();
    NewNoticePolicy.create(noticePolicy);
    NewNoticePolicy.addNotice(noticePolicy);
    NewNoticePolicy.save();
    NewNoticePolicy.check(noticePolicy.name);
    cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((res) => {
      testData.noticeId = res[0].id;
    });

    cy.getCirculationRules().then((resp) => {
      testData.defaultRules = resp.rulesAsText;
      CirculationRules.addRuleApi(resp.rulesAsText, ' g ', patronGroup.id, testData.noticeId);
    });

    cy.visit(topMenu.checkOutPath);
    CheckOutActions.checkOutItem(userData.barcode, ITEM_BARCODE);
    CheckOutActions.endSession();

    cy.visit(topMenu.circulationLogPath);
    SearchPane.searchByItemBarcode(ITEM_BARCODE);
    SearchPane.verifyResultCells();
    SearchPane.checkResultSearch(searchResultsData);
  });
});
