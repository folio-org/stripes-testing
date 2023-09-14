import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Agreements from '../../support/fragments/agreements/agreements';
import NewAgreement from '../../support/fragments/agreements/newAgreement';
import InteractorsTools from '../../support/utils/interactorsTools';
import AgreementViewDetails from '../../support/fragments/agreements/agreementViewDetails';
import AgreementsApi from '../../support/api/agreements';

describe('Agreements', () => {
  const defaultAgreement = { ...NewAgreement.getdefaultAgreement() };
  const calloutMessage = `Agreement created: ${defaultAgreement.name}`;

  before('login', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after('delete test data', () => {
    AgreementsApi.getIdViaApi({ limit: 1000, query: `"name"=="${defaultAgreement.name}"` }).then(
      (id) => {
        AgreementsApi.deleteViaApi(id);
      },
    );
  });

  it('C757 Create an Agreement (erm)', { tags: [TestTypes.smoke, DevTeams.erm] }, () => {
    Agreements.create(defaultAgreement);
    InteractorsTools.checkCalloutMessage(calloutMessage);
    Agreements.checkAgreementPresented(defaultAgreement.name);
    AgreementViewDetails.verifyAgreementDetails(defaultAgreement);
    AgreementViewDetails.verifyLastUpdatedDate();
  });
});
