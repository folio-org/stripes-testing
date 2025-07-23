/* eslint-disable no-unused-expressions */
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';

describe('MARC Bibliographic Validation Rules - Cannot Create Local Field with Invalid Tag Length API', () => {
  // User with both GET and POST permissions to create fields (but validation should prevent invalid requests)
  const requiredPermissions = [
    Permissions.specificationStorageGetSpecificationFields.gui,
    Permissions.specificationStorageCreateSpecificationField.gui,
  ];

  let user;
  let bibSpecId;

  const baseFieldPayload = {
    label: 'AT_C490922_Custom Field - Contributor Data',
    url: 'http://www.example.org/field100.html',
  };

  before('Create user and fetch MARC bib specification', () => {
    cy.getAdminToken();
    cy.createTempUser(requiredPermissions).then((createdUser) => {
      user = createdUser;
      cy.getSpecificatoinIds().then((specs) => {
        const bibSpec = specs.find((s) => s.profile === 'bibliographic');
        expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
        bibSpecId = bibSpec.id;
      });
    });
  });

  after('Delete test user', () => {
    if (user) {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    }
  });

  it(
    'C490922 Cannot create Local Field with invalid "tag" length for MARC bib spec (API) (spitfire)',
    { tags: ['C490922', 'extendedPath', 'spitfire'] },
    () => {
      // Ensure token is set for the user before API calls
      cy.getUserToken(user.username, user.password);

      // Step 1: Test with tag that is too short (1 character)
      const payloadWithShortTag = {
        ...baseFieldPayload,
        tag: '1',
      };

      cy.createSpecificationField(bibSpecId, payloadWithShortTag, false).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.errors).to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);

        // Check for the specific error message about tag format
        const errorMessages = response.body.errors.map((error) => error.message);
        expect(
          errorMessages.some((msg) => msg.includes(
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          )),
        ).to.be.true;
      });

      // Step 2: Test with tag that is too short (2 characters)
      const payloadWithTwoCharTag = {
        ...baseFieldPayload,
        tag: '91',
      };

      cy.createSpecificationField(bibSpecId, payloadWithTwoCharTag, false).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.errors).to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);

        // Check for the specific error message about tag format
        const errorMessages = response.body.errors.map((error) => error.message);
        expect(
          errorMessages.some((msg) => msg.includes(
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          )),
        ).to.be.true;
      });

      // Step 3: Test with tag that is too long (4 characters)
      const payloadWithLongTag = {
        ...baseFieldPayload,
        tag: '9132',
      };

      cy.createSpecificationField(bibSpecId, payloadWithLongTag, false).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.errors).to.exist;
        expect(response.body.errors).to.have.length.greaterThan(0);

        // Check for the specific error message about tag format
        const errorMessages = response.body.errors.map((error) => error.message);
        expect(
          errorMessages.some((msg) => msg.includes(
            "A 'tag' field must contain three characters and can only accept numbers 0-9",
          )),
        ).to.be.true;
      });
    },
  );
});
