import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';
import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

const randomPostfix = getRandomPostfix();
const tagNames = [`tag1${randomPostfix}`, `tag2${randomPostfix}`];
let agreementLine;
let agreementId;
let agreementLineId;
const tagIds = [];

describe('agreements', () => {
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
        })
        .then(() => {
          tagNames.forEach((tag) => {
            cy.createTagApi({ label: tag }).then((tagId) => {
              tagIds.push(tagId);
            });
          });
        })
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.agreementsPath,
            waiter: Agreements.waitLoading,
            authRefresh: true,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      AgreementLines.deleteViaApi({ agreementId, agreementLineId });
      Agreements.deleteViaApi(agreementId);
      tagIds.forEach((tagId) => {
        cy.deleteTagApi(tagId, true);
      });
    });

    it(
      'C343340 Add tags to an Agreement Line record (erm) (TaaS)',
      { tags: ['extendedPathErm', 'erm'] },
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
        tagNames.forEach((tag) => {
          AgreementLineInformation.addNewTag(tag);
          AgreementLineInformation.verifyTagAdded(tag);
        });
        AgreementLineInformation.closeTagsPane();
        AgreementLineInformation.verifyTagsCount('2');
      },
    );
  });
});
