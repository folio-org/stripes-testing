// Tables preferred for query checks: MetaDB first, then LDP Classic. Falls back to the first table returned.
const PREFERRED_TABLES = [
  { tableSchema: 'folio_users', tableName: 'users__t' },
  { tableSchema: 'public', tableName: 'user_users' },
];

const NO_REPORTING_DB_MESSAGE = 'Reporting DB is not configured for this tenant, skipping test';

// Yields a { tableSchema, tableName } pair, or null when no reporting DB is available
const getReportingTable = () => {
  return cy.getLdpTables({ failOnStatusCode: false }).then((response) => {
    if (response.status !== 200 || !Array.isArray(response.body) || !response.body.length) {
      return null;
    }
    const tables = response.body;
    const preferred = PREFERRED_TABLES.find(({ tableSchema, tableName }) => {
      return tables.some((t) => t.tableSchema === tableSchema && t.tableName === tableName);
    });
    return preferred || tables[0];
  });
};

describe('fse-ldp-reporting', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195874 - Get LDP tables ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'reporting', 'ldp', 'TC195874'] },
    () => {
      cy.getLdpTables().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.be.an('array');
        response.body.forEach((table) => {
          cy.expect(table.tableSchema).to.be.a('string');
          cy.expect(table.tableName).to.be.a('string');
        });
      });
    },
  );

  it(
    `TC195875 - Get LDP version ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'reporting', 'ldp', 'TC195875'] },
    () => {
      cy.getLdpDbVersion().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.version).to.be.a('string').and.have.length.greaterThan(0);
        cy.expect(response.body.rawVersion).to.be.a('string').and.have.length.greaterThan(0);
      });
    },
  );

  it(
    `TC195876 - Get LDP config ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'reporting', 'ldp', 'TC195876'] },
    () => {
      cy.getLdpConfig().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.be.an('array');
        response.body.forEach((config) => {
          cy.expect(config).to.have.property('key');
          cy.expect(config).to.have.property('value');
        });
      });
    },
  );

  it(
    `TC195877 - Get LDP processes ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'reporting', 'ldp', 'TC195877'] },
    () => {
      cy.getLdpDbProcesses().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.be.an('array');
      });
    },
  );

  it(
    `TC195878 - Get LDP updates ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'reporting', 'ldp', 'TC195878'] },
    () => {
      cy.getLdpDbUpdates().then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body).to.be.an('array');
        response.body.forEach((update) => {
          cy.expect(update.tableSchema).to.be.a('string');
          cy.expect(update.tableName).to.be.a('string');
          cy.expect(update).to.have.property('lastUpdate');
          cy.expect(update.elapsedRealTime).to.be.a('number');
        });
      });
    },
  );

  it(
    `FDOPS-XXXX - Get columns of a reporting table ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['ldp', 'fse', 'api', 'reporting', 'FDOPS-XXXX'] },
    () => {
      getReportingTable().then((table) => {
        if (!table) {
          cy.log(NO_REPORTING_DB_MESSAGE);
          return;
        }
        cy.getLdpColumns(table.tableSchema, table.tableName).then((response) => {
          cy.expect(response.status).to.eq(200);
          cy.expect(response.body).to.be.an('array').and.have.length.greaterThan(0);
          response.body.forEach((column) => {
            cy.expect(column.columnName).to.be.a('string');
            cy.expect(column.data_type).to.be.a('string');
          });
        });
      });
    },
  );

  it(
    `FDOPS-XXXX - Run read-only query against reporting DB ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['ldp', 'fse', 'api', 'reporting', 'FDOPS-XXXX'] },
    () => {
      getReportingTable().then((table) => {
        if (!table) {
          cy.log(NO_REPORTING_DB_MESSAGE);
          return;
        }
        cy.getLdpColumns(table.tableSchema, table.tableName).then((columnsResponse) => {
          cy.expect(columnsResponse.status).to.eq(200);
          cy.expect(columnsResponse.body).to.be.an('array').and.have.length.greaterThan(0);
          const firstColumn = columnsResponse.body[0].columnName;

          cy.postLdpQuery({
            tables: [
              {
                schema: table.tableSchema,
                tableName: table.tableName,
                columnFilters: [],
                showColumns: [firstColumn],
                orderBy: [],
                limit: 1,
              },
            ],
          }).then((response) => {
            cy.expect(response.status).to.eq(200);
            cy.expect(response.body).to.be.an('array');
            cy.expect(response.body.length).to.be.at.most(1);
            if (response.body.length) {
              cy.expect(response.body[0]).to.have.property(firstColumn);
            }
          });
        });
      });
    },
  );

  it(
    `FDOPS-XXXX - Reporting app settings are readable ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['ldp', 'fse', 'api', 'reporting', 'FDOPS-XXXX'] },
    () => {
      cy.getSettingsEntriesByScope('ui-ldp.admin').then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.items).to.be.an('array');
        // only keys are logged, values may contain credentials
        const keys = response.body.items.map((item) => item.key);
        ['dbinfo', 'tqrepos'].forEach((key) => {
          cy.log(`ui-ldp.admin "${key}" setting is ${keys.includes(key) ? '' : 'not '}configured`);
        });
      });
    },
  );
});
