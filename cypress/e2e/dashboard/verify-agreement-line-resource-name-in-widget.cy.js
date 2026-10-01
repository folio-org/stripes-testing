import uuid from 'uuid';

import Agreements from '../../support/fragments/agreements/agreements';
import AgreementLines from '../../support/fragments/agreements/agreementLines';
import Dashboard from '../../support/fragments/dashboard/dashboard';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { ExecutionFlowManager } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import {
  APPLICATION_NAMES,
  DASHBOARD_WIDGET_DEFINITION_LABELS,
  DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_LABELS,
  DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_VALUES,
  DASHBOARD_WIDGET_SORT_DIRECTION_LABELS,
} from '../../support/constants';
import NewWidget from '../../support/fragments/dashboard/newWidget';
import AgreementLineInformation from '../../support/fragments/agreements/agreementLineInformation';
import EditWidget from '../../support/fragments/dashboard/editWidget';

const R = {
  AGREEMENT: 'agreement',
  DASHBOARD: 'dashboard',
  DEFINITION: 'simpleSearch',
  LINES: 'lines',
  TAG: 'isolatingTag,',
};

const AGREEMENT_LINE_RESOURCE_NAME = 'agreementLineResourceName';
const RESOURCE_REFERENCE = 'resourceReference';
const TAGS = 'tags';

describe('Dashboard', () => {
  const flow = new ExecutionFlowManager();

  const prefix = `AT_C1348672_[r-${getRandomPostfix()}]`;
  const postfix = getRandomPostfix();
  const widgetName = `${prefix}_Widget_${postfix}`;
  const secondWidgetName = `${prefix}_Widget_2_${postfix}`;
  const isolatingTagName = `ISOLATING_TAG_${postfix}`;
  const resources = [
    {
      authority: 'EKB-PACKAGE',
      name: `${prefix}_Package_1_${postfix}`,
      reference: uuid(),
    },
    {
      authority: 'EKB-PACKAGE',
      name: `${prefix}_Package_2_${postfix}`,
      reference: uuid(),
    },
    {
      authority: 'EKB-TITLE',
      name: `${prefix}_Title_1_${postfix}`,
      reference: uuid(),
    },
    {
      authority: 'EKB-TITLE',
      name: `${prefix}_Title_2_${postfix}`,
      reference: uuid(),
    },
  ];

  before('Create C1348672 preconditions', () => {
    cy.getAdminToken();
    AgreementLines.interceptGetEntitlements();

    flow
      .step((currentFlow) => {
        return cy.createTagApi({ label: isolatingTagName }).then((id) => {
          return currentFlow.set(R.TAG, { id, label: isolatingTagName }, () => cy.deleteTagApi(id, true));
        });
      })
      .step((currentFlow) => {
        return Agreements.createViaApi({
          ...Agreements.defaultAgreement,
          name: `AT_C1348672_Agreement_${postfix}`,
          tags: [{ value: isolatingTagName }],
        }).then((agreement) => currentFlow.set(R.AGREEMENT, agreement, () => Agreements.deleteViaApi(agreement.id)));
      })
      .step((currentFlow) => {
        const lines = [];
        const agreementId = currentFlow.get(R.AGREEMENT).id;

        return cy
          .wrap(resources)
          .each((resource) => {
            return AgreementLines.createViaApi({
              id: uuid(),
              type: 'external',
              owner: agreementId,
              authority: resource.authority,
              reference: resource.reference,
              resourceName: resource.name,
              description: `${resource.name} description`,
              tags: [{ value: isolatingTagName }],
            }).then((line) => lines.push(line));
          })
          .then(() => {
            return currentFlow.set(R.LINES, lines, () => cy
              .wrap(lines)
              .each((line) => AgreementLines.deleteViaApi({ agreementId, agreementLineId: line.id })));
          });
      })
      .step((currentFlow) => {
        return Dashboard.getServiceInteractionWidgetsViaApi().then((definitions) => currentFlow.set(
          R.DEFINITION,
          definitions.find(
            ({ name }) => name === DASHBOARD_WIDGET_DEFINITION_LABELS.ERM_AGREEMENT_LINES,
          ),
        ));
      })
      .step((currentFlow) => {
        cy.intercept('POST', '/servint/widgets/instances**', (req) => {
          req.on('after:response', (res) => {
            const widget = res.body;

            if (widget) {
              currentFlow.set(widget.name, widget, () => Dashboard.deleteWidgetViaApi(widget.id));
            }
          });
        });
      })
      .step((currentFlow) => {
        return cy
          .createTempUser([
            Permissions.uiAgreementsSearchAndView.gui,
            Permissions.uiDashboardManage.gui,
          ])
          .then((user) => {
            currentFlow.set(R.USER, user, () => Users.deleteViaApi(user.userId));

            cy.login(user.username, user.password, {
              path: TopMenu.dashboardPath,
              waiter: Dashboard.waitLoading,
            });
          });
      });
  });

  after('Delete C1348672 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  const waitDashboardLoading = () => {
    Dashboard.waitLoading();
    AgreementLines.waitForGetEntitlements();
  };

  it(
    'C1348672 Verify search and filter by Agreement line resource name in a dashboard widget (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1348672'] },
    () => {
      const { agreement, simpleSearch } = flow.ctx();

      const agreementLineResourceNameRDC = simpleSearch.definition.results.columns.find(
        ({ name }) => name === AGREEMENT_LINE_RESOURCE_NAME,
      );
      const agreementLineResourceNameFBC = simpleSearch.definition.filters.columns.find(
        ({ name }) => name === AGREEMENT_LINE_RESOURCE_NAME,
      );
      const agreementLineResourceNameSBC = simpleSearch.definition.sort.columns.find(
        ({ name }) => name === AGREEMENT_LINE_RESOURCE_NAME,
      );
      const resourceReferenceRDC = simpleSearch.definition.results.columns.find(
        ({ name }) => name === RESOURCE_REFERENCE,
      );
      const tagsFBC = simpleSearch.definition.filters.columns.find(({ name }) => name === TAGS);

      cy.log('<--- STEP 1: Open New widget and select ERM Agreement lines --->');
      Dashboard.openNewWidget();
      NewWidget.fillWidgetName(widgetName);
      NewWidget.selectWidgetDefinition(DASHBOARD_WIDGET_DEFINITION_LABELS.ERM_AGREEMENT_LINES);
      NewWidget.assertWidgetDefaults({
        name: widgetName,
        configuration: simpleSearch.definition,
      });

      cy.log('<--- STEP 2: Save the widget and verify resource-name search results --->');
      NewWidget.fillSearchTermField(resources[0].name);
      NewWidget.assertSearchTerm(resources[0].name);
      NewWidget.selectResultsDisplayColumn(agreementLineResourceNameRDC.label);
      NewWidget.assertResultsColumnsMappings([[agreementLineResourceNameRDC.label]]);

      /* Isolate current test data */
      NewWidget.addFilter();
      NewWidget.selectFilterColumn(tagsFBC.label);
      NewWidget.fillFilterTextValue(isolatingTagName);
      /*  */

      NewWidget.saveWidget();
      waitDashboardLoading();
      Dashboard.assertWidgets([widgetName]);
      Dashboard.assertWidgetTable(
        widgetName,
        [
          [
            {
              column: agreementLineResourceNameRDC.label,
              content: resources[0].name,
            },
          ],
        ],
        { assertRowCount: true },
      );

      cy.log('<--- STEP 3: Open the external Agreement line from the widget --->');
      Dashboard.clickCellInWidgetTable(widgetName, {
        column: agreementLineResourceNameRDC.label,
        content: resources[0].name,
      });
      AgreementLineInformation.waitLoadingWithExistingLine(agreement.name);
      AgreementLineInformation.assertResourceName(resources[0].name);

      cy.log('<--- STEP 4: Return to Dashboard and edit the widget --->');
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DASHBOARD);
      Dashboard.waitLoading();
      AgreementLines.waitForGetEntitlements();
      Dashboard.openEditWidget(widgetName);

      EditWidget.assertWidgetFields(
        {
          name: widgetName,
          definition: { name: simpleSearch.name },
          configuration: {
            configurableProperties: {
              urlLink: simpleSearch.definition.configurableProperties.urlLink.defValue,
            },
            matches: {
              term: resources[0].name,
              matches: Object.fromEntries(
                simpleSearch.definition.matches.columns.map((c) => [c.name, c.default]),
              ),
            },
            resultColumns: [agreementLineResourceNameRDC],
          },
        },
        simpleSearch.definition,
      );

      cy.log('<--- STEP 5: Filter matching resources and sort resource names descending --->');
      EditWidget.clearSearchTermField();
      EditWidget.addFilter();
      EditWidget.selectFilterColumn(agreementLineResourceNameFBC.label, { index: 1 });
      EditWidget.selectFilterComparator(DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_LABELS.CONTAINS, {
        index: 1,
      });
      EditWidget.fillFilterTextValue(prefix, { index: 1 });
      EditWidget.selectSortBy(agreementLineResourceNameSBC.label);
      EditWidget.selectSortDirection(DASHBOARD_WIDGET_SORT_DIRECTION_LABELS.DESC);
      EditWidget.saveWidget();
      waitDashboardLoading();
      Dashboard.assertWidgets([widgetName]);
      Dashboard.assertWidgetTable(
        widgetName,
        resources
          .toSorted((a, b) => b.name.localeCompare(a.name))
          .map(({ name }, index) => [
            {
              column: agreementLineResourceNameRDC.label,
              content: name,
              index,
            },
          ]),
        { assertRowCount: true },
      );

      cy.log('<--- STEP 6: Reopen the configured widget --->');
      Dashboard.openEditWidget(widgetName);
      EditWidget.assertWidgetFields(
        {
          name: widgetName,
          definition: { name: simpleSearch.name },
          configuration: {
            filterColumns: [
              {
                fieldType: tagsFBC.valueType,
                name: tagsFBC.name,
                rules: [
                  {
                    comparator: DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_VALUES.IS,
                    filterValue: isolatingTagName,
                  },
                ],
              },
              {
                fieldType: agreementLineResourceNameFBC.valueType,
                name: agreementLineResourceNameFBC.name,
                rules: [
                  {
                    comparator: DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_VALUES.CONTAINS,
                    filterValue: prefix,
                  },
                ],
              },
            ],
            sortColumn: {
              name: agreementLineResourceNameSBC.name,
              sortType: DASHBOARD_WIDGET_SORT_DIRECTION_LABELS.DESC,
            },
          },
        },
        simpleSearch.definition,
      );

      cy.log('<--- STEP 7: Add an exclusion filter and sort ascending --->');
      EditWidget.selectFilterComparator(DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_LABELS.IS_NOT, {
        index: 1,
      });
      EditWidget.fillFilterTextValue(resources[0].name, { index: 1 });

      EditWidget.selectSortDirection(DASHBOARD_WIDGET_SORT_DIRECTION_LABELS.ASC);

      cy.log('<--- STEP 8: Add Resource reference and verify the remaining resources --->');
      EditWidget.addColumn();
      EditWidget.selectResultsDisplayColumn(resourceReferenceRDC.label, { index: 1 });
      EditWidget.saveWidget();
      waitDashboardLoading();
      Dashboard.assertWidgets([widgetName]);
      Dashboard.assertWidgetTable(
        widgetName,
        resources
          .slice(1)
          .toSorted((a, b) => a.name.localeCompare(b.name))
          .map(({ name, reference }, index) => {
            return [
              {
                column: agreementLineResourceNameRDC.label,
                content: name,
                index,
              },
              {
                column: resourceReferenceRDC.label,
                content: reference,
                index,
              },
            ];
          }),
        { assertRowCount: true },
      );

      cy.log('<--- STEP 9: Create a second ERM Agreement lines widget --->');
      Dashboard.openNewWidget();
      NewWidget.fillWidgetName(secondWidgetName);
      NewWidget.selectWidgetDefinition(DASHBOARD_WIDGET_DEFINITION_LABELS.ERM_AGREEMENT_LINES);
      NewWidget.assertWidgetDefaults({
        name: secondWidgetName,
        configuration: simpleSearch.definition,
      });

      /* Isolate current test data */
      NewWidget.addFilter();
      NewWidget.selectFilterColumn(tagsFBC.label);
      NewWidget.fillFilterTextValue(isolatingTagName);
      /*  */

      // cy.log('<--- STEP 10: Filter the second widget by an exact resource name --->');
      NewWidget.addFilter();
      NewWidget.selectFilterColumn(agreementLineResourceNameFBC.label, { index: 1 });
      NewWidget.selectFilterComparator(DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_LABELS.IS, {
        index: 1,
      });
      NewWidget.fillFilterTextValue(resources[2].name, { index: 1 });
      NewWidget.selectSortBy(agreementLineResourceNameSBC.label);
      NewWidget.selectSortDirection(DASHBOARD_WIDGET_SORT_DIRECTION_LABELS.DESC);
      NewWidget.selectResultsDisplayColumn(agreementLineResourceNameRDC.label);
      NewWidget.saveWidget();
      waitDashboardLoading();
      Dashboard.assertWidgets([widgetName, secondWidgetName]);
      Dashboard.assertWidgetTable(
        secondWidgetName,
        [
          [
            {
              column: agreementLineResourceNameRDC.label,
              content: resources[2].name,
            },
          ],
        ],
        { assertRowCount: true },
      );

      // cy.log('<--- STEP 11: Edit the second widget --->');
      Dashboard.openEditWidget(secondWidgetName);
      EditWidget.assertWidgetFields(
        {
          name: secondWidgetName,
          definition: { name: simpleSearch.name },
          configuration: {
            filterColumns: [
              {
                fieldType: tagsFBC.valueType,
                name: tagsFBC.name,
                rules: [
                  {
                    comparator: DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_VALUES.IS,
                    filterValue: isolatingTagName,
                  },
                ],
              },
              {
                fieldType: agreementLineResourceNameFBC.valueType,
                name: agreementLineResourceNameFBC.name,
                rules: [
                  {
                    comparator: DASHBOARD_WIDGET_FILTER_RULE_COMPARATOR_VALUES.IS,
                    filterValue: resources[2].name,
                  },
                ],
              },
            ],
            sortColumn: {
              name: agreementLineResourceNameSBC.name,
              sortType: DASHBOARD_WIDGET_SORT_DIRECTION_LABELS.DESC,
            },
          },
        },
        simpleSearch.definition,
      );

      // cy.log('<--- STEP 12: Replace the filter with a resource-name-only search --->');
      EditWidget.removeFilter({ index: 1 });
      simpleSearch.definition.matches.columns
        .filter(({ name }) => name !== AGREEMENT_LINE_RESOURCE_NAME)
        .forEach(({ name }) => {
          cy.get(`[name="matches.matches[${name}]"]`).should('be.checked').click();
        });
      EditWidget.clearSearchTermField();
      EditWidget.fillSearchTermField(resources[1].name);
      EditWidget.saveWidget();
      waitDashboardLoading();
      Dashboard.assertWidgets([widgetName, secondWidgetName]);
      Dashboard.assertWidgetTable(
        secondWidgetName,
        [
          [
            {
              column: agreementLineResourceNameRDC.label,
              content: resources[1].name,
            },
          ],
        ],
        { assertRowCount: true },
      );
    },
  );
});
