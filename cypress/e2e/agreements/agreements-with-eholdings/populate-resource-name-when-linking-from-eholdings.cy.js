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

const trace = (message) => {
  trace('cy.task');
  return cy.task('log', `[C1347109] ${message}`);
};

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

// The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
// #freeze pipeline deadlock
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
      trace('cy.okapiRequest');
      cy.okapiRequest({
        path: `erm/entitlements/${agreementLineId}`,
        isDefaultSearchParamsRequired: false,
      }).then(({ body }) => {
        const tags = body.tags || [];

        trace('cy.okapiRequest');
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
      trace('SETUP: start');

      trace('cy.getAdminToken');
      cy.getAdminToken();
      trace('cy.clearAllLocalStorage');
      cy.clearAllLocalStorage();

      flow
        .step(() => {
          trace('SETUP: step 1');

          trace('AgreementsDisplaySettings.setAgreementsHideResourceSettingsViaApi');
          AgreementsDisplaySettings.setAgreementsHideResourceSettingsViaApi(false);
        })
        .step((currentFlow) => {
          trace('SETUP: step 2');

          trace('cy.createTagApi');
          return cy.createTagApi({ label: isolatingTagName }).then((id) => {
            return currentFlow.set(R.TAG, { id, label: isolatingTagName }, () => {
              trace('cy.deleteTagApi');
              return cy.deleteTagApi(id, true);
            });
          });
        })
        .step((currentFlow) => {
          trace('SETUP: step 3');

          trace('Agreements.getLocalKBPackages');
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
          trace('SETUP: step 4');

          trace('Agreements.createViaApi');
          return Agreements.createViaApi({
            ...Agreements.defaultAgreement,
            name: agreement1Name,
            tags: [{ value: isolatingTagName }],
          }).then((agreement) => currentFlow.set(R.AGREEMENT_1, agreement, () => {
            trace('Agreements.deleteViaApi');
            return Agreements.deleteViaApi(agreement.id);
          }));
        })
        .step((currentFlow) => {
          trace('SETUP: step 5');

          trace('Agreements.createViaApi');
          return Agreements.createViaApi({
            ...Agreements.defaultAgreement,
            name: agreement2Name,
            tags: [{ value: isolatingTagName }],
          }).then((agreement) => currentFlow.set(R.AGREEMENT_2, agreement, () => {
            trace('Agreements.deleteViaApi');
            return Agreements.deleteViaApi(agreement.id);
          }));
        })
        .step((currentFlow) => {
          trace('SETUP: step 6');

          const lines = [];

          return cy
            .wrap([null, null, ...currentFlow.get(R.LOCAL_KB_PACKAGES)])
            .each((res, index) => {
              trace('AgreementLines.createViaApi');
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
                trace('addIsolationTagToAgreementLine');
                addIsolationTagToAgreementLine(line.id);
              });
            })
            .then(() => {
              currentFlow.set(R.AGREEMENT_1_LINES, lines, () => {
                lines.forEach((line) => {
                  trace('AgreementLines.deleteViaApi');
                  AgreementLines.deleteViaApi({
                    agreementLineId: line.id,
                    agreementId: flow.get(R.AGREEMENT_1).id,
                  });
                });
              });
            });
        })
        .step((currentFlow) => {
          trace('SETUP: step 7');

          trace('EHoldingsPackages.getNotCustomSelectedPackageIdViaApi');
          return EHoldingsPackages.getNotCustomSelectedPackageIdViaApi().then(({ id }) => {
            trace('EHoldingsPackages.getPackageByIdViaApi');
            return EHoldingsPackages.getPackageByIdViaApi(id, {
              searchParams: { include: 'resources' },
            }).then(({ body }) => currentFlow.set(R.NOT_CUSTOM_PACKAGE, body));
          });
        })
        .step((currentFlow) => {
          trace('SETUP: step 8');

          trace('EHoldingsTitles.getSelectedNotCustomTitleViaApi');
          return EHoldingsTitles.getSelectedNotCustomTitleViaApi('test').then(({ id }) => {
            trace('EHoldingsTitles.getTitleByIdViaApi');
            return EHoldingsTitles.getTitleByIdViaApi(id, {
              searchParams: { include: 'resources' },
            }).then(({ body }) => currentFlow.set(R.NOT_CUSTOM_TITLE, body));
          });
        })
        .step((currentFlow) => {
          trace('SETUP: step 9');

          trace('EHoldingsPackages.createPackageViaAPI');
          return EHoldingsPackages.createPackageViaAPI({
            data: {
              type: 'packages',
              attributes: { name: packageName, contentType: 'E-Book' },
            },
          })
            .then(({ data }) => {
              trace('EHoldingsPackages.getPackageByIdViaApi');
              return EHoldingsPackages.getPackageByIdViaApi(data.id, {
                searchParams: { include: 'resources' },
              });
            })
            .then(({ body }) => currentFlow.set(R.E_HOLDING_PACKAGE, body, () => {
              trace('EHoldingsPackages.deletePackageViaAPI');
              return EHoldingsPackages.deletePackageViaAPI(packageName);
            }));
        })
        .step((currentFlow) => {
          trace('SETUP: step 10');

          trace('EHoldingsTitles.createEHoldingTitleVIaApi');
          return EHoldingsTitles.createEHoldingTitleVIaApi({
            packageId: currentFlow.get(R.E_HOLDING_PACKAGE).data.id,
            titleName,
          })
            .then((title) => {
              trace('EHoldingsTitles.getTitleByIdViaApi');
              return EHoldingsTitles.getTitleByIdViaApi(title.id, {
                searchParams: { include: 'resources' },
              });
            })
            .then(({ body }) => currentFlow.set(R.E_HOLDING_TITLE, body, () => {
              trace('EHoldingsTitles.deleteTitleByIdViaApi');
              return EHoldingsTitles.deleteTitleByIdViaApi(body.data.id);
            }));
        })
        .step((currentFlow) => {
          trace('SETUP: step 11');

          trace('cy.createTempUser');
          return cy
            .createTempUser([
              Permissions.uiAgreementsAgreementsEdit.gui,
              Permissions.uieHoldingsAppView.gui,
            ])
            .then((user) => currentFlow.set(R.USER, user, () => {
              trace('Users.deleteViaApi');
              return Users.deleteViaApi(user.userId);
            }));
        })
        .step((currentFlow) => {
          trace('SETUP: step 12');

          trace('cy.login');
          return cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsSearch.waitLoading,
          });
        });

      trace('SETUP: complete');
    });

    after('Delete C1347109 data', () => {
      trace('CLEANUP: start');

      trace('cy.getAdminToken');
      cy.getAdminToken();
      (flow.get(R.CREATED_AGREEMENTS) || []).forEach(({ id: agreementId }) => {
        trace('AgreementLines.getViaApi');
        AgreementLines.getViaApi({ filters: `owner==${agreementId}` })
          .then((data) => {
            data.forEach(({ id: agreementLineId }) => {
              trace('AgreementLines.deleteViaApi');
              AgreementLines.deleteViaApi({ agreementId, agreementLineId });
            });
          })
          .then(() => {
            trace('Agreements.deleteViaApi');
            return Agreements.deleteViaApi(agreementId);
          });
      });
      trace('flow.cleanup');
      flow.cleanup();

      trace('CLEANUP: complete');
    });

    const verifyResourceNameInAgreementPayload = (alias, resourceName) => {
      trace('cy.wait');
      cy.wait(alias).then(({ request }) => {
        const item = request.body.items.find(({ resourceName: name }) => name === resourceName);
        trace('expect: verify assertion');
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
      trace('cy.wait');
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

        trace('expect: verify assertion');
        expect(actualSort, `${direction} sort parameters`).to.deep.equal(expectedSort);

        const agreementLines = response.body.results;

        trace('AgreementLines.verifyResultsHeaderSort');
        AgreementLines.verifyResultsHeaderSort(direction);
        trace('AgreementLines.verifyAgreementLinesOrder');
        AgreementLines.verifyAgreementLinesOrder(agreementLines.map(getAgreementLineDisplayValue));
      });
    };

    // The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
    // #freeze pipeline deadlock
    it(
      'C1347109 Populate resourceName when adding an eHoldings resource to an Agreement (thunderjet)',
      { tags: ['extendedPathBroken', 'thunderjet', 'C1347109Broken', 'nonParallelBroken'] },
      () => {
        trace('TEST: start');

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

          trace(`<--- STEP 1 (${iteration}): Open the custom eHoldings package --->`);
          trace('EHoldingsSearch.switchToPackages');
          EHoldingsSearch.switchToPackages();
          trace('EHoldingsPackagesSearch.byName');
          EHoldingsPackagesSearch.byName(config.package);
          trace('EHoldingsPackages.openPackageWithExpectedName');
          EHoldingsPackages.openPackageWithExpectedName(config.package);
          trace('EHoldingsPackageView.waitLoading');
          EHoldingsPackageView.waitLoading();

          trace(
            `<--- STEP 2 (${iteration}): Add the package to an existing Agreement via modal --->`,
          );
          trace('cy.intercept: register request alias');
          cy.intercept('PUT', '**/erm/sas/**').as(`addPackageToAgreement${iteration}`);

          trace('EHoldingsPackageView.addExistingAgreement');
          EHoldingsPackageView.addExistingAgreement();
          trace('EHoldingsPackageView.searchForExistingAgreement');
          EHoldingsPackageView.searchForExistingAgreement(agreement2Name);
          trace('EHoldingsPackageView.clickOnFoundAgreementInModal');
          EHoldingsPackageView.clickOnFoundAgreementInModal(agreement2Name);
          trace('verifyResourceNameInAgreementPayload');
          verifyResourceNameInAgreementPayload(
            `@addPackageToAgreement${iteration}`,
            config.package,
          );
          trace('EHoldingsPackageView.assertAgreementLinesList');
          EHoldingsPackageView.assertAgreementLinesList([{ name: agreement2Name }]);

          trace('cy.get');
          cy.get(`@addPackageToAgreement${iteration}`).then((interception) => {
            const items = interception.response?.body?.items || [];
            trace('cy.wrap: store entitlement alias');
            cy.wrap(items[0]?.id).as(`packageEntitlementId${iteration}`);
          });

          trace(`<--- STEP 3 (${iteration}): Create a new Agreement from the package page --->`);
          trace('cy.intercept: register request alias');
          cy.intercept('POST', '**/erm/sas').as(`createAgreementFromPackage${iteration}`);

          const step3AgreementName = `${inAppCreatedAgreementPrefix}_Package_(${iteration})_${postfix}`;
          trace('EHoldingsPackageView.createNewAgreement');
          EHoldingsPackageView.createNewAgreement();
          trace('NewAgreement.waitLoading');
          NewAgreement.waitLoading();
          trace('NewAgreement.fill');
          NewAgreement.fill({ ...NewAgreement.defaultAgreement, name: step3AgreementName });
          trace('NewAgreement.save');
          NewAgreement.save();
          trace('cy.wait');
          cy.wait(`@createAgreementFromPackage${iteration}`).then(({ request, response }) => {
            const requestItemIndex = request.body.items.findIndex(({ resourceName }) => {
              return resourceName === config.package;
            });
            const requestItem = request.body.items[requestItemIndex];
            const responseItem = response.body.items[requestItemIndex];

            trace('expect: verify assertion');
            expect(
              requestItem,
              `${config.package} is included in the creation payload`,
            ).to.not.equal(undefined);
            trace('expect: verify assertion');
            expect(responseItem?.id, 'created package entitlement ID').to.not.equal(undefined);
            const existing = flow.get(R.CREATED_AGREEMENTS) || [];
            flow.set(R.CREATED_AGREEMENTS, [...existing, response.body]);
            trace('addIsolationTagToAgreementLine');
            addIsolationTagToAgreementLine(responseItem.id);
          });
          trace('AgreementViewDetails.waitLoading');
          AgreementViewDetails.waitLoading();
          trace('AgreementViewDetails.verifyAgreementLinesCount');
          AgreementViewDetails.verifyAgreementLinesCount(1);

          trace(
            `<--- STEP 4 (${iteration}): Open the custom eHoldings title and its package resource --->`,
          );
          trace('cy.visit');
          cy.visit(TopMenu.eholdingsPath);
          trace('EHoldingsSearch.waitLoading');
          EHoldingsSearch.waitLoading();
          trace('EHoldingsSearch.switchToTitles');
          EHoldingsSearch.switchToTitles();
          trace('EHoldingsTitlesSearch.byTitle');
          EHoldingsTitlesSearch.byTitle(config.title);
          trace('EHoldingsTitlesSearch.openTitle');
          EHoldingsTitlesSearch.openTitle(config.title);
          trace('EHoldingsTitle.waitLoading');
          EHoldingsTitle.waitLoading(config.title);
          trace('EHoldingsTitle.openResource');
          EHoldingsTitle.openResource();

          trace(
            `<--- STEP 5 (${iteration}): Add the title resource to the existing Agreement --->`,
          );
          trace('cy.intercept: register request alias');
          cy.intercept('PUT', '**/erm/sas/**').as(`addTitleToAgreement${iteration}`);
          trace('EHoldingsResourceView.openSelectAgreementModal');
          const SelectAgreementModal = EHoldingsResourceView.openSelectAgreementModal();
          trace('SelectAgreementModal.searchByName');
          SelectAgreementModal.searchByName(agreement2Name);
          trace('SelectAgreementModal.checkTableContent');
          SelectAgreementModal.checkTableContent({ records: [{ name: agreement2Name }] });
          trace('SelectAgreementModal.selectAgreement');
          SelectAgreementModal.selectAgreement();

          trace('verifyResourceNameInAgreementPayload');
          verifyResourceNameInAgreementPayload(`@addTitleToAgreement${iteration}`, config.title);
          trace('cy.get');
          cy.get(`@addTitleToAgreement${iteration}`).then((interception) => {
            const items = interception.response?.body?.items || [];
            trace('cy.get');
            cy.get(`@packageEntitlementId${iteration}`).then((pkgId) => {
              const titleItem = items.find(({ id }) => id !== pkgId);
              trace('cy.wrap: store entitlement alias');
              cy.wrap(titleItem?.id).as(`titleEntitlementId${iteration}`);
            });
          });

          trace('EHoldingsResourceView.assertAgreementLinesList');
          EHoldingsResourceView.assertAgreementLinesList([{ name: agreement2Name }]);

          trace(
            `<--- STEP 6 (${iteration}): Create a new Agreement from the title resource page --->`,
          );
          trace('cy.intercept: register request alias');
          cy.intercept('POST', '**/erm/sas').as(`createAgreementFromTitle${iteration}`);

          const step6AgreementName = `${inAppCreatedAgreementPrefix}_Title_(${iteration})_${postfix}`;
          trace('EHoldingsResourceView.createNewAgreement');
          EHoldingsResourceView.createNewAgreement();
          trace('NewAgreement.waitLoading');
          NewAgreement.waitLoading();
          trace('NewAgreement.fill');
          NewAgreement.fill({ ...NewAgreement.defaultAgreement, name: step6AgreementName });
          trace('NewAgreement.save');
          NewAgreement.save();
          trace('cy.wait');
          cy.wait(`@createAgreementFromTitle${iteration}`).then(({ request, response }) => {
            const requestItemIndex = request.body.items.findIndex(({ resourceName }) => {
              return resourceName === config.title;
            });
            const requestItem = request.body.items[requestItemIndex];
            const responseItem = response.body.items[requestItemIndex];

            trace('expect: verify assertion');
            expect(requestItem, `${config.title} is included in the creation payload`).to.not.equal(
              undefined,
            );
            trace('expect: verify assertion');
            expect(responseItem?.id, 'created title entitlement ID').to.not.equal(undefined);
            const existing = flow.get(R.CREATED_AGREEMENTS) || [];
            flow.set(R.CREATED_AGREEMENTS, [...existing, response.body]);
            trace('addIsolationTagToAgreementLine');
            addIsolationTagToAgreementLine(responseItem.id);
          });
          trace('AgreementViewDetails.waitLoading');
          AgreementViewDetails.waitLoading();
          trace('AgreementViewDetails.verifyAgreementLinesCount');
          AgreementViewDetails.verifyAgreementLinesCount(1);

          if (index !== configs.length - 1) {
            trace('cy.visit');
            cy.visit(TopMenu.eholdingsPath);
            trace('EHoldingsSearch.waitLoading');
            EHoldingsSearch.waitLoading();
          }
        });

        trace(
          '<--- STEPS 8: Navigate to Agreement and verify agreement lines exist by resource name --->',
        );
        trace('AgreementViewDetails.openAgreementLineFilter');
        AgreementViewDetails.openAgreementLineFilter();
        trace('AgreementLines.waitLoading');
        AgreementLines.waitLoading();
        trace('SearchAndFilterAgreementLines.filterByAgreement');
        SearchAndFilterAgreementLines.filterByAgreement(agreement2Name);

        agreementLinesNames.forEach((resourceName) => {
          trace('AgreementLines.checkAgreementLineFound');
          AgreementLines.checkAgreementLineFound(resourceName);
        });

        trace('<--- STEP 9 --->');
        trace('cy.then');
        cy.then(() => {
          const createdAgreementLineNames = configs.flatMap(({ package: pkg, title }) => [
            pkg,
            title,
          ]);

          trace('cy.intercept: register request alias');
          cy.intercept('GET', '/erm/entitlements*').as('agreementLinesByAgreement');

          flow.get(R.CREATED_AGREEMENTS).forEach(({ id: agreementId }, index) => {
            trace('SearchAndFilterAgreementLines.clearAllFilters');
            SearchAndFilterAgreementLines.clearAllFilters();
            trace('SearchAndFilterAgreementLines.filterByAgreement');
            SearchAndFilterAgreementLines.filterByAgreement(agreement2Name);

            trace('AgreementLines.getViaApi');
            AgreementLines.getViaApi({ filters: `owner==${agreementId}` }).then(
              (agreementLines) => {
                trace('expect: verify assertion');
                expect(agreementLines[0].resourceName).to.eq(createdAgreementLineNames[index]);

                agreementLines.forEach(({ resourceName }) => {
                  trace('AgreementLines.checkAgreementLineFound');
                  AgreementLines.checkAgreementLineFound(resourceName);
                });
              },
            );
          });
        });

        trace('<--- STEP 10-11: Reset all filters and search one by one --->');
        trace('SearchAndFilterAgreementLines.clearAllFilters');
        SearchAndFilterAgreementLines.clearAllFilters();
        trace('SearchAndFilterAgreementLines.filterByTags');
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
          trace('SearchAndFilterAgreementLines.search');
          SearchAndFilterAgreementLines.search(search);
          trace('AgreementLines.checkAgreementLineFound');
          AgreementLines.checkAgreementLineFound(expected);
          trace('AgreementLines.selectRecord');
          AgreementLines.selectRecord(expected);
          trace('AgreementLineInformation.assertResourceName');
          AgreementLineInformation.assertResourceName(expected);
        });
        trace('SearchAndFilterAgreementLines.clearAllFilters');
        SearchAndFilterAgreementLines.clearAllFilters();
        trace('SearchAndFilterAgreementLines.filterByTags');
        SearchAndFilterAgreementLines.filterByTags([isolatingTagName]);
        trace('cy.wait');
        cy.wait(4000);

        trace('<--- STEP 12: Set resourceName to null for both Agreement lines --->');
        trace('cy.get');
        cy.get('@packageEntitlementId1').then((id) => {
          trace('cy.okapiRequest');
          cy.okapiRequest({
            path: `erm/entitlements/${id}`,
            isDefaultSearchParamsRequired: false,
          }).then(({ body }) => {
            trace('cy.okapiRequest');
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

        trace('cy.get');
        cy.get('@titleEntitlementId1').then((id) => {
          trace('cy.okapiRequest');
          cy.okapiRequest({
            path: `erm/entitlements/${id}`,
            isDefaultSearchParamsRequired: false,
          }).then(({ body }) => {
            trace('cy.okapiRequest');
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

        trace('<--- STEP 13: Verify Name/Reference sort column via GET request URL --->');
        trace('cy.intercept: register request alias');
        cy.intercept('GET', '**/erm/entitlements*').as('getEntitlements');

        trace('SearchAndFilterAgreementLines.search');
        SearchAndFilterAgreementLines.search('%');

        trace('verifyAgreementLinesSort');
        verifyAgreementLinesSort('@getEntitlements', 'ascending');

        trace('<--- STEP 14: Click Name/Reference header — sort descending --->');
        trace('AgreementLines.clickResultsHeaderId');
        AgreementLines.clickResultsHeaderId();

        trace('verifyAgreementLinesSort');
        verifyAgreementLinesSort('@getEntitlements', 'descending');

        trace('<--- STEP 15: Click Name/Reference header again — sort ascending --->');
        trace('AgreementLines.clickResultsHeaderId');
        AgreementLines.clickResultsHeaderId();

        trace('verifyAgreementLinesSort');
        verifyAgreementLinesSort('@getEntitlements', 'ascending');

        trace('TEST: complete');
      },
    );
  });
});
