import Agreements from '../../../support/fragments/agreements/agreements';
import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import TopMenu from '../../../support/fragments/topMenu';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import SearchAndFilterAgreementLines from '../../../support/fragments/agreements/searchAndFilterAgreementLines';
import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';
import DeleteConfirmationModal from '../../../support/fragments/agreements/modals/deleteConfirmationModal';

let agreementLine;
let agreementId;

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
      });
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after(() => {
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C405546 Delete Agreement Line (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.openAgreementLineFilter();
      SearchAndFilterAgreementLines.verifyFilterOptions();

      SearchAndFilterAgreementLines.search(agreementLine.description);
      AgreementLines.verifyAgreementLinesCount(1);

      AgreementLines.agreementLinesListClick(agreementLine.description);
      AgreementLineInformation.waitLoadingWithExistingLine(agreementLine.description);
      AgreementLineInformation.verifyActionsButtons();

      AgreementLineInformation.gotoDelete();
      DeleteConfirmationModal.waitLoading();

      DeleteConfirmationModal.confirmDeleteAgreementLine();
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );

      AgreementViewDetails.openAgreementLineFilter();
      SearchAndFilterAgreementLines.search(agreementLine.description);
      AgreementLines.verifyAgreementLinesCount(0);
    },
  );
});
