/* eslint-disable dot-notation */
import { validate } from 'jsonschema';
import holdingsSchema from '../../../../../jsonSchemas/holdingsSchema';
import instancesSchema from '../../../../../jsonSchemas/instancesSchema';
import { Lists } from '../../../../../support/fragments/lists/lists';
import { parseSanityParameters } from '../../../../../support/utils/users';

describe('Lists', () => {
  describe('Query Builder API', () => {
    const { user, memberTenant } = parseSanityParameters();
    let version;
    let recordTypeId;
    before('Get version', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false });
      Lists.getVersionApi().then((vrs) => {
        version = vrs;
      });
    });

    const validateResponse = (fullFqlQuery, schema) => {
      fullFqlQuery._version = version;
      const query = {
        entityTypeId: recordTypeId,
        fqlQuery: JSON.stringify(fullFqlQuery),
      };
      return cy.wrap(query).then(() => {
        Lists.createQueryViaApi(query).then((createdQuery) => {
          Lists.getQueryViaApi(createdQuery.queryId, {
            includeResults: true,
            offset: 0,
            limit: 20,
          }).then((queryResponse) => {
            expect(queryResponse.status).to.eq(200);
            const result = validate(queryResponse.body, schema, { base: 'http://example.com/' });
            cy.wrap(result).then(() => {
              expect(result.valid, result.errors.toString()).to.be.equal(true);

              return queryResponse.body;
            });
          });
        });
      });
    };

    describe('Holdings', () => {
      before('Create test user', () => {
        Lists.getEntityTypeIdByNameViaApi('Holdings')
          .then((typeId) => {
            recordTypeId = typeId;
          });
      });

      it('C446063 Search holdings in the Query Builder using "Holdings suppress from discovery" field (corsair)',
        { tags: ['dryRun', 'corsair', 'C446063'] },
        () => {
          const fqlQuery = { 'holdings.discovery_suppress': { $eq: 'true' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, holdingsSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['holdings.discovery_suppress']).to.be.equal('true');
              });
            });
          });
        });
    });

    describe('Instances', () => {
      before('Create test user', () => {
        Lists.getEntityTypeIdByNameViaApi('Instances')
          .then((typeId) => {
            recordTypeId = typeId;
          });
      });

      it(
        'C446020 Search instances in the Query Builder using "Instance — Suppress from discovery" field (corsair)',
        { tags: ['dryRun', 'corsair', 'C446020'] },
        () => {
          const fqlQuery = { 'instance.discovery_suppress': { $eq: 'true' } };

          cy.wrap(true).then(() => {
            validateResponse(fqlQuery, instancesSchema).then((body) => {
              body.content.forEach((item) => {
                expect(item['instance.discovery_suppress']).to.be.equal('true');
              });
            });
          });
        },
      );
    });
  });
});
