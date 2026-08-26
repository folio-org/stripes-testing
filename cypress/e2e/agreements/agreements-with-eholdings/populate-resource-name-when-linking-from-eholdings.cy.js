import AgreementLineInformation from '../../../support/fragments/agreements/agreementLineInformation';
import Agreements from '../../../support/fragments/agreements/agreements';
import AgreementLines from '../../../support/fragments/agreements/agreementLines';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import NewAgreement from '../../../support/fragments/agreements/newAgreement';
import SearchAndFilterAgreementLines from '../../../support/fragments/agreements/searchAndFilterAgreementLines';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../support/utils';
import getRandomPostfix from '../../../support/utils/stringTools';
import AgreementsDisplaySettings from '../../../support/fragments/settings/agreements/displaySettings';

const R = {
  AGREEMENT_1: 'agreement1',
  AGREEMENT_2: 'agreement2',
  AGREEMENT_1_LINES: 'agreement1Lines',
  NOT_CUSTOM_PACKAGE: 'notCustomPkg',
  NOT_CUSTOM_TITLE: 'notCustomTitle',
  E_HOLDING_PACKAGE: 'eHoldingPackage',
  E_HOLDING_TITLE: 'eHoldingTitle',
  CREATED_AGREEMENTS: 'createdAgreements',
  LOCAL_KB_PACKAGES: 'localKBPackages',
  TAG: 'isolatingTag,',
  USER: 'user',
};

describe('Agreements', () => {
  describe('Agreements with eHoldings', () => {
    const flow = new ExecutionFlowManager();
    const postfix = getRandomPostfix();

    const agreement1Name = `AT_C1347109_Agreement_1_${postfix}`;
    const agreement2Name = `AT_C1347109_Agreement_2_${postfix}`;
    const packageName = `AT_C1347109_Package_${postfix}`;
    const titleName = `AT_C1347109_Title_${postfix}`;
    const inAppCreatedAgreementPrefix = 'AT_C1347109_From';
    const isolatingTagName = `AT_C1347109_ISOLATING_TAG_${postfix}`.toLocaleLowerCase();

    const addIsolationTagToAgreementLine = (agreementLineId) => {
      cy.okapiRequest({
        path: `erm/entitlements/${agreementLineId}`,
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
        const tags = body.tags || [];

        cy.okapiRequest({
          method: 'PUT',
          path: `erm/entitlements/${agreementLineId}`,
          body: {
            ...body,
            tags: tags.some(({ value }) => value === isolatingTagName)
              ? tags
              : [...tags, { value: isolatingTagName }],
          },
          isDefaultSearchParamsRequired: false,
        });
      });
    };

    before('Create C1347109 preconditions', () => {
      cy.getAdminToken();
      cy.clearAllLocalStorage();

      flow
        .step(() => {
          AgreementsDisplaySettings.setAgreementsHideResourceSettingsViaApi(false);
        })
        .step((currentFlow) => {
          return cy.createTagApi({ label: isolatingTagName }).then((id) => {
            return currentFlow.set(R.TAG, { id, label: isolatingTagName }, () => cy.deleteTagApi(id, true));
          });
        })
        .step((currentFlow) => {
          return Agreements.getLocalKBPackages(
            new URLSearchParams([
              ['match', 'name'],
              ['match', 'description'],
              ['match', 'identifiers.identifier.value'],
              ['match', 'alternateResourceNames.name'],
              ['term', 'test'],
              ['page', 1],
              ['perPage', 2],
            ]),
          ).then((res) => {
            currentFlow.set(R.LOCAL_KB_PACKAGES, res);
          });
        })
        .step((currentFlow) => {
          return Agreements.createViaApi({
            ...Agreements.defaultAgreement,
            name: agreement1Name,
            tags: [{ value: isolatingTagName }],
          }).then((agreement) => currentFlow.set(R.AGREEMENT_1, agreement, () => Agreements.deleteViaApi(agreement.id)));
        })
        .step((currentFlow) => {
          return Agreements.createViaApi({
            ...Agreements.defaultAgreement,
            name: agreement2Name,
            tags: [{ value: isolatingTagName }],
          }).then((agreement) => currentFlow.set(R.AGREEMENT_2, agreement, () => Agreements.deleteViaApi(agreement.id)));
        })
        .step((currentFlow) => {
          const lines = [];

          return cy
            .wrap([null, null, ...currentFlow.get(R.LOCAL_KB_PACKAGES)])
            .each((res, index) => {
              return AgreementLines.createViaApi({
                description: `AT_C1347109_Agreement_1_Line_${index + 1}_${postfix}`,
                owner: flow.get(R.AGREEMENT_1).id,
                tags: [{ value: isolatingTagName }],
                resource: res
                  ? {
                    id: res.id,
                    name: res.name,
                    class: res.class,
                    _object: res,
                  }
                  : null,
                ...(res ? {} : { type: 'detached' }),
              }).then((line) => {
                lines.push(line);
                addIsolationTagToAgreementLine(line.id);
              });
            })
            .then(() => {
              currentFlow.set(R.AGREEMENT_1_LINES, lines, () => {
                lines.forEach((line) => {
                  AgreementLines.deleteViaApi({
                    agreementLineId: line.id,
                    agreementId: flow.get(R.AGREEMENT_1).id,
                  });
                });
              });
            });
        })
        .step((currentFlow) => {
          return EHoldingsPackages.getNotCustomSelectedPackageIdViaApi().then(({ id }) => {
            return EHoldingsPackages.getPackageByIdViaApi(id, {
              searchParams: { include: 'resources' },
            }).then(({ body }) => currentFlow.set(R.NOT_CUSTOM_PACKAGE, body));
          });
        })
        .step((currentFlow) => {
          return EHoldingsTitles.getSelectedNotCustomTitleViaApi('test').then(({ id }) => {
            return EHoldingsTitles.getTitleByIdViaApi(id, {
              searchParams: { include: 'resources' },
            }).then(({ body }) => currentFlow.set(R.NOT_CUSTOM_TITLE, body));
          });
        })
        .step((currentFlow) => {
          return EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: { name: packageName, contentType: 'E-Book' },
            },
          })
            .then(({ data }) => EHoldingsPackages.getPackageByIdViaApi(data.id, {
              searchParams: { include: 'resources' },
            }))
            .then(({ body }) => currentFlow.set(R.E_HOLDING_PACKAGE, body, () => EHoldingsPackages.deletePackageViaAPI(packageName)));
        })
        .step((currentFlow) => {
          return EHoldingsTitles.createEHoldingTitleVIaApi({
            packageId: currentFlow.get(R.E_HOLDING_PACKAGE).data.id,
            titleName,
          })
            .then((title) => EHoldingsTitles.getTitleByIdViaApi(title.id, {
              searchParams: { include: 'resources' },
            }))
            .then(({ body }) => currentFlow.set(R.E_HOLDING_TITLE, body, () => EHoldingsTitles.deleteTitleByIdViaApi(body.data.id)));
        })
        .step((currentFlow) => {
          return cy
            .createTempUser([
              Permissions.uiAgreementsAgreementsEdit.gui,
              Permissions.uieHoldingsAppView.gui,
            ])
            .then((user) => currentFlow.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
        })
        .step((currentFlow) => {
          return cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsSearch.waitLoading,
          });
        });
    });

    after('Delete C1347109 data', () => {
      cy.getAdminToken();
      (flow.get(R.CREATED_AGREEMENTS) || []).forEach(({ id: agreementId }) => {
        AgreementLines.getViaApi({ filters: `owner==${agreementId}` })
          .then((data) => {
            data.forEach(({ id: agreementLineId }) => {
              AgreementLines.deleteViaApi({ agreementId, agreementLineId });
            });
          })
          .then(() => Agreements.deleteViaApi(agreementId));
      });
      flow.cleanup();
    });

    const verifyResourceNameInAgreementPayload = (alias, resourceName) => {
      cy.wait(alias).then(({ request }) => {
        const item = request.body.items.find(({ resourceName: name }) => name === resourceName);
        expect(item, `${resourceName} is included in the Agreement payload`).to.not.equal(
          undefined,
        );
      });
    };

    const sortFields = ['resource.name', 'resourceName', 'reference', 'id'];

    const getAgreementLineSortData = (agreementLine) => {
      const values = [
        agreementLine.resource?.name,
        agreementLine.resourceName,
        agreementLine.reference,
        agreementLine.id,
      ];
      const group = values.findIndex(Boolean);

      return { group, value: values[group] };
    };

    const getAgreementLineDisplayValue = (agreementLine) => {
      const { group, value } = getAgreementLineSortData(agreementLine);

      return group === 3 ? agreementLine.description || value : value;
    };

    const verifyAgreementLinesSort = (alias, direction) => {
      cy.wait(alias).then(({ request, response }) => {
        const requestUrl = new URL(request.url);
        const actualSort = requestUrl.searchParams
          .getAll('sort')
          .flatMap((value) => value.split(','))
          .map((value) => {
            const [field, sortDirection] = value.split(';');

            return `${field};${sortDirection.toUpperCase()}`;
          });
        const sortDirection = direction === 'ascending' ? 'ASC' : 'DESC';
        const expectedSort = sortFields.map((field) => `${field};${sortDirection}`);

        expect(actualSort, `${direction} sort parameters`).to.deep.equal(expectedSort);

        const agreementLines = response.body.results;

        AgreementLines.verifyResultsHeaderSort(direction);
        AgreementLines.verifyAgreementLinesOrder(agreementLines.map(getAgreementLineDisplayValue));
      });
    };

    it(
      'C1347109 Populate resourceName when adding an eHoldings resource to an Agreement (thunderjet)',
      { tags: ['extendedPath', 'thunderjet', 'C1347109', 'nonParallel'] },
      () => {
        const { notCustomPkg, notCustomTitle, eHoldingPackage, eHoldingTitle } = flow.ctx();

        const configs = [
          {
            type: 'Custom',
            package: packageName,
            title: titleName,
          },
          {
            type: 'Non-custom',
            package: notCustomPkg.data.attributes.name,
            title: notCustomTitle.data.attributes.name,
          },
        ];

        const agreementLinesNames = [
          notCustomPkg.data.attributes.name,
          notCustomTitle.data.attributes.name,
          packageName,
          titleName,
        ];

        configs.forEach((config, index) => {
          const iteration = index + 1;

          cy.log(`<--- STEP 1 (${iteration}): Open the custom eHoldings package --->`);
          EHoldingsSearch.switchToPackages();
          EHoldingsPackagesSearch.byName(config.package);
          EHoldingsPackages.openPackageWithExpectedName(config.package);
          EHoldingsPackageView.waitLoading();

          cy.log(
            `<--- STEP 2 (${iteration}): Add the package to an existing Agreement via modal --->`,
          );
          cy.intercept('PUT', '**/erm/sas/**').as(`addPackageToAgreement${iteration}`);

          EHoldingsPackageView.addExistingAgreement();
          EHoldingsPackageView.searchForExistingAgreement(agreement2Name);
          EHoldingsPackageView.clickOnFoundAgreementInModal(agreement2Name);
          verifyResourceNameInAgreementPayload(
            `@addPackageToAgreement${iteration}`,
            config.package,
          );
          EHoldingsPackageView.assertAgreementLinesList([{ name: agreement2Name }]);

          cy.get(`@addPackageToAgreement${iteration}`).then((interception) => {
            const items = interception.response?.body?.items || [];
            cy.wrap(items[0]?.id).as(`packageEntitlementId${iteration}`);
          });

          cy.log(`<--- STEP 3 (${iteration}): Create a new Agreement from the package page --->`);
          cy.intercept('POST', '**/erm/sas').as(`createAgreementFromPackage${iteration}`);

          const step3AgreementName = `${inAppCreatedAgreementPrefix}_Package_(${iteration})_${postfix}`;
          EHoldingsPackageView.createNewAgreement();
          NewAgreement.waitLoading();
          NewAgreement.fill({ ...NewAgreement.defaultAgreement, name: step3AgreementName });
          NewAgreement.save();
          cy.wait(`@createAgreementFromPackage${iteration}`).then(({ request, response }) => {
            const requestItemIndex = request.body.items.findIndex(({ resourceName }) => {
              return resourceName === config.package;
            });
            const requestItem = request.body.items[requestItemIndex];
            const responseItem = response.body.items[requestItemIndex];

            expect(
              requestItem,
              `${config.package} is included in the creation payload`,
            ).to.not.equal(undefined);
            expect(responseItem?.id, 'created package entitlement ID').to.not.equal(undefined);
            const existing = flow.get(R.CREATED_AGREEMENTS) || [];
            flow.set(R.CREATED_AGREEMENTS, [...existing, response.body]);
            addIsolationTagToAgreementLine(responseItem.id);
          });
          AgreementViewDetails.waitLoading();
          AgreementViewDetails.verifyAgreementLinesCount(1);

          cy.log(
            `<--- STEP 4 (${iteration}): Open the custom eHoldings title and its package resource --->`,
          );
          cy.visit(TopMenu.eholdingsPath);
          EHoldingsSearch.waitLoading();
          EHoldingsSearch.switchToTitles();
          EHoldingsTitlesSearch.byTitle(config.title);
          EHoldingsTitlesSearch.openTitle(config.title);
          EHoldingsTitle.waitLoading(config.title);
          EHoldingsTitle.openResource();

          cy.log(
            `<--- STEP 5 (${iteration}): Add the title resource to the existing Agreement --->`,
          );
          cy.intercept('PUT', '**/erm/sas/**').as(`addTitleToAgreement${iteration}`);
          const SelectAgreementModal = EHoldingsResourceView.openSelectAgreementModal();
          SelectAgreementModal.searchByName(agreement2Name);
          SelectAgreementModal.checkTableContent({ records: [{ name: agreement2Name }] });
          SelectAgreementModal.selectAgreement();

          verifyResourceNameInAgreementPayload(`@addTitleToAgreement${iteration}`, config.title);
          cy.get(`@addTitleToAgreement${iteration}`).then((interception) => {
            const items = interception.response?.body?.items || [];
            cy.get(`@packageEntitlementId${iteration}`).then((pkgId) => {
              const titleItem = items.find(({ id }) => id !== pkgId);
              cy.wrap(titleItem?.id).as(`titleEntitlementId${iteration}`);
            });
          });

          EHoldingsResourceView.assertAgreementLinesList([{ name: agreement2Name }]);

          cy.log(
            `<--- STEP 6 (${iteration}): Create a new Agreement from the title resource page --->`,
          );
          cy.intercept('POST', '**/erm/sas').as(`createAgreementFromTitle${iteration}`);

          const step6AgreementName = `${inAppCreatedAgreementPrefix}_Title_(${iteration})_${postfix}`;
          EHoldingsResourceView.createNewAgreement();
          NewAgreement.waitLoading();
          NewAgreement.fill({ ...NewAgreement.defaultAgreement, name: step6AgreementName });
          NewAgreement.save();
          cy.wait(`@createAgreementFromTitle${iteration}`).then(({ request, response }) => {
            const requestItemIndex = request.body.items.findIndex(({ resourceName }) => {
              return resourceName === config.title;
            });
            const requestItem = request.body.items[requestItemIndex];
            const responseItem = response.body.items[requestItemIndex];

            expect(requestItem, `${config.title} is included in the creation payload`).to.not.equal(
              undefined,
            );
            expect(responseItem?.id, 'created title entitlement ID').to.not.equal(undefined);
            const existing = flow.get(R.CREATED_AGREEMENTS) || [];
            flow.set(R.CREATED_AGREEMENTS, [...existing, response.body]);
            addIsolationTagToAgreementLine(responseItem.id);
          });
          AgreementViewDetails.waitLoading();
          AgreementViewDetails.verifyAgreementLinesCount(1);

          if (index !== configs.length - 1) {
            cy.visit(TopMenu.eholdingsPath);
            EHoldingsSearch.waitLoading();
          }
        });

        cy.log(
          '<--- STEPS 8: Navigate to Agreement and verify agreement lines exist by resource name --->',
        );
        AgreementViewDetails.openAgreementLineFilter();
        AgreementLines.waitLoading();
        AgreementLines.getViaApi({ filters: `owner==${flow.get(R.AGREEMENT_2).id}` }).then(
          (agreementLines) => {
            const resourceNames = agreementLines.map(({ resourceName }) => resourceName);

            expect(resourceNames).to.include.members(agreementLinesNames);
          },
        );

        cy.log('<--- STEP 9 --->');
        cy.then(() => {
          const createdAgreementLineNames = configs.flatMap(({ package: pkg, title }) => [
            pkg,
            title,
          ]);

          flow.get(R.CREATED_AGREEMENTS).forEach(({ id: agreementId }, index) => {
            AgreementLines.getViaApi({ filters: `owner==${agreementId}` }).then(
              (agreementLines) => {
                expect(agreementLines[0].resourceName).to.eq(createdAgreementLineNames[index]);
              },
            );
          });
        });

        cy.log('<--- STEP 10-11: Reset all filters and search one by one --->');
        SearchAndFilterAgreementLines.clearAllFilters();
        SearchAndFilterAgreementLines.filterByTags([isolatingTagName]);

        [
          ...agreementLinesNames.map((v) => [v, v]),
          /* References */
          [notCustomPkg.data.id, notCustomPkg.data.attributes.name],
          [
            notCustomTitle.included[0].id.split('-').slice(0, 2).join('-'),
            notCustomTitle.data.attributes.name,
          ],
          [eHoldingPackage.data.id, eHoldingPackage.data.attributes.name],
          [
            eHoldingTitle.included[0].id.split('-').slice(0, 2).join('-'),
            eHoldingTitle.data.attributes.name,
          ],
        ].forEach(([search, expected]) => {
          SearchAndFilterAgreementLines.search(search);
          AgreementLines.checkAgreementLineFound(expected);
          AgreementLines.selectRecord(expected);
          AgreementLineInformation.assertResourceName(expected);
        });
        SearchAndFilterAgreementLines.clearAllFilters();
        SearchAndFilterAgreementLines.filterByTags([isolatingTagName]);
        cy.wait(4000);

        cy.log('<--- STEP 12: Set resourceName to null for both Agreement lines --->');
        cy.get('@packageEntitlementId1').then((id) => {
          cy.okapiRequest({
            path: `erm/entitlements/${id}`,
            isDefaultSearchParamsRequired: false,
          }).then(({ body }) => {
            cy.okapiRequest({
              method: 'PUT',
              path: `erm/entitlements/${id}`,
              body: {
                ...body,
                resourceName: null,
                tags: [...(body.tags || []), { value: isolatingTagName }],
              },
              isDefaultSearchParamsRequired: false,
            });
          });
        });

        cy.get('@titleEntitlementId1').then((id) => {
          cy.okapiRequest({
            path: `erm/entitlements/${id}`,
            isDefaultSearchParamsRequired: false,
          }).then(({ body }) => {
            cy.okapiRequest({
              method: 'PUT',
              path: `erm/entitlements/${id}`,
              body: {
                ...body,
                resourceName: null,
                tags: [...(body.tags || []), { value: isolatingTagName }],
              },
              isDefaultSearchParamsRequired: false,
            });
          });
        });

        cy.log('<--- STEP 13: Verify Name/Reference sort column via GET request URL --->');
        cy.intercept('GET', '**/erm/entitlements*').as('getEntitlements');

        SearchAndFilterAgreementLines.search('%');

        verifyAgreementLinesSort('@getEntitlements', 'ascending');

        cy.log('<--- STEP 14: Click Name/Reference header — sort descending --->');
        AgreementLines.clickResultsHeaderId();

        verifyAgreementLinesSort('@getEntitlements', 'descending');

        cy.log('<--- STEP 15: Click Name/Reference header again — sort ascending --->');
        AgreementLines.clickResultsHeaderId();

        verifyAgreementLinesSort('@getEntitlements', 'ascending');
      },
    );
  });
});
