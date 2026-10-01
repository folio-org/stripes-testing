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
import { ERMTools, ExecutionFlowManager } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';
import { AgreementsDisplaySettings } from '../../../support/fragments/settings/agreements';
import { formatIntlDateTime } from '../../../support/utils/acquisitions';

const R = {
  AGREEMENT: 'agreement',
  CUSTOM_PACKAGE: 'customPackage',
  CUSTOM_TITLE: 'customTitle',
  LOCALE: 'locale',
  NON_CUSTOM_PACKAGE: 'package',
  NON_CUSTOM_TITLE: 'title',
  USER: 'user',
};

describe('Agreements', () => {
  describe('Agreements with eHoldings', () => {
    const flow = new ExecutionFlowManager();
    const postfix = getRandomPostfix();

    before('Create C1347108 preconditions', () => {
      cy.getAdminToken();
      cy.clearLocalStorage();
      cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

      flow
        .step(() => {
          AgreementsDisplaySettings.setAgreementsHideResourceSettingsViaApi(false);
        })
        .step((currentFlow) => {
          return Agreements.createViaApi({
            ...Agreements.defaultAgreement,
            name: `AT_C1347108_Agreement_${postfix}`,
          }).then((agreement) => currentFlow.set(R.AGREEMENT, agreement, () => {
            Agreements.deleteViaApi(agreement.id);
          }));
        })
        .step((currentFlow) => {
          EHoldingsPackages.getNotCustomSelectedPackageIdViaApi()
            .then((pkg) => EHoldingsPackages.getPackageDataViaApi(pkg.id, {
              searchParams: { include: 'resources' },
            }))
            .then(({ body }) => currentFlow.set(R.NON_CUSTOM_PACKAGE, {
              ...body.data,
              _included: body.included,
            }));

          EHoldingsTitles.getSelectedNotCustomTitleViaApi('test')
            .then((t) => EHoldingsTitles.getTitleByIdViaApi(t.id, { searchParams: { include: 'resources' } }))
            .then(({ body }) => currentFlow.set(R.NON_CUSTOM_TITLE, {
              ...body.data,
              _included: body.included,
            }));
        })
        .step((currentFlow) => {
          const d = {
            type: 'packages',
            attributes: { name: `AT_C1347108_Package_${postfix}`, contentType: 'E-Book' },
          };

          return EHoldingsPackages.createPackageViaAPI({ data: d })
            .then(({ data }) => EHoldingsPackages.getPackageDataViaApi(data.id, {
              searchParams: { include: 'resources' },
            }))
            .then(({ body }) => currentFlow.set(
              R.CUSTOM_PACKAGE,
              {
                ...body.data,
                _included: body.included,
              },
              () => EHoldingsPackages.deletePackageViaAPI(d.attributes.name),
            ));
        })
        .step((currentFlow) => {
          const d = {
            packageId: currentFlow.get(R.CUSTOM_PACKAGE).id,
            titleName: `AT_C1347108_Title_${postfix}`,
          };

          return EHoldingsTitles.createEHoldingTitleVIaApi(d)
            .then((t) => EHoldingsTitles.getTitleByIdViaApi(t.id, { searchParams: { include: 'resources' } }))
            .then(({ body }) => currentFlow.set(
              R.CUSTOM_TITLE,
              {
                ...body.data,
                _included: body.included,
              },
              () => EHoldingsTitles.deleteTitleByIdViaApi(body.data.id),
            ));
        })
        .step((currentFlow) => cy
          .createTempUser([
            Permissions.uiAgreementsAgreementsEdit.gui,
            Permissions.uieHoldingsAppView.gui,
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

    const addAgreementLine = ({
      resource,
      resourceName,
      title = false,
      description,
      note,
    } = {}) => {
      AgreementViewDetails.openAgreementLineSection();
      AgreementViewDetails.clickActionsForAgreementLines();
      AgreementViewDetails.clickNewAgreementLine();
      NewAgreementLine.waitLoading();
      NewAgreementLine.clickEHoldingsTab();
      NewAgreementLine.clickLinkEResource();

      if (title) SelectEHoldingsModal.clickTitlesToggle();

      SelectEHoldingsModal.searchForTitleOrPackage(resourceName);
      SelectEHoldingsModal.selectRecord(resourceName);

      const eHoldingDetails = title
        ? {
          publicationType: resource.attributes.publicationType,
          holdingStatus: resource._included[0].attributes.isSelected
            ? 'Selected'
            : 'Not selected',
          accessStatusType: '-',
        }
        : {
          packageContentType: resource.attributes.contentType,
          holdingStatus: resource.attributes.isSelected ? 'Selected' : 'Not selected',
          accessStatusType: '-',
          provider: ERMTools.getEResourceProvider(resource.attributes) || '',
          count: ERMTools.getEResourceCount(resource.attributes),
        };

      NewAgreementLine.assertLinkedEResource(eHoldingDetails);

      if (description) NewAgreementLine.fillDescription(description);
      if (note) NewAgreementLine.fillNote(note);

      cy.intercept('POST', '**/erm/entitlements').as('createEntitlement');
      NewAgreementLine.saveAndClose();
      cy.wait('@createEntitlement').then((interception) => {
        flow.set(resourceName, interception.response.body);
        expect(interception.request.body.resourceName).to.eq(resourceName);
        expect(interception.response.body.resourceName).to.eq(resourceName);
      });
      AgreementLineInformation.verifyResourceName(resourceName);
      AgreementLineInformation.close();

      return cy.get('@createEntitlement');
    };

    const getAgreementLineCoverage = ({ coverage = [] }) => {
      const locale = flow.get(R.LOCALE);

      return coverage
        .map(({ endDate, startDate }) => {
          return [
            startDate ? formatIntlDateTime(locale, startDate) : '*',
            startDate ? formatIntlDateTime(locale, endDate) : '*',
          ]
            .filter(Boolean)
            .join('');
        })
        .join('');
    };

    it(
      'C1347108 Add an agreement line with an eHoldings resource and populate resourceName (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C1347108', 'nonParallel'] },
      () => {
        const { agreement, customPackage, customTitle, package: pkg, title } = flow.ctx();

        const nonCustomPackageName = pkg.attributes.name;
        const nonCustomTitleName = title.attributes.name;
        const customPackageName = customPackage.attributes.name;
        const customTitleName = customTitle.attributes.name;

        SearchAndFilterAgreements.search(agreement.name);
        Agreements.selectRecord(agreement.name);
        AgreementViewDetails.waitLoading();

        const cases = [
          {
            resource: pkg,
            resourceName: nonCustomPackageName,
            title: false,
          },
          {
            resource: title,
            resourceName: nonCustomTitleName,
            title: true,
          },
          {
            resource: customPackage,
            resourceName: customPackageName,
            description: `AT_C1347108_Description_${postfix}`,
            note: `AT_C1347108_Note_${postfix}`,
            title: false,
          },
          {
            resource: customTitle,
            resourceName: customTitleName,
            title: true,
          },
        ];

        cy.log('<--- STEP 1-9 --->');
        cases.forEach((config, index) => {
          addAgreementLine(config).then(() => {
            const entitlement = flow.get(config.resourceName);

            const line = {
              name: entitlement.resourceName,
              provider: ERMTools.getEResourceProvider(entitlement),
              publicationType: ERMTools.getEResourceType(entitlement),
              count: ERMTools.getEResourceCount(entitlement),
              coverage: getAgreementLineCoverage(entitlement),
            };

            AgreementViewDetails.verifyAgreementLinesCount(index + 1);
            AgreementViewDetails.openAgreementLineSection();
            AgreementViewDetails.assertAgreementLinesList([line]);
          });
        });

        cy.log('<--- STEP 10: Filter Agreement lines by the Agreement --->');
        AgreementViewDetails.openAgreementLineFilter();
        SearchAndFilterAgreementLines.filterByAgreement(agreement.name);
        [customPackageName, customTitleName, nonCustomPackageName, nonCustomTitleName].forEach(
          (resourceName) => {
            AgreementLines.checkAgreementLineFound(resourceName);
          },
        );

        cy.then(() => {
          cy.log('<--- STEP 11: Verify resourceName in every entitlement response --->');
          [customPackageName, customTitleName, nonCustomPackageName, nonCustomTitleName].forEach(
            (resourceName) => {
              const entitlement = flow.get(resourceName);

              cy.intercept(`erm/entitlements/${entitlement.id}`).as('entitlement');
              AgreementLines.selectRecord(resourceName);
              AgreementLineInformation.waitLoadingWithExistingLine(agreement.name);
              cy.wait('@entitlement').then((interception) => {
                expect(interception.response.body.resourceName).to.eq(resourceName);
              });
            },
          );
        });

        cy.log('<--- STEPS 12-14: Search by resource name, description and note --->');
        SearchAndFilterAgreementLines.clearAllFilters();
        [
          { query: cases[0].resourceName, expectedName: nonCustomPackageName },
          { query: cases[1].resourceName, expectedName: nonCustomTitleName },
          { query: cases[2].resourceName, expectedName: customPackageName },
          { query: cases[3].resourceName, expectedName: customTitleName },
          { query: cases[2].description, expectedName: customPackageName },
          { query: cases[2].note, expectedName: customPackageName },
        ].forEach(({ query, expectedName }) => {
          SearchAndFilterAgreementLines.search(query);
          AgreementLines.checkAgreementLineFound(expectedName);
        });
      },
    );
  });
});
