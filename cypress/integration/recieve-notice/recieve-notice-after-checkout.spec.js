import uuid from 'uuid';
import circulationRules from '../../support/fragments/circulation/circulation-rules';
import noticePolicy, { NOTICE_ACTIONS } from '../../support/fragments/circulation/notice-policy';
import noticePolicyTemplate, { TEMPLATE_CATEGORIES } from '../../support/fragments/circulation/notice-policy-template';
import patronGroups from '../../support/fragments/settings/users/patronGroups';
// TODO email checking
describe('Recieving notice: Checkout', () => {
  const patronGroup = {};
  const userData = {
    active: true,
    barcode: uuid(),
    personal: {
      preferredContactTypeId: '002',
      lastName: 'Test_last_Name',
      email: 'test@folio.org',
    },
    patronGroup: patronGroup.id,
    departments: []
  };
  let userId;
  let templateId;
  let noticePolicyId;

  beforeEach(() => {
    cy.getAdminToken();
    // creating noticy with template
    noticePolicyTemplate.createViaApi(TEMPLATE_CATEGORIES.loan).then(res => { templateId = res.body.id; }).then(() => {
      noticePolicy.createWithTemplateApi(templateId, NOTICE_ACTIONS.checkout).then(res => { noticePolicyId = res.id; });
    }).then(() => {
      // creating patron group
      patronGroups.createViaApi().then(res => {
        patronGroup.name = res.group;
        patronGroup.id = res.id;
      }).then(() => {
        // creating rule
        circulationRules.addNewRuleApi(patronGroup.id, noticePolicyId);
      });
    });
    // creating item
    try {
      cy.createUserApi(userData).then(user => { userId = user.id; });
      // cy.createItemRequestApi({
      //   requestType: 'Page',
      //   fulfilmentPreference: 'Hold Shelf',
      //   itemId: Cypress.env('items')[0].id,
      //   requesterId: specialUserId,
      //   pickupServicePointId: Cypress.env('servicePoints')[0].id,
      //   requestDate: '2021-09-20T18:36:56Z',
      // })
    } catch (error) {
      console.log(error);
    }
    // specialItem.holdingsRecordId = specialHolding.id;
    // specialItem.permanentLoanType.id = loanTypes[0].id;
    // specialItem.materialType.id = materialType.id;
  });

  afterEach(() => {
    circulationRules.deleteAddedRuleApi(Cypress.env('defaultRules'));
    noticePolicy.deleteApi(noticePolicyId);
    noticePolicyTemplate.deleteViaApi(templateId);
    patronGroups.deleteViaApi(patronGroup.id);
    cy.deleteUser(userId);
    // cy.deleteItem()
  });

  it('C347621 Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button', () => {
    cy.log('123');
  });
});
