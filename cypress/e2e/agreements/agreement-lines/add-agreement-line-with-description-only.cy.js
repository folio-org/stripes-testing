import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import { TestTypes, DevTeams } from '../../../support/dictionary';
import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import NewAgreementLine from '../../../support/fragments/agreements/newAgreementLine';
import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

let agreementId;
const agreementLineDescription = `Agreement Line Description ${randomFourDigitNumber()}`;
describe('Agreement Lines', () => {
  before(() => {
    cy.getAdminToken();
    Agreements.createViaApi().then((agreement) => {
      agreementId = agreement.id;
    });
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
  });

  after(() => {
    AgreementLines.getIdViaApi({ match: 'description', term: agreementLineDescription }).then(
      (id) => {
        AgreementLines.deleteViaApi({ agreementId, agreementLineId: id });
      },
    );
    Agreements.deleteViaApi(agreementId);
  });

  it(
    'C15829 Add agreement line with description only (erm) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.erm] },
    () => {
      AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
        Agreements.defaultAgreement.name,
      );
      AgreementViewDetails.verifyAgreementLinesCount('0');

      AgreementViewDetails.openAgreementLineSection();
      AgreementViewDetails.clickActionsForAgreementLines();
      AgreementViewDetails.clickNewAgreementLine();
      NewAgreementLine.waitLoading();

      NewAgreementLine.clickDescriptionField();
      NewAgreementLine.clickNoteField();
      NewAgreementLine.verifyDescriptionAlertMessage(
        NewAgreementLine.calloutMessages.ALERT_MESSAGE,
        true,
      );

      NewAgreementLine.fillDescription(agreementLineDescription);
      NewAgreementLine.verifyDescriptionAlertMessage(
        NewAgreementLine.calloutMessages.ALERT_MESSAGE,
        false,
      );

      NewAgreementLine.saveAndClose();
      AgreementLineInformation.verifyDescription(agreementLineDescription);

      AgreementLineInformation.close();
      AgreementViewDetails.verifyAgreementLinesCount('1');

      AgreementViewDetails.openAgreementLineSection();
      AgreementViewDetails.verifySpecialAgreementLineRow({
        description: agreementLineDescription,
      });
    },
  );
});
