import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import NewAgreement from '../../../support/fragments/agreements/newAgreement';
import TopMenu from '../../../support/fragments/topMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('agreements', () => {
  describe('Agreements Creation and Management', () => {
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
      Agreements.getIdViaApi({ limit: 1000, query: `"name"=="${defaultAgreement.name}"` }).then(
        (id) => {
          Agreements.deleteViaApi(id);
        },
      );
    });

    it('C757 Create an Agreement (erm)', { tags: ['smokeErm', 'erm'] }, () => {
      Agreements.create(defaultAgreement);
      InteractorsTools.checkCalloutMessage(calloutMessage);
      Agreements.checkAgreementPresented(defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetails(defaultAgreement);
      AgreementViewDetails.verifyLastUpdatedDate();
    });
  });
});
