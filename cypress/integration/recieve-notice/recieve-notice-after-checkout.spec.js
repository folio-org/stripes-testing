import uuid from 'uuid';
import moment from 'moment';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import circulationRules from '../../support/fragments/circulation/circulation-rules';
import noticePolicy, { NOTICE_CATEGORIES, NOTICE_ACTIONS } from '../../support/fragments/circulation/notice-policy';
import patronGroups from '../../support/fragments/settings/users/patronGroups';
import topMenu from '../../support/fragments/topMenu';
import settingsMenu from '../../support/fragments/settingsMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import checkInActions from '../../support/fragments/check-in-actions/checkInActions';
import newPatronNoticePolicies from '../../support/fragments/circulation/newPatronNoticePolicies';
import newPatronNoticeTemplate from '../../support/fragments/circulation/newPatronNoticeTemplate';

// TODO Add email notice check after checktout: https://issues.folio.org/browse/FAT-185
describe('Recieving notice: Checkout', () => {
  const patronNoticeTemplate = {
    ...newPatronNoticeTemplate.defaultUiPatronNoticeTemplate,
  };
  const patronNoticePolicy = {
    ...newPatronNoticePolicies.defaultUiPatronNoticePolicies,
  };
  const ITEM_BARCODE = generateItemBarcode();
  const patronGroup = {};
  const userData = {
    username: `Test_user_${getRandomPostfix()}`,
    active: true,
    barcode: uuid(),
    personal: {
      preferredContactTypeId: '002',
      lastName: `Test user ${getRandomPostfix()}`,
      email: 'test@folio.org',
    },
    departments: []
  };
  let loanType;
  let materialType;
  let location;
  let holdingType;
  let holdingSource;
  let instanceType;
  let userServicePoint;
  let noticeId;

  beforeEach('Creating help entities', () => {
    cy.getAdminToken()
      .then(() => patronGroups.createViaApi())
      .then(res => {
        cy.createUserApi({
          patronGroup: res.id,
          ...userData
        }).then((createdUser) => {
          userData.id = createdUser.id;
        });
        patronGroup.name = res.group;
        patronGroup.id = res.id;
      })
      .then(() => {
        cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then((res) => {
          cy.addServicePointToUser(res[0].id, userData.id).then((points) => {
            userServicePoint = points.body.defaultServicePointId;
          });
        });
      })
      .then(() => {
        cy.getMaterialTypes({ limit: 1 }).then((res) => { materialType = res.id; });
        cy.getLocations({ limit: 1 }).then((res) => { location = res.id; });
        cy.getHoldingTypes({ limit: 1 }).then((res) => { holdingType = res[0].id; });
        cy.getHoldingSources({ limit: 1 }).then((res) => { holdingSource = res[0].id; });
        cy.getInstanceTypes({ limit: 1 }).then((res) => { instanceType = res[0].id; });
        cy.getLoanTypes({ limit: 1 }).then((res) => { loanType = res[0].id; });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: instanceType,
            title: `Pre-checkout instance ${Number(new Date())}`,
          },
          holdings: [{
            holdingsTypeId: holdingType,
            permanentLocationId: location,
            sourceId: holdingSource,
          }],
          items: [
            [{
              barcode: ITEM_BARCODE,
              missingPieces: '3',
              numberOfMissingPieces: '3',
              status: { name: 'Available' },
              permanentLoanType: { id: loanType },
              materialType: { id: materialType },
            }],
          ],
        });
      });
    cy.loginAsAdmin({ path: settingsMenu.circulationPatronNoticePoliciesPath, waiter: newPatronNoticeTemplate.waitLoading });
  });
  afterEach('Deleting created entities', () => {
    cy.visit(settingsMenu.circulationPatronNoticePoliciesPath);
    circulationRules.deleteAddedRuleApi(Cypress.env('defaultRules'));
    noticePolicy.deleteApi(noticeId);
    newPatronNoticeTemplate.waitLoading();
    newPatronNoticeTemplate.openTemplateToSide(patronNoticeTemplate);
    newPatronNoticeTemplate.deleteTemplate();
    // noticePolicyTemplate.deleteViaApi(templateId);

    checkInActions.createItemCheckinApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: userServicePoint,
      checkInDate: moment.utc().format(),
    }).then(() => {
      cy.deleteUser(userData.id);
      patronGroups.deleteViaApi(patronGroup.id);
    });

    cy.getInstance({ limit: 1, expandAll: true, query: `"items.barcode"=="${ITEM_BARCODE}"` })
      .then((instance) => {
        cy.deleteItem(instance.items[0].id);
        cy.deleteHoldingRecord(instance.holdings[0].id);
        cy.deleteInstanceApi(instance.id);
      });
  });

  it('C347621 Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    newPatronNoticeTemplate.createTemplate(patronNoticeTemplate);
    newPatronNoticeTemplate.checkTemplate(patronNoticeTemplate);
    patronNoticePolicy.templateId = patronNoticeTemplate.name;
    patronNoticePolicy.format = 'Email';
    patronNoticePolicy.action = NOTICE_ACTIONS.checkout;
    patronNoticePolicy.noticeName = NOTICE_CATEGORIES.loan.name;
    patronNoticePolicy.noticeId = NOTICE_CATEGORIES.loan.id;

    cy.visit(`${settingsMenu.circulationPatronNoticePoliciesPath}`);
    newPatronNoticePolicies.createPolicy(patronNoticePolicy);
    newPatronNoticePolicies.addNotice(patronNoticePolicy);
    newPatronNoticePolicies.savePolicy();
    newPatronNoticePolicies.checkPolicy(patronNoticePolicy.name);
    cy.getNoticePolicy({ query: `name=="${patronNoticePolicy.name}"` }).then((res) => {
      try { noticeId = res[0].id; circulationRules.addNewRuleApi(patronGroup.id, res[0].id); } catch (error) { console.log(error); }
    });

    cy.visit(topMenu.checkOutPath);
    cy.checkOutItem(userData.barcode, ITEM_BARCODE);

    cy.visit(topMenu.circulationLogPath);
    searchPane.searchByItemBarcode(ITEM_BARCODE);
    searchPane.verifyResultCells();
  });
});
