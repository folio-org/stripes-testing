import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

// New capabilities added in Trillium R1 2026
// Reference: https://folio-org.atlassian.net/wiki/spaces/REL/pages/939492425/Trillium+R1+2026+Capability+Updates
const TRILLIUM_R1_CAPABILITIES = [
  // app-fqm: CRUD endpoints for custom entity types (MODFQMMGR-632)
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Fqm EntityTypes Custom Collection',
    action: CAPABILITY_ACTIONS.CREATE,
    app: 'app-fqm',
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Fqm EntityTypes Custom Item',
    action: CAPABILITY_ACTIONS.VIEW,
    app: 'app-fqm',
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Fqm EntityTypes Custom Item',
    action: CAPABILITY_ACTIONS.EDIT,
    app: 'app-fqm',
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Fqm EntityTypes Custom Item',
    action: CAPABILITY_ACTIONS.DELETE,
    app: 'app-fqm',
  },
  // app-fqm: retrieve available joins for custom entity type (MODFQMMGR-608)
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Fqm EntityTypes Custom Available-Joins Collection',
    action: CAPABILITY_ACTIONS.CREATE,
    app: 'app-fqm',
  },
  // app-fqm: update usedBy field (MODFQMMGR-958)
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Fqm EntityTypes Used-By Item',
    action: CAPABILITY_ACTIONS.EDIT,
    app: 'app-fqm',
  },
  // app-fqm: monitor query statuses (MODFQMMGR-983)
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Fqm Status Item',
    action: CAPABILITY_ACTIONS.VIEW,
    app: 'app-fqm',
  },
  // app-fqm: install all available entity types (MODFQMMGR-977)
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Fqm EntityTypes Install',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-fqm',
  },
  // app-agreements: separate housekeeping/admin tasks (ERM-3919)
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action LoadPackage',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action TriggerCacheUpdate',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action TriggerSync',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action PullPackage',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action TriggerActivationUpdate',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action TriggerHousekeeping',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action TriggerEntitlementLogUpdate',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action TriggerDocMigration',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Erm Admin Action All',
    action: CAPABILITY_ACTIONS.EXECUTE,
    app: 'app-agreements',
  },
  // app-agreements: delete package content via UI (ERM-3743)
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Agreements Resources',
    action: CAPABILITY_ACTIONS.DELETE,
    app: 'app-agreements',
  },
  // app-serials-management: publication pattern templates (UISER-232, UXPROD-5576)
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Serials-Management Modelrulesets',
    action: CAPABILITY_ACTIONS.VIEW,
    app: 'app-serials-management',
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Serials-Management Modelrulesets',
    action: CAPABILITY_ACTIONS.MANAGE,
    app: 'app-serials-management',
  },
  // ui-users: number generator options in settings (app-platform-complete)
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Users Settings Number-Generator-Options',
    action: CAPABILITY_ACTIONS.MANAGE,
    app: 'ui-users',
  },
];

let allCapabilities;

describe('fse-capabilities', { retries: { runMode: 1 } }, () => {
  before(() => {
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getCapabilitiesApi(5000, true).then((capabilities) => {
      allCapabilities = capabilities;
    });
    cy.allure().logCommandSteps();
  });

  TRILLIUM_R1_CAPABILITIES.forEach(({ type, resource, action, app }) => {
    it(
      `Check that "${type}: ${resource} - ${action}" capability (${app}) is present for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
      {
        tags: [
          'FDOPS-6019',
          'fse',
          'sanity',
          'api',
          'capabilities',
          'trillium',
          app,
          `${Cypress.env('OKAPI_TENANT')}`,
        ],
      },
      () => {
        const found = allCapabilities.filter(
          (cap) => cap.type?.toLowerCase() === type.toLowerCase() &&
            cap.resource === resource &&
            cap.action?.toLowerCase() === action.toLowerCase(),
        );
        cy.expect(
          found.length,
          `Capability "${type}: ${resource} - ${action}" should be present in the system`,
        ).to.eq(1);
      },
    );
  });
});
