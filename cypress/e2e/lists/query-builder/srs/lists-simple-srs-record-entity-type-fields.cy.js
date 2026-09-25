import Permissions from '../../../../support/dictionary/permissions';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('SRS', () => {
    const simpleSrsRecordEntityTypeId = 'd5449a05-fd57-45e5-9383-ea615246f6f9';
    const expectedFields = [
      {
        labelAlias: 'Created date',
        queryable: false,
        visibleByDefault: false,
        hidden: false,
        essential: false,
      },
      {
        labelAlias: 'External HRID',
        queryable: true,
        visibleByDefault: true,
        hidden: false,
        essential: true,
      },
      {
        labelAlias: 'Generation',
        queryable: true,
        visibleByDefault: false,
        hidden: false,
        essential: true,
      },
      {
        labelAlias: 'Leader record status',
        queryable: true,
        visibleByDefault: false,
        hidden: false,
        essential: true,
      },
      {
        labelAlias: 'MARC jsonb',
        queryable: false,
        visibleByDefault: false,
        hidden: false,
        essential: true,
      },
      {
        labelAlias: 'Matched UUID',
        queryable: true,
        visibleByDefault: false,
        hidden: false,
        essential: true,
      },
      {
        labelAlias: 'Order',
        queryable: true,
        visibleByDefault: false,
        hidden: false,
        essential: true,
      },
      {
        labelAlias: 'Record type',
        queryable: true,
        visibleByDefault: true,
        hidden: false,
        essential: false,
      },
      {
        labelAlias: 'Snapshot UUID',
        queryable: true,
        visibleByDefault: false,
        hidden: false,
        essential: false,
      },
      {
        labelAlias: 'State',
        queryable: true,
        visibleByDefault: true,
        hidden: false,
        essential: true,
      },
      {
        labelAlias: 'Suppress from discovery',
        queryable: true,
        visibleByDefault: true,
        hidden: false,
        essential: null,
      },
      {
        labelAlias: 'Updated date',
        queryable: false,
        visibleByDefault: false,
        hidden: false,
        essential: false,
      },
    ];
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.sourceStorageRecordsCollectionGet.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C788720 Verify that the fields/properties are defined correctly in the entity type Simple SRS record (athena)',
      { tags: ['extendedPath', 'athena', 'C788720'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Send GET {Base_URL}/entity-types?includeAll=true
        Lists.getAllEntityTypesIncludeAllViaApi().then((response) => {
          expect(response.status).to.equal(200);

          // #2 Search for the entity type "Simple SRS record"
          const simpleSrsRecord = response.body.entityTypes.find(
            (et) => et.id === simpleSrsRecordEntityTypeId,
          );
          expect(simpleSrsRecord.label).to.equal('Simple SRS record');
          expect(simpleSrsRecord.crossTenantQueriesEnabled).to.equal(false);
          expect(simpleSrsRecord.missingPermissions).to.be.equal(null);

          // #3 GET entity-types/{id}?includeAll=true and verify fields
          Lists.getEntityTypeByIdIncludeAllViaApi(simpleSrsRecordEntityTypeId).then(
            (detailResponse) => {
              expect(detailResponse.status).to.equal(200);

              const { columns } = detailResponse.body;

              expectedFields.forEach(
                ({ labelAlias, queryable, visibleByDefault, hidden, essential }) => {
                  const field = columns.find((col) => col.labelAlias === labelAlias);
                  expect(field.queryable, `${labelAlias} queryable`).to.equal(queryable);
                  expect(field.visibleByDefault, `${labelAlias} visibleByDefault`).to.equal(
                    visibleByDefault,
                  );
                  expect(field.hidden, `${labelAlias} hidden`).to.equal(hidden);
                  expect(field.essential, `${labelAlias} essential`).to.equal(essential);
                },
              );
            },
          );
        });
      },
    );
  });
});
