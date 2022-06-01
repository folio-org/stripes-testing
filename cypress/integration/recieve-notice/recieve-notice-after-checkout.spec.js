import uuid from 'uuid';
import moment from 'moment';
import checkout from '../../support/fragments/checkout/checkout';
import searchPane from '../../support/fragments/circulation-log/searchPane';
import circulationRules from '../../support/fragments/circulation/circulation-rules';
import noticePolicy, { NOTICE_ACTIONS } from '../../support/fragments/circulation/notice-policy';
import noticePolicyTemplate, { TEMPLATE_CATEGORIES } from '../../support/fragments/circulation/notice-policy-template';
import patronGroups from '../../support/fragments/settings/users/patronGroups';
import topMenu from '../../support/fragments/topMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import checkInActions from '../../support/fragments/check-in-actions/checkInActions';

// TODO email checking
describe('Recieving notice: Checkout', () => {
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
  let templateId;
  let noticePolicyId;
  let loanType;
  let materialType;
  let location;
  let holdingType;
  let holdingSource;
  let instanceType;
  let userServicePoint;

  beforeEach('Creating help entities', () => {
    cy.getAdminToken()
      .then(() => {
        patronGroups.createViaApi();
      })
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
            console.log(points);
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
      })
      .then(() => {
        noticePolicyTemplate.createViaApi(TEMPLATE_CATEGORIES.loan).then(res => { templateId = res.body.id; });
      })
      .then(() => {
        noticePolicy.createWithTemplateApi(templateId, NOTICE_ACTIONS.checkout).then(res => { noticePolicyId = res.id; });
      })
      .then(() => {
        cy.loginAsAdmin({ path: topMenu.checkOutPath, waiter: checkout.waitLoading });
      })
      .then(() => {
        cy.checkOutItem(userData.username, ITEM_BARCODE);
      });
  });
  afterEach('Deleting created entities', () => {
    circulationRules.deleteAddedRuleApi(Cypress.env('defaultRules'));
    noticePolicy.deleteApi(noticePolicyId);
    noticePolicyTemplate.deleteViaApi(templateId);
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
    cy.visit(topMenu.circulationLogPath);
    searchPane.searchByItemBarcode(ITEM_BARCODE);
    searchPane.verifyResultCells();
  });
});
