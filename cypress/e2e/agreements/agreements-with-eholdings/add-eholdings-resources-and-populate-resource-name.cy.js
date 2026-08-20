import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';
import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import NewAgreementLine from '../../../support/fragments/agreements/newAgreementLine';
import SearchAndFilterAgreementLines from '../../../support/fragments/agreements/searchAndFilterAgreementLines';
import SearchAndFilterAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';
import SelectEHoldingsModal from '../../../support/fragments/agreements/modals/selectEHoldingsModal';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';

const R = {
  AGREEMENT: 'agreement',
  PACKAGE: 'package',
  TITLE: 'title',
  USER: 'user',
};

describe('Agreements', () => {
  describe('Agreements with eHoldings', () => {
    const flow = new ExecutionFlowManager();
    const postfix = getRandomPostfix();
    const packageName = `AT_C1347108_Package_${postfix}`;
    const titleName = `AT_C1347108_Title_${postfix}`;

    before('Create C1347108 preconditions', () => {
      cy.getAdminToken();
      cy.clearLocalStorage();

      flow
        .step((currentFlow) => Agreements.createViaApi({
          ...Agreements.defaultAgreement,
          name: `AT_C1347108_Agreement_${postfix}`,
        }).then((agreement) => currentFlow.set(R.AGREEMENT, agreement, () => Agreements.deleteViaApi(agreement.id))))
        .step((currentFlow) => EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: { name: packageName, contentType: 'E-Book' },
          },
        }).then(({ data }) => currentFlow.set(R.PACKAGE, data, () => EHoldingsPackages.deletePackageViaAPI(packageName))))
        .step((currentFlow) => EHoldingsTitles.createEHoldingTitleVIaApi({
          packageId: currentFlow.get(R.PACKAGE).id,
          titleName,
        }).then((title) => currentFlow.set(R.TITLE, title)))
        .step((currentFlow) => cy
          .createTempUser([
            Permissions.moduleeHoldingsEnabled.gui,
            Permissions.uiAgreementsAgreementsEdit.gui,
            Permissions.uiAgreementsSearchAndView.gui,
          ])
          .then((user) => currentFlow.set(R.USER, user, () => Users.deleteViaApi(user.userId))))
        .step((currentFlow) => cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
          path: TopMenu.agreementsPath,
          waiter: Agreements.waitLoading,
        }));
    });

    after('Delete C1347108 data', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    const addAgreementLine = ({ resourceName, title = false, description, note } = {}) => {
      AgreementViewDetails.openAgreementLineSection();
      AgreementViewDetails.clickActionsForAgreementLines();
      AgreementViewDetails.clickNewAgreementLine();
      NewAgreementLine.waitLoading();
      NewAgreementLine.clickEHoldingsTab();
      NewAgreementLine.clickLinkEResource();
      if (title) SelectEHoldingsModal.clickTitlesToggle();
      SelectEHoldingsModal.searchForTitleOrPackage(resourceName);
      SelectEHoldingsModal.selectRecord(resourceName);
      NewAgreementLine.verifyLinkedEResourceIsDisplayed(resourceName);
      if (description) NewAgreementLine.fillDescription(description);
      if (note) NewAgreementLine.fillNote(note);

      cy.intercept('POST', '**/erm/entitlements').as('createEntitlement');
      NewAgreementLine.saveAndClose();
      cy.wait('@createEntitlement').then((interception) => {
        expect(interception.request.body.resourceName).to.eq(resourceName);
        expect(interception.response.body.resourceName).to.eq(resourceName);
      });
      AgreementLineInformation.verifyResourceName(resourceName);
      AgreementLineInformation.close();
    };

    it(
      'C1347108 Add an agreement line with an eHoldings resource and populate resourceName (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C1347108'] },
      () => {
        const { agreement } = flow.ctx();
        SearchAndFilterAgreements.search(agreement.name);
        Agreements.selectRecord(agreement.name);
        AgreementViewDetails.waitLoading();

        cy.log('<--- STEP 1: Open the New agreement line page --->');
        cy.log('<--- STEP 2: Link an eHoldings package --->');
        cy.log('<--- STEP 3: Save and verify package resourceName in the POST payload --->');
        cy.intercept('POST', '**/erm/entitlements').as('packagePost');
        addAgreementLine({ resourceName: packageName });
        cy.get('@packagePost').then((interception) => {
          cy.wrap(interception.response?.body?.id).as('packageEntitlementId');
        });

        cy.log('<--- STEP 4: Verify the package line in the Agreement lines accordion --->');
        AgreementViewDetails.verifyAgreementLinesCount(1);
        AgreementViewDetails.clickAgreementLineRecordByTitle(packageName);
        AgreementLineInformation.verifyResourceName(packageName);
        AgreementLineInformation.close();

        cy.log('<--- STEP 5: Open another New agreement line page --->');
        cy.log('<--- STEP 6: Link an eHoldings title --->');
        cy.log('<--- STEP 7: Save and verify title resourceName in the POST payload --->');
        cy.intercept('POST', '**/erm/entitlements').as('titlePost');
        addAgreementLine({ resourceName: titleName, title: true });
        cy.get('@titlePost').then((interception) => {
          cy.wrap(interception.response?.body?.id).as('titleEntitlementId');
        });

        cy.log('<--- STEP 8: Verify the title line in the Agreement lines accordion --->');
        AgreementViewDetails.verifyAgreementLinesCount(2);

        cy.log('<--- STEP 9: Add custom package/title lines with description and note --->');
        addAgreementLine({
          resourceName: packageName,
          description: `AT_C1347108_Description_${postfix}`,
          note: `AT_C1347108_Note_${postfix}`,
        });
        addAgreementLine({ resourceName: titleName, title: true });
        AgreementViewDetails.verifyAgreementLinesCount(4);

        cy.log('<--- STEP 10: Filter Agreement lines by the Agreement --->');
        AgreementViewDetails.openAgreementLineFilter();
        SearchAndFilterAgreementLines.search(packageName);
        AgreementLines.checkAgreementLineFound(packageName);
        SearchAndFilterAgreementLines.search(titleName);
        AgreementLines.checkAgreementLineFound(titleName);

        cy.log('<--- STEP 11: Verify resourceName in every entitlement response --->');
        cy.get('@packageEntitlementId').then((id) => {
          cy.okapiRequest({
            path: `erm/entitlements/${id}`,
            isDefaultSearchParamsRequired: false,
          }).then(({ body }) => {
            expect(body.resourceName).to.eq(packageName);
          });
        });
        cy.get('@titleEntitlementId').then((id) => {
          cy.okapiRequest({
            path: `erm/entitlements/${id}`,
            isDefaultSearchParamsRequired: false,
          }).then(({ body }) => {
            expect(body.resourceName).to.eq(titleName);
          });
        });

        cy.log('<--- STEPS 12-14: Search by resource name, description and note --->');
        [
          { query: packageName, expectedName: packageName },
          { query: titleName, expectedName: titleName },
          { query: `AT_C1347108_Description_${postfix}`, expectedName: packageName },
          { query: `AT_C1347108_Note_${postfix}`, expectedName: packageName },
        ].forEach(({ query, expectedName }) => {
          SearchAndFilterAgreementLines.search(query);
          AgreementLines.checkAgreementLineFound(expectedName);
        });
      },
    );
  });
});
