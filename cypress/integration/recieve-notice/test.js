import noticePolicy from '../../support/fragments/circulation/notice-policy';
import noticePolicyTemplate from '../../support/fragments/circulation/notice-policy-template';

describe('sdfgsdfg', () => {
  let templateId;
  let noticePolicyId;

  it('sdfgdsfgsdgf', () => {
    const category = noticePolicyTemplate.noticeTemplateCategories.loan;
    cy.getAdminToken();
    noticePolicyTemplate.createViaApi(category).then(res => { templateId = res.body.id; }).then(() => {
      noticePolicy.createWithTemplateApi(templateId, 'Check out').then(res => { noticePolicyId = res.id; });
    });
  });

  afterEach(() => {
    noticePolicy.deleteApi(noticePolicyId);
    noticePolicyTemplate.deleteViaApi(templateId);
  });
});
