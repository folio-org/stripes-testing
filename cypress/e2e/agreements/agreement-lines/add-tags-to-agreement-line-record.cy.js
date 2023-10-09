import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import { TestTypes, DevTeams } from '../../../support/dictionary';
import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';

let agreementLine;
let agreementId;
let agreementLineId;

describe('Agreement Lines', () => {
  before('Create test data', () => {
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

  after('Delete test data', () => {
    AgreementLines.deleteViaApi({ agreementId, agreementLineId });
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C343340 Add tags to an Agreement Line record (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );
      AgreementViewDetails.verifyAgreementLinesCount('1');

      AgreementViewDetails.openAgreementLineSection();
      AgreementViewDetails.verifySpecialAgreementLineRow({
        description: agreementLine.description,
      });
      AgreementViewDetails.clickAgreementLineRecordByTitle(agreementLine.description);
      AgreementLineInformation.waitLoadingWithExistingLine(agreementLine.description);

      AgreementLineInformation.openTagsPane();
      AgreementLineInformation.addTag('important');
      AgreementLineInformation.addTag('urgent');
      AgreementLineInformation.closeTagsPane();
      AgreementLineInformation.verifyTagsCount('2');
    },
  );
});
