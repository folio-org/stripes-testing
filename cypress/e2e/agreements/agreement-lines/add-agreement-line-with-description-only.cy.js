import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';
import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import NewAgreementLine from '../../../support/fragments/agreements/newAgreementLine';
import TopMenu from '../../../support/fragments/topMenu';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

let agreementId;
const agreementLineDescription = `Agreement Line Description ${randomFourDigitNumber()}`;

describe('agreements', () => {
  describe('Agreement Lines', () => {
    before(() => {
      cy.getAdminToken();
      Agreements.createViaApi().then((agreement) => {
        agreementId = agreement.id;
      });
      cy.clearLocalStorage();
      cy.loginAsAdmin({
        path: {
          url: TopMenu.agreementsPath,
          qs: { query: Agreements.defaultAgreement.name },
        },
        waiter: Agreements.waitLoading,
      });
    });

    after(() => {
      cy.getAdminToken();
      AgreementLines.getIdViaApi({ match: 'description', term: agreementLineDescription }).then(
        (id) => {
          AgreementLines.deleteViaApi({ agreementId, agreementLineId: id });
        },
      );
      Agreements.deleteViaApi(agreementId);
    });

    it(
      'C15829 Add agreement line with description only (erm) (TaaS)',
      { tags: ['extendedPathErm', 'erm'] },
      () => {
        cy.log('<--- STEP 1 --->');
        AgreementViewDetails.agreementListClick(Agreements.defaultAgreement.name);
        AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
          Agreements.defaultAgreement.name,
        );
        AgreementViewDetails.verifyAgreementLinesCount('0');

        cy.log('<--- STEP 2 --->');
        AgreementViewDetails.openAgreementLineSection();

        cy.log('<--- STEP 3 --->');
        AgreementViewDetails.clickActionsForAgreementLines();

        cy.log('<--- STEP 4 --->');
        AgreementViewDetails.clickNewAgreementLine();
        NewAgreementLine.waitLoading();

        cy.log('<--- STEP 5 --->');
        NewAgreementLine.clickDescriptionField();
        NewAgreementLine.clickNoteField();
        NewAgreementLine.verifyDescriptionAlertMessage(
          NewAgreementLine.calloutMessages.ALERT_MESSAGE,
          true,
        );

        cy.log('<--- STEP 6 --->');
        NewAgreementLine.fillDescription(agreementLineDescription);
        NewAgreementLine.verifyDescriptionAlertMessage(
          NewAgreementLine.calloutMessages.ALERT_MESSAGE,
          false,
        );

        cy.log('<--- STEP 7 --->');
        cy.wait(2000);
        NewAgreementLine.saveAndClose();
        AgreementLineInformation.waitLoadingWithExistingLine(Agreements.defaultAgreement.name);
        AgreementLineInformation.verifyDescription(agreementLineDescription);

        cy.log('<--- STEP 8 --->');
        AgreementLineInformation.close();

        cy.log('<--- STEP 9 --->');
        AgreementViewDetails.verifyAgreementLinesCount('1');
        AgreementViewDetails.openAgreementLineSection();
        AgreementViewDetails.verifySpecialAgreementLineRow({
          description: agreementLineDescription,
        });
      },
    );
  });
});
