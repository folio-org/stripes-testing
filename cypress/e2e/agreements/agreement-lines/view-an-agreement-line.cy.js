import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';

let agreementLine;
let agreementId;
let agreementLineId;

describe('agreements', () => {
  describe('Agreement Lines', () => {
    before(() => {
      cy.getAdminToken();
      Agreements.createViaApi()
        .then((agreement) => {
          agreementId = agreement.id;
        })
        .then(() => {
          agreementLine = AgreementLines.defaultAgreementLine(agreementId);
          AgreementLines.createViaApi(agreementLine);
        })
        .then((response) => {
          agreementLineId = response.id;
        });
      cy.loginAsAdmin({
        path: TopMenu.agreementsPath,
        waiter: Agreements.waitLoading,
      });
    });

    after(() => {
      AgreementLines.deleteViaApi({ agreementId, agreementLineId });
      Agreements.deleteViaApi(agreementId);
    });

    it('C761 View an Agreement line (erm) (TaaS)', { tags: ['extendedPathErm', 'erm'] }, () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );
      AgreementViewDetails.verifyAgreementLinesCount('1');

      AgreementViewDetails.openAgreementLineSection();
      AgreementViewDetails.verifySpecialAgreementLineRow({
        description: agreementLine.description,
      });
    });
  });
});
