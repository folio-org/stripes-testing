import Permissions from '../../../../support/dictionary/permissions';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Lists', () => {
  describe('SRS', () => {
    const srsBibEntityTypeId = 'c47c6e6c-a897-4dd4-938c-ad5fea981a19';
    const expectedFields = [
      { labelAlias: 'SRS record — Created by user UUID', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — Created date', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — External HRID', queryable: true, visibleByDefault: true, hidden: false, essential: true },
      { labelAlias: 'SRS record — External UUID', queryable: true, visibleByDefault: true, hidden: false, essential: true },
      { labelAlias: 'SRS record — Generation', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — Leader record status', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — MARC jsonb', queryable: false, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — Matched UUID', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — Order', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — Record type', queryable: true, visibleByDefault: true, hidden: false, essential: true },
      { labelAlias: 'SRS record — Snapshot UUID', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — State', queryable: true, visibleByDefault: true, hidden: false, essential: true },
      { labelAlias: 'SRS record — Suppress from discovery', queryable: true, visibleByDefault: true, hidden: false, essential: true },
      { labelAlias: 'SRS record — Updated by user UUID..', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — Updated date', queryable: true, visibleByDefault: false, hidden: false, essential: true },
      { labelAlias: 'SRS record — UUID..', queryable: true, visibleByDefault: true, hidden: false, essential: true },
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
      'C788721 Verify that the fields/properties are defined correctly in the entity type SRS Bib (athena)',
      { tags: ['criticalPath', 'athena', 'C788721'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // #1 Send GET {Base_URL}/entity-types?includeAll=true
        Lists.getAllEntityTypesIncludeAllViaApi().then((response) => {
          expect(response.status).to.equal(200);

          // #2 Search for the entity type "SRS Bib"
          const srsBib = response.body.entityTypes.find(
            (et) => et.id === srsBibEntityTypeId,
          );
          expect(srsBib.label).to.equal('SRS Bib');
          expect(srsBib.crossTenantQueriesEnabled).to.equal(false);
          expect(srsBib.missingPermissions).to.be.equal(null);

          // #3 GET entity-types/{id}?includeAll=true and verify fields
          Lists.getEntityTypeByIdIncludeAllViaApi(srsBibEntityTypeId).then(
            (detailResponse) => {
              expect(detailResponse.status).to.equal(200);

              const { columns } = detailResponse.body;

              expectedFields.forEach(({ labelAlias, queryable, visibleByDefault, hidden, essential }) => {
                const field = columns.find((col) => col.labelAlias === labelAlias);
                expect(field.queryable, `${labelAlias} queryable`).to.equal(queryable);
                expect(field.visibleByDefault, `${labelAlias} visibleByDefault`).to.equal(visibleByDefault);
                expect(field.hidden, `${labelAlias} hidden`).to.equal(hidden);
                expect(field.essential, `${labelAlias} essential`).to.equal(essential);
              });
            },
          );
        });
      },
    );
  });
});
