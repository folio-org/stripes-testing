import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import SearchAndFilterAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';
import agreementLines from '../../../support/fragments/agreements/agreementLines';

const R = {
  AGREEMENT: 'agreement',
  PACKAGES: 'packages',
  TITLES: 'titles',
  LINES: 'lines',
  USER: 'user',
};

describe('Agreements', () => {
  describe('Agreements with eHoldings', () => {
    const flow = new ExecutionFlowManager();
    const postfix = getRandomPostfix();
    const packageNames = [1, 2, 3].map((number) => `AT_C1347207_Package_${number}_${postfix}`);
    const titleNames = [1, 2, 3].map((number) => `AT_C1347207_Title_${number}_${postfix}`);

    before('Create C1347207 preconditions', () => {
      cy.getAdminToken();

      flow
        // 1) Three custom packages and titles have been created in “eHoldings” app
        .step((currentFlow) => {
          const packages = [];
          return cy
            .wrap(packageNames)
            .each((name) => {
              return EHoldingsPackages.createPackageViaAPI({
                data: {
                  type: 'packages',
                  attributes: {
                    name,
                    contentType: 'E-Book',
                  },
                },
              }).then(({ data }) => packages.push(data));
            })
            .then(() => currentFlow.set(R.PACKAGES, packages, () => packageNames.forEach((name) => EHoldingsPackages.deletePackageViaAPI(name))));
        })
        .step((currentFlow) => {
          const titles = [];

          return cy
            .wrap(currentFlow.get(R.PACKAGES))
            .each((ePackage, index) => {
              return EHoldingsTitles.createEHoldingTitleVIaApi({
                packageId: ePackage.id,
                titleName: titleNames[index],
              }).then((title) => titles.push(title));
            })
            .then(() => currentFlow.set(R.TITLES, titles));
        })
        // 2) Agreement has been created
        .step((currentFlow) => {
          return Agreements.createViaApi({
            ...Agreements.defaultAgreement,
            name: `AT_C1347207_Agreement_${postfix}`,
          }).then((agreement) => currentFlow.set(R.AGREEMENT, agreement, () => Agreements.deleteViaApi(agreement.id)));
        })
        // Find ERM resource UUIDs and create 5 agreement lines via API
        .step((currentFlow) => {
          const agreementId = currentFlow.get(R.AGREEMENT).id;
          const lines = [];

          const createLine = ({ authority, reference, resource }) => {
            return agreementLines
              .createViaApi({
                authority,
                owner: agreementId,
                resourceName: resource.attributes.name,
                reference,
                type: 'external',
              })
              .then((r) => {
                lines.push(r);
              });
          };

          cy.then(() => {
            [
              {
                authority: 'ekb-package',
                resource: flow.get(R.PACKAGES)[0],
                reference: flow.get(R.PACKAGES)[0].id,
              },
              {
                authority: 'ekb-title',
                resource: flow.get(R.TITLES)[0],
                reference: `${flow.get(R.PACKAGES)[0].id}-${flow.get(R.TITLES)[0].id}`,
              },
              {
                authority: 'ekb-title',
                resource: flow.get(R.TITLES)[1],
                reference: `${flow.get(R.PACKAGES)[1].id}-${flow.get(R.TITLES)[1].id}`,
              },
              {
                authority: 'ekb-package',
                resource: flow.get(R.PACKAGES)[2],
                reference: flow.get(R.PACKAGES)[2].id,
              },
              {
                authority: 'ekb-title',
                resource: flow.get(R.TITLES)[2],
                reference: `${flow.get(R.PACKAGES)[2].id}-${flow.get(R.TITLES)[2].id}`,
              },
            ].forEach(createLine);
          }).then(() => currentFlow.set(R.LINES, lines));
        })

        // Nullify resourceName for Package #3 and Title #3 lines, then delete their resources
        .step((currentFlow) => {
          const packages = currentFlow.get(R.PACKAGES);
          const titles = currentFlow.get(R.TITLES);

          [flow.get(R.LINES)[3], flow.get(R.LINES)[4]].forEach((line) => {
            line.resourceName = null;

            cy.okapiRequest({
              method: 'PUT',
              path: `erm/entitlements/${line.id}`,
              body: line,
              isDefaultSearchParamsRequired: false,
            });
          });

          // Delete Package #1 → lines 1 and 2 have no matching eHoldings resource (404)
          EHoldingsPackages.deletePackageViaAPI(packageNames[0]);

          // Remove Title #2 from Package #2 holdings → line 3 resource is gone (404)
          cy.okapiRequest({
            method: 'DELETE',
            path: `eholdings/resources/${packages[1].id}-${titles[1].id}`,
            isDefaultSearchParamsRequired: false,
            failOnStatusCode: false,
          });

          // Delete Package #3 → lines 4 and 5 have no matching eHoldings resource (404)
          EHoldingsPackages.deletePackageViaAPI(packageNames[2]);
        })

        .step((currentFlow) => cy
          .createTempUser([
            Permissions.moduleeHoldingsEnabled.gui,
            Permissions.uiAgreementsSearchAndView.gui,
          ])
          .then((user) => currentFlow.set(R.USER, user, () => Users.deleteViaApi(user.userId))))

        .step((currentFlow) => cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
          path: TopMenu.agreementsPath,
          waiter: Agreements.waitLoading,
        }));
    });

    after('Delete C1347207 data', () => {
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C1347207 Resource name is displayed when an eHoldings resource is not found (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C1347207'] },
      () => {
        const expectedReferences = flow
          .get(R.LINES)
          .map(
            ({ authority, reference, resourceName }) => `${authority}: ${reference}` + (resourceName ? ` (${resourceName})` : ''),
          );

        cy.log('<--- STEP 1: Open the Agreement and verify five non-linked Agreement lines --->');
        SearchAndFilterAgreements.search(flow.get(R.AGREEMENT).name);
        Agreements.selectRecord(flow.get(R.AGREEMENT).name);
        AgreementViewDetails.openAgreementLineSection();
        AgreementViewDetails.verifyAgreementLinesCount('5');

        expectedReferences.forEach((reference) => {
          cy.contains('[role="row"]', reference).within(() => cy.get('a').should('not.exist'));
        });

        cy.log('<--- STEP 2: Open every line and verify the fallback value and 404 card --->');
        expectedReferences.forEach((displayValue) => {
          AgreementViewDetails.clickAgreementLineRecordByTitle(displayValue);
          AgreementLineInformation.verifyResourceName(displayValue);
          AgreementLineInformation.verifyNotFoundError();
          AgreementLineInformation.close();
        });
      },
    );
  });
});
